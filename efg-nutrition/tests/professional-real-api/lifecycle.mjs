// Sole lifecycle for a new disposable CI stack and its own loopback Docker
// network. This never changes daemon settings, existing networks, or host rules.
import {mkdirSync, readFileSync, writeFileSync, existsSync, lstatSync, realpathSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkRuntimeEnv, requireThat, CLI_VERSION, openLocalRuntime} from './local-runtime.mjs';

export function commandPlan(owner) {
  return Object.freeze({
    init: ['supabase', ['init', '--yes']],
    createNetwork: ['docker', ['network', 'create', '--label', `ncc.synthetic.run=${owner.runId}`,
      '--label', `ncc.synthetic.attempt=${owner.attempt}`, '--opt',
      'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', owner.network]],
    start: ['supabase', ['start', '--network-id', owner.network]],
    status: ['supabase', ['status', '-o', 'env']],
    stop: ['supabase', ['stop', '--no-backup']],
    removeNetwork: ['docker', ['network', 'rm', owner.network]],
  });
}
function run(name, args, cwd, timeout = 30000) {
  const r = spawnSync(name, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024});
  if (r.error || r.status !== 0) {
    const candidate = name === 'supabase' ? `supabase_${args[0]}` : args[0] === 'network' ? `docker_network_${args[1]}` : `docker_${args[0]}`;
    const phase = LIFECYCLE_PHASES.includes(candidate) ? candidate : 'inspect_prerequisites';
    throw Object.assign(new Error('REAL_STACK_LIFECYCLE_COMMAND_FAILED'), {code: 'REAL_STACK_LIFECYCLE_COMMAND_FAILED', phase});
  }
  return r.stdout.trim(); // Raw CLI start/status output can contain keys. Never log.
}
const markerPath = owner => join(owner.stackDir, '.ncc-synthetic-owner.json');
const LIFECYCLE_PHASES = ['supabase_init', 'supabase_start', 'supabase_status', 'supabase_stop',
  'docker_network_create', 'docker_network_inspect', 'docker_network_rm', 'docker_network_ls',
  'docker_ps', 'docker_volume', 'inspect_prerequisites', 'validate_runtime', 'start_cleanup'];
export function createLifecycle({env = process.env, platform = process.platform, execute = run,
  fs = {mkdirSync, readFileSync, writeFileSync, existsSync, lstatSync, realpathSync, rmSync},
  validateRuntime = openLocalRuntime, uid = () => process.getuid()} = {}) {
const owner = checkRuntimeEnv(env, platform), plan = commandPlan(owner);
function checkMarker() {
  requireThat(fs.realpathSync(owner.stackDir) === owner.stackDir && !fs.lstatSync(owner.stackDir).isSymbolicLink(),
    'REAL_STACK_PATH_REJECTED');
  const p = markerPath(owner), info = fs.lstatSync(p);
  requireThat(info.isFile() && !info.isSymbolicLink() && info.uid === uid() && (info.mode & 0o077) === 0,
    'REAL_STACK_OWNER_REJECTED');
  let marker;try {marker = JSON.parse(fs.readFileSync(p, 'utf8'));} catch {requireThat(false, 'REAL_STACK_OWNER_REJECTED');}
  requireThat(marker.runId === owner.runId && marker.attempt === owner.attempt &&
    marker.projectId === owner.projectId && marker.sha === env.GITHUB_SHA, 'REAL_STACK_OWNER_REJECTED');
}
function resourceNames(type) {
  const args = type === 'containers' ? ['ps', '-aq', '--filter', `label=com.supabase.cli.project=${owner.projectId}`] :
    ['volume', 'ls', '-q', '--filter', `label=com.supabase.cli.project=${owner.projectId}`];
  return execute('docker', args).split('\n').filter(Boolean);
}
function networkExists() {
  return execute('docker', ['network', 'ls', '--format', '{{.Name}}']).split('\n').includes(owner.network);
}
function checkNetworkOwner() {
  let n;try {n = JSON.parse(execute('docker', ['network', 'inspect', '--format',
    '{"name":{{json .Name}},"labels":{{json .Labels}},"options":{{json .Options}},"containers":{{json .Containers}}}', owner.network]));}
  catch {requireThat(false, 'REAL_STACK_NETWORK_REJECTED');}
  requireThat(n.name === owner.network && n.labels?.['ncc.synthetic.run'] === owner.runId &&
    n.labels?.['ncc.synthetic.attempt'] === owner.attempt &&
    n.options?.['com.docker.network.bridge.host_binding_ipv4'] === '127.0.0.1', 'REAL_STACK_NETWORK_REJECTED');
  return n;
}
function start() {
  requireThat(fs.realpathSync(env.RUNNER_TEMP) === env.RUNNER_TEMP, 'REAL_STACK_PATH_REJECTED');
  requireThat(!fs.existsSync(owner.stackDir) && !fs.existsSync(owner.statusPath) &&
    resourceNames('containers').length === 0 && resourceNames('volumes').length === 0 &&
    !networkExists(), 'REAL_STACK_ALREADY_EXISTS');
  requireThat(execute('supabase', ['--version']) === CLI_VERSION, 'REAL_STACK_CLI_VERSION_REJECTED');
  // Discover the pinned CLI flags, rather than silently assuming newer syntax.
  requireThat(execute('supabase', ['start', '--help']).includes('--network-id') &&
    execute('supabase', ['stop', '--help']).includes('--no-backup'), 'REAL_STACK_CLI_FLAGS_REQUIRED');
  fs.mkdirSync(owner.stackDir, {mode: 0o700});
  fs.writeFileSync(markerPath(owner), JSON.stringify({...owner, sha: env.GITHUB_SHA}), {mode: 0o600, flag: 'wx'});
  try {
    execute(...plan.init, owner.stackDir);
    const config = fs.readFileSync(join(owner.stackDir, 'supabase/config.toml'), 'utf8');
    requireThat(config.match(/^project_id\s*=\s*"([^"\n]+)"\s*$/m)?.[1] === owner.projectId, 'REAL_STACK_OWNER_REJECTED');
    execute(...plan.createNetwork);
    checkNetworkOwner();
    execute(...plan.start, owner.stackDir, 10 * 60 * 1000);
    fs.writeFileSync(owner.statusPath, execute(...plan.status, owner.stackDir) + '\n', {mode: 0o600, flag: 'wx'});
    let runtime;
    try {runtime = validateRuntime();} catch (error) {throw Object.assign(error, {phase: 'validate_runtime'});}
    return {status: 'PASS_OWNED_LOOPBACK_STACK', evidence: runtime.evidence};
  } catch (error) {
    // The workflow also calls stop in always(); this is idempotent when clean.
    try {stop();} catch {throw Object.assign(new Error('REAL_STACK_START_AND_CLEANUP_FAILED'), {code: 'REAL_STACK_START_AND_CLEANUP_FAILED', phase: 'start_cleanup'});}
    throw Object.assign(new Error(error?.code || 'REAL_STACK_START_FAILED'), {code: error?.code || 'REAL_STACK_START_FAILED',
      ...(LIFECYCLE_PHASES.includes(error?.phase) ? {phase: error.phase} : {}),
      ...(/^[0-9A-Z]{5}$/.test(error?.sqlState || '') ? {sqlState: error.sqlState} : {})});
  }
}
function stop() {
  if (!fs.existsSync(owner.stackDir)) {
    requireThat(!fs.existsSync(owner.statusPath) && resourceNames('containers').length === 0 &&
      resourceNames('volumes').length === 0 && !networkExists(), 'REAL_STACK_OWNER_MARKER_MISSING');
    return {status: 'PASS_NO_OWNED_RESOURCES'};
  }
  checkMarker();
  const configPath = join(owner.stackDir, 'supabase/config.toml');
  const failures = [];
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8');
    requireThat(config.match(/^project_id\s*=\s*"([^"\n]+)"\s*$/m)?.[1] === owner.projectId, 'REAL_STACK_OWNER_REJECTED');
    try {execute(...plan.stop, owner.stackDir, 120000);} catch {failures.push('STOP');}
  }
  if (resourceNames('containers').length) failures.push('CONTAINERS');
  if (resourceNames('volumes').length) failures.push('VOLUMES');
  if (networkExists()) {
    const n = checkNetworkOwner();
    if (Object.keys(n.containers || {}).length) failures.push('NETWORK_NOT_EMPTY');
    else {try {execute(...plan.removeNetwork);} catch {failures.push('NETWORK_REMOVE');}}
  }
  // Preserve ownership marker if cleanup failed so always() can check it again.
  requireThat(failures.length === 0 && !networkExists(), 'REAL_STACK_CLEANUP_INCOMPLETE');
  fs.rmSync(owner.statusPath, {force: true});
  fs.rmSync(owner.stackDir, {recursive: true});
  return {status: 'PASS_OWNED_STACK_REMOVED', containersRemaining: 0, volumesRemaining: 0, networkRemaining: false};
}
return Object.freeze({start, stop});
}
export const startStack = () => createLifecycle().start();
export const stopStack = () => createLifecycle().stop();
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    requireThat(process.argv.length === 3 && ['start', 'stop'].includes(process.argv[2]), 'REAL_STACK_LIFECYCLE_ARGUMENT_REJECTED');
    console.log(JSON.stringify(process.argv[2] === 'start' ? startStack() : stopStack()));
  } catch (error) {
    const code = /^REAL_STACK_[A-Z_]+$/.test(error?.code || '') ? error.code : 'REAL_STACK_LIFECYCLE_FAILED';
    console.log(JSON.stringify({status: 'FAILED', code,
      ...(LIFECYCLE_PHASES.includes(error?.phase) ? {phase: error.phase} : {}),
      ...(/^[0-9A-Z]{5}$/.test(error?.sqlState || '') ? {sqlState: error.sqlState} : {})}));process.exitCode = 1;
  }
}
