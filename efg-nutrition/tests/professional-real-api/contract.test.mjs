// Pure offline checks only. Docker, SQL, HTTP, Auth and browsers are NOT run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkRuntimeEnv, parseLocalStatus, validateDockerEvidence, assetOrigin, safeSqlState, MODEL} from './local-runtime.mjs';
import {createLifecycle, commandPlan} from './lifecycle.mjs';
import {snapshotFromSql} from './backend.mjs';

const env = {GITHUB_ACTIONS: 'true', NCC_REAL_BROWSER_API: '1',
  GITHUB_REPOSITORY: 'floresgrancelli/Edu-Flores-Grancelli-lab', GITHUB_SHA: 'a'.repeat(40),
  GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', RUNNER_TEMP: '/tmp/runner',
  NCC_REAL_STACK_ID: 'ncc-professional-real-123-1', NCC_REAL_STACK_NETWORK: 'ncc-professional-real-123-1-network',
  NCC_REAL_STACK_DIR: '/tmp/runner/ncc-professional-real-123-1',
  EFG_LOCAL_STATUS_ENV: '/tmp/runner/ncc-professional-real-123-1-status.env'};
const owner = checkRuntimeEnv(env, 'linux');
// Explicitly invalid cryptographic signatures, used only to test parsing.
const key = (role, extra = {}) => [Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url'),
  Buffer.from(JSON.stringify({iss: 'supabase', role, ...extra})).toString('base64url'), 'not-a-signature'].join('.');
const status = (extra = {}) => Object.entries({API_URL: 'http://127.0.0.1:54321',
  DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  ANON_KEY: key('anon'), SERVICE_ROLE_KEY: key('service_role'), ...extra}).map(([k, v]) => `${k}="${v}"`).join('\n');
const fails = (fn, code) => assert.throws(fn, e => e.code === code);

test('CI gate rejects non-CI, hosted overrides, foreign owner and non-owned paths', () => {
  assert.equal(owner.projectId, env.NCC_REAL_STACK_ID);
  for (const change of [{GITHUB_ACTIONS: 'false'}, {NCC_REAL_BROWSER_API: '0'}, {GITHUB_REPOSITORY: 'elsewhere/repo'},
    {SUPABASE_ACCESS_TOKEN: 'not-a-real-token'}, {PGOPTIONS: 'unsafe'}, {NODE_OPTIONS: '--inspect'},
    {NCC_REAL_STACK_ID: 'another-stack'}, {NCC_REAL_STACK_DIR: '/tmp/not-owned'}]) assert.throws(() => checkRuntimeEnv({...env, ...change}, 'linux'));
  assert.throws(() => checkRuntimeEnv(env, 'darwin'));
});
test('status permits historical/local claims only and never exposes DB/signing secrets', () => {
  const parsed = parseLocalStatus(status({JWT_SECRET: 'discard-this-local-field'}));
  assert.deepEqual(Object.keys(parsed).sort(), ['adminKey', 'anonKey', 'origin']);
  assert.equal(parsed.origin, 'http://127.0.0.1:54321');
  parseLocalStatus(status({ANON_KEY: key('anon', {ref: 'supabase-demo'})}));
  for (const extra of [{API_URL: 'https://demo.supabase.co'}, {DB_URL: 'postgresql://postgres:postgres@elsewhere:54322/postgres'},
    {ANON_KEY: key('service_role')}, {SERVICE_ROLE_KEY: key('service_role', {ref: 'hosted-ref'})}]) assert.throws(() => parseLocalStatus(status(extra)));
  fails(() => parseLocalStatus(status() + '\nAPI_URL="http://127.0.0.1:54321"'), 'REAL_STACK_STATUS_REJECTED');
});
function dockerFixture() {
  return {containers: ['db', 'auth', 'rest', 'kong'].map(service => ({name: `/supabase_${service}_${owner.projectId}`,
    project: owner.projectId, image: `public.ecr.aws/supabase/${service}:test-version`, running: true, networks: [owner.network],
    ports: service === 'db' ? {'5432/tcp': [{HostIp: '127.0.0.1', HostPort: '54322'}]} :
      service === 'kong' ? {'8000/tcp': [{HostIp: '127.0.0.1', HostPort: '54321'}]} : {}})),
  network: {name: owner.network, labels: {'ncc.synthetic.run': owner.runId, 'ncc.synthetic.attempt': owner.attempt},
    options: {'com.docker.network.bridge.host_binding_ipv4': '127.0.0.1'}}};
}
test('binding evidence fails closed on wildcard, IPv6 wildcard, foreign labels and other networks', () => {
  const good = dockerFixture();assert.equal(validateDockerEvidence(good.containers, good.network, owner).containersLoopbackOnly, true);
  for (const host of ['0.0.0.0', '::', '']) {const x = dockerFixture();x.containers[0].ports['5432/tcp'][0].HostIp = host;
    fails(() => validateDockerEvidence(x.containers, x.network, owner), 'REAL_STACK_NON_LOOPBACK_BINDING');}
  const wrong = dockerFixture();wrong.containers[1].project = 'other';assert.throws(() => validateDockerEvidence(wrong.containers, wrong.network, owner));
  const extra = dockerFixture();extra.containers[1].networks.push('bridge');assert.throws(() => validateDockerEvidence(extra.containers, extra.network, owner));
});
test('asset origin and lifecycle plan do not permit public listeners or existing-network edits', () => {
  assert.equal(assetOrigin('http://127.0.0.1:43123'), 'http://127.0.0.1:43123');
  for (const value of ['https://example.invalid', 'http://127.0.0.1:54321', 'http://127.0.0.1:43123/path']) assert.throws(() => assetOrigin(value));
  const plan = commandPlan(owner);
  assert.ok(plan.createNetwork[1].includes('com.docker.network.bridge.host_binding_ipv4=127.0.0.1'));
  assert.deepEqual(plan.start, ['supabase', ['start', '--network-id', owner.network]]);
  assert.deepEqual(plan.stop, ['supabase', ['stop', '--no-backup']]);
});
function mockedLifecycle({failStart = false, foreignNetwork = false, residualVolume = false} = {}) {
  const files = new Map(), calls = [], writes = [];
  let network = false, containers = false, volumes = false, validated = false;
  const fs = {
    existsSync: p => files.has(p), realpathSync: p => p,
    mkdirSync: p => {assert.equal(p, owner.stackDir);files.set(p, 'directory');},
    writeFileSync: (p, value, options) => {assert.equal(options.mode, 0o600);assert.equal(options.flag, 'wx');assert.ok(!files.has(p));files.set(p, value);writes.push(p);},
    readFileSync: p => {assert.ok(files.has(p), 'mock path missing');return files.get(p);},
    lstatSync: p => ({isFile: () => p !== owner.stackDir, isSymbolicLink: () => false, uid: 1000, mode: 0o600}),
    rmSync: p => {assert.ok([owner.stackDir, owner.statusPath].includes(p));for (const path of [...files.keys()]) if (path === p || path.startsWith(p + '/')) files.delete(path);},
  };
  function execute(name, args, cwd, timeout) {
    calls.push({name, args, cwd, timeout});
    if (name === 'supabase') {
      if (args[0] === '--version') return '2.84.2';
      if (args.includes('--help')) return '--network-id --no-backup';
      if (args[0] === 'init') {files.set(owner.stackDir + '/supabase/config.toml', `project_id = "${owner.projectId}"`);return '';}
      if (args[0] === 'start') {assert.equal(timeout, 600000);containers = volumes = true;if (failStart) throw Object.assign(new Error('private stderr omitted'), {code: 'REAL_STACK_LIFECYCLE_COMMAND_FAILED'});return 'discard secret output';}
      if (args[0] === 'status') return 'private-local-status';
      if (args[0] === 'stop') {containers = false;volumes = residualVolume;return '';}
    }
    if (name === 'docker') {
      if (args[0] === 'ps') return containers ? '123abc' : '';
      if (args[0] === 'volume') return volumes ? 'owned-volume' : '';
      if (args[1] === 'ls') return network ? owner.network : '';
      if (args[1] === 'create') {network = true;return 'network-id';}
      if (args[1] === 'inspect') return JSON.stringify({name: owner.network,
        labels: {'ncc.synthetic.run': foreignNetwork ? 'other' : owner.runId, 'ncc.synthetic.attempt': owner.attempt},
        options: {'com.docker.network.bridge.host_binding_ipv4': '127.0.0.1'}, containers: containers ? {example: {}} : {}});
      if (args[1] === 'rm') {network = false;return '';}
    }
    throw new Error('Unexpected mock invocation');
  }
  const lifecycle = createLifecycle({env, platform: 'linux', fs, execute, uid: () => 1000,
    validateRuntime: () => {validated = true;return {evidence: {sqlModel: MODEL, containersLoopbackOnly: true}};}});
  return {lifecycle, calls, files, writes, validated: () => validated};
}
test('mock lifecycle creates only owned resources, validates, removes them and is idempotent', () => {
  const x = mockedLifecycle();assert.equal(x.lifecycle.start().status, 'PASS_OWNED_LOOPBACK_STACK');assert.equal(x.validated(), true);
  assert.ok(x.writes.includes(owner.statusPath));assert.equal(x.lifecycle.stop().status, 'PASS_OWNED_STACK_REMOVED');
  assert.equal(x.files.size, 0);assert.equal(x.lifecycle.stop().status, 'PASS_NO_OWNED_RESOURCES');
  assert.equal(x.calls.filter(c => c.name === 'supabase' && c.args[0] === 'start' && !c.args.includes('--help')).length, 1);
});
test('mock partial start is cleaned, residual volumes fail and foreign network is never removed', () => {
  const partial = mockedLifecycle({failStart: true});assert.throws(() => partial.lifecycle.start());assert.equal(partial.files.size, 0);
  const residual = mockedLifecycle({residualVolume: true});residual.lifecycle.start();fails(() => residual.lifecycle.stop(), 'REAL_STACK_CLEANUP_INCOMPLETE');
  assert.ok(residual.files.has(owner.stackDir + '/.ncc-synthetic-owner.json'));
  const foreign = mockedLifecycle({foreignNetwork: true});assert.throws(() => foreign.lifecycle.start());
  assert.equal(foreign.calls.some(c => c.name === 'docker' && c.args[1] === 'rm'), false);
});
test('SQL-derived snapshot preserves digest identity and separates SQL from HTTP evidence', () => {
  const id = '11111111-1111-4111-8111-111111111111', student = '22222222-2222-4222-8222-222222222222';
  const m = {id, student_id: student, coach_id: id, sender_id: id, body: 'Synthetic'};
  const data = {profile: {user_id: id, role: 'student', organization_id: student, active: true}, message: m,
    alias: null, notificationRowsForOperation: 1, inboundUnreadIds: [student], reservedReadIdsUpdated: 0,
    sqlEffects: {sendMessage: 1, setAlias: 0, markRead: 0}};
  const a = snapshotFromSql(data);
  assert.equal(a.messageDigest, createHash('sha256').update(JSON.stringify(['ncc-message-v1', student, id, id, 'Synthetic'])).digest('hex'));
  assert.equal(a.messageIdentity.id, id);assert.equal(a.messageInsertCount, 1);
  const b = snapshotFromSql({...data, message: null, notificationRowsForOperation: 0});
  assert.equal(b.messageRowsForOperation, 0);assert.equal(b.messageInsertCount, 1);
  for (const k of ['cors', 'receiptReads', 'mutationDispatches', 'body', 'adminKey', 'password']) assert.equal(Object.hasOwn(a, k), false);
});
test('source-only SQL contract has RLS, immutable client UUID and private persistent effects', () => {
  assert.equal(safeSqlState('ERROR: 42501\nprivate body omitted'), '42501');
  assert.equal(safeSqlState('ERROR: private body'), null);
  assert.equal(safeSqlState('FATAL: 28P01\n'), '28P01');
  const sql = readFileSync(new URL('./schema.synthetic.sql', import.meta.url), 'utf8');
  assert.match(sql, /PUBLIC SYNTHETIC MODEL/);assert.match(sql, /create table public\.efg_messages\s*\([\s\S]*?id uuid primary key,/);
  assert.doesNotMatch(sql, /create or replace|drop (?:schema|table)|alter role|create role|disable row level security/i);
  for (const table of ['efg_profiles', 'efg_organizations', 'efg_messages']) assert.ok(sql.includes(`alter table public.${table} enable row level security`));
  for (const fn of ['ncc_dual_workspace_contexts_v1', 'ncc_pilot_workspace_roster_v1', 'efg_set_coach_alias', 'efg_coach_shared_student_recipes']) {
    const body = sql.slice(sql.indexOf(`create function public.${fn}`)).split('$$;')[0];assert.match(body, /security invoker/);assert.doesNotMatch(body, /security definer/);
  }
  assert.match(sql, /create unique index ncc_synthetic_insert_once/);
  const effects = sql.split('create table ncc_synthetic.effects')[1].split(');')[0];assert.doesNotMatch(effects, /references public\.efg_messages/);
  assert.match(sql, /role text not null check \(role = 'student'\)/);
});
