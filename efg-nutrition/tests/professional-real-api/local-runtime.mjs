// Public CI-only adapters. Importing this file performs no IO or connections.
// The guard/psql/literal pattern is derived from the public coach119-local helper;
// none of that suite, its schemas, or its SDK-shaped adapter is imported.
import {readFileSync, realpathSync, statSync, lstatSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join, resolve, dirname} from 'node:path';

export const MODEL = 'PUBLIC_SYNTHETIC_INDEPENDENT_V1';
export const CLI_VERSION = '2.84.2';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function requireThat(ok, code) {
  if (!ok) throw Object.assign(new Error(code), {code});
}
export function safeSqlState(stderr) {
  if (typeof stderr !== 'string') return null;
  return stderr.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1] || null;
}
export function literal(value) {return "'" + String(value).replaceAll("'", "''") + "'";}
export function uuid(value) {requireThat(typeof value === 'string' && UUID.test(value), 'SYNTHETIC_UUID_REQUIRED'); return value;}
export function assetOrigin(value) {
  let u; try {u = new URL(value);} catch {requireThat(false, 'ASSET_ORIGIN_REJECTED');}
  requireThat(typeof value === 'string' && value === u.origin && u.protocol === 'http:' &&
    u.hostname === '127.0.0.1' && u.port && u.port !== '54321' && !u.username && !u.password,
  'ASSET_ORIGIN_REJECTED');
  return value;
}
export function checkRuntimeEnv(env, platform = process.platform) {
  requireThat(env.GITHUB_ACTIONS === 'true' && platform === 'linux', 'REAL_STACK_CI_ONLY');
  requireThat(env.NCC_REAL_BROWSER_API === '1', 'REAL_STACK_OPT_IN_REQUIRED');
  requireThat(env.GITHUB_REPOSITORY === 'floresgrancelli/Edu-Flores-Grancelli-lab', 'REAL_STACK_REPOSITORY_REJECTED');
  requireThat(/^[0-9a-f]{40}$/.test(env.GITHUB_SHA || '') && /^\d+$/.test(env.GITHUB_RUN_ID || '') &&
    /^\d+$/.test(env.GITHUB_RUN_ATTEMPT || ''), 'REAL_STACK_RUN_REQUIRED');
  for (const key of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL', 'SUPABASE_PROJECT_ID', 'SUPABASE_SERVICES_HOSTNAME', 'PGHOSTADDR', 'PGSERVICE',
    'PGSERVICEFILE', 'PGOPTIONS', 'DATABASE_URL', 'DEBUG', 'PWDEBUG', 'NODE_DEBUG']) {
    requireThat(!env[key], 'REAL_STACK_OVERRIDE_REJECTED');
  }
  requireThat(!env.NODE_OPTIONS, 'REAL_STACK_OVERRIDE_REJECTED');
  const projectId = `ncc-professional-real-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  requireThat(env.NCC_REAL_STACK_ID === projectId, 'REAL_STACK_OWNER_REJECTED');
  requireThat(env.RUNNER_TEMP && resolve(env.RUNNER_TEMP) === env.RUNNER_TEMP &&
    env.NCC_REAL_STACK_DIR === join(env.RUNNER_TEMP, projectId) &&
    env.NCC_REAL_STACK_NETWORK === projectId + '-network' &&
    env.EFG_LOCAL_STATUS_ENV === join(env.RUNNER_TEMP, projectId + '-status.env'), 'REAL_STACK_PATH_REJECTED');
  return {projectId, stackDir: env.NCC_REAL_STACK_DIR, network: env.NCC_REAL_STACK_NETWORK,
    statusPath: env.EFG_LOCAL_STATUS_ENV, runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT};
}
export function parseLocalStatus(raw) {
  requireThat(typeof raw === 'string' && raw.length < 65536, 'REAL_STACK_STATUS_REJECTED');
  const fields = Object.create(null);
  for (const line of raw.split(/\r?\n/).filter(Boolean)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    requireThat(match && !Object.hasOwn(fields, match[1]), 'REAL_STACK_STATUS_REJECTED');
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    requireThat(!/[\r\n\0]/.test(value), 'REAL_STACK_STATUS_REJECTED'); fields[match[1]] = value;
  }
  let api, db;
  try {api = new URL(fields.API_URL); db = new URL(fields.DB_URL);} catch {requireThat(false, 'REAL_STACK_LOCAL_URL_REQUIRED');}
  requireThat(api.href === 'http://127.0.0.1:54321/' &&
    ['postgres:', 'postgresql:'].includes(db.protocol) && db.hostname === '127.0.0.1' && db.port === '54322' &&
    db.username === 'postgres' && db.password === 'postgres' && db.pathname === '/postgres' && !db.search && !db.hash,
  'REAL_STACK_LOCAL_URL_REQUIRED');
  function localKey(key, role) {
    requireThat(typeof key === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key), 'REAL_STACK_LOCAL_KEY_REQUIRED');
    let header, claims;
    try {const p = key.split('.');header = JSON.parse(Buffer.from(p[0], 'base64url'));claims = JSON.parse(Buffer.from(p[1], 'base64url'));}
    catch {requireThat(false, 'REAL_STACK_LOCAL_KEY_ENCODING_REJECTED');}
    requireThat(header && typeof header === 'object' && !Array.isArray(header) &&
      claims && typeof claims === 'object' && !Array.isArray(claims), 'REAL_STACK_LOCAL_KEY_ENCODING_REJECTED');
    // Exact pinned CLI source: v2.84.2/pkg/config/apikeys.go:75-82 sets
    // Issuer="supabase-demo" for generated legacy API keys (not "supabase").
    // init's signing_keys_path is commented out, so these keys use HS256.
    // These fixed failure codes disclose no token fragments or arbitrary claims.
    requireThat(header.alg === 'HS256', 'REAL_STACK_LOCAL_KEY_ALGORITHM_REJECTED');
    requireThat(claims.role === role, 'REAL_STACK_LOCAL_KEY_ROLE_REJECTED');
    requireThat(claims.iss === 'supabase-demo', 'REAL_STACK_LOCAL_KEY_ISSUER_REJECTED');
    requireThat((claims.ref === undefined || claims.ref === 'supabase-demo') && !claims.sub,
      'REAL_STACK_LOCAL_KEY_SCOPE_REJECTED');
    return key;
  }
  // Local key claims are a target guard, not JWT verification. Real GoTrue and
  // PostgREST validate issued session tokens in the integration run.
  return {origin: api.origin, anonKey: localKey(fields.ANON_KEY, 'anon'),
    adminKey: localKey(fields.SERVICE_ROLE_KEY, 'service_role')};
}
export function validateDockerEvidence(containers, network, owner) {
  requireThat(Array.isArray(containers) && containers.length >= 4 && containers.length <= 24, 'REAL_STACK_CONTAINERS_REQUIRED');
  requireThat(network?.name === owner.network && network.labels?.['ncc.synthetic.run'] === owner.runId &&
    network.labels?.['ncc.synthetic.attempt'] === owner.attempt &&
    network.options?.['com.docker.network.bridge.host_binding_ipv4'] === '127.0.0.1', 'REAL_STACK_NETWORK_REJECTED');
  const bindings = [], services = {};
  for (const c of containers) {
    requireThat(c.project === owner.projectId && c.running === true &&
      typeof c.name === 'string' && c.name.endsWith('_' + owner.projectId) &&
      Array.isArray(c.networks) && c.networks.length === 1 && c.networks[0] === owner.network,
    'REAL_STACK_CONTAINER_OWNER_REJECTED');
    requireThat(typeof c.image === 'string' && /^[a-z0-9./_-]+:[A-Za-z0-9._-]+$/.test(c.image), 'REAL_STACK_IMAGE_REJECTED');
    for (const [port, values] of Object.entries(c.ports || {})) {
      if (values === null) continue;
      requireThat(Array.isArray(values), 'REAL_STACK_BINDINGS_REJECTED');
      for (const b of values) {
        requireThat(b.HostIp === '127.0.0.1' && /^[1-9]\d{0,4}$/.test(b.HostPort) && Number(b.HostPort) <= 65535,
          'REAL_STACK_NON_LOOPBACK_BINDING');
        bindings.push({container: c.name, containerPort: port, hostPort: b.HostPort});
      }
    }
    for (const service of ['db', 'auth', 'rest', 'kong']) {
      if (c.name === `/supabase_${service}_${owner.projectId}`) services[service] = c.image;
    }
  }
  requireThat(Object.keys(services).length === 4, 'REAL_STACK_SERVICES_REQUIRED');
  requireThat(bindings.some(b => b.container === `/supabase_kong_${owner.projectId}` && b.hostPort === '54321') &&
    bindings.some(b => b.container === `/supabase_db_${owner.projectId}` && b.hostPort === '54322'), 'REAL_STACK_PORTS_REQUIRED');
  return {containersLoopbackOnly: true, containerCount: containers.length,
    postgresImage: services.db, authImage: services.auth, postgrestImage: services.rest, gatewayImage: services.kong};
}
function command(name, args, options = {}) {
  const r = spawnSync(name, args, {encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, ...options});
  if (r.error || r.status !== 0) {
    const code = name === 'psql' ? 'REAL_STACK_SQL_FAILED' : 'REAL_STACK_LOCAL_COMMAND_FAILED';
    throw Object.assign(new Error(code), {code, ...(name === 'psql' && safeSqlState(r.stderr) ? {sqlState: safeSqlState(r.stderr)} : {})});
  }
  return r.stdout.trim(); // stderr and arguments are intentionally never logged.
}
function json(value) {try {return JSON.parse(value);} catch {requireThat(false, 'REAL_STACK_EVIDENCE_REJECTED');}}
export function openLocalRuntime() {
  const owner = checkRuntimeEnv(process.env);
  requireThat(realpathSync(owner.stackDir) === owner.stackDir && realpathSync(dirname(owner.statusPath)) === dirname(owner.statusPath),
    'REAL_STACK_PATH_REJECTED');
  const config = readFileSync(join(owner.stackDir, 'supabase/config.toml'), 'utf8');
  requireThat(config.match(/^project_id\s*=\s*"([^"\n]+)"\s*$/m)?.[1] === owner.projectId, 'REAL_STACK_OWNER_REJECTED');
  requireThat(command('supabase', ['--version']) === CLI_VERSION, 'REAL_STACK_CLI_VERSION_REJECTED');
  const names = command('docker', ['ps', '-aq', '--filter', `label=com.supabase.cli.project=${owner.projectId}`]).split('\n').filter(Boolean);
  requireThat(names.length >= 4 && names.length <= 24 && names.every(n => /^[0-9a-f]{12,64}$/.test(n)), 'REAL_STACK_CONTAINERS_REQUIRED');
  // Request only safe fields; never retrieve Config.Env or command-line secrets.
  const format = '{"name":{{json .Name}},"project":{{json (index .Config.Labels "com.supabase.cli.project")}},"image":{{json .Config.Image}},"running":{{json .State.Running}},"ports":{{json .NetworkSettings.Ports}},"networks":[{{range $i, $v := .NetworkSettings.Networks}}{{if $v.EndpointID}}{{json $i}}{{end}}{{end}}]}';
  const containers = names.map(name => json(command('docker', ['inspect', '--format', format, name])));
  const network = json(command('docker', ['network', 'inspect', '--format',
    '{"name":{{json .Name}},"labels":{{json .Labels}},"options":{{json .Options}}}', owner.network]));
  const evidence = validateDockerEvidence(containers, network, owner);
  // Inspect bindings BEFORE reading keys or opening SQL/Auth connections.
  const info = lstatSync(owner.statusPath);
  requireThat(info.isFile() && !info.isSymbolicLink() && (info.mode & 0o077) === 0 &&
    info.uid === process.getuid() && statSync(owner.statusPath).size < 65536, 'REAL_STACK_STATUS_PERMISSIONS');
  const secrets = parseLocalStatus(readFileSync(owner.statusPath, 'utf8'));
  const pg = {PATH: process.env.PATH, LANG: 'C', PGHOST: '127.0.0.1', PGPORT: '54322',
    PGUSER: 'postgres', PGPASSWORD: 'postgres', PGDATABASE: 'postgres',
    PGCONNECT_TIMEOUT: '5', PGPASSFILE: '/dev/null', PGSSLMODE: 'disable'};
  function sql(query) {
    requireThat(typeof query === 'string' && query.length <= 256 * 1024, 'REAL_STACK_SQL_REJECTED');
    return command('psql', ['-X', '-Atq', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate'], {env: pg, input: query});
  }
  requireThat(sql('select current_database()') === 'postgres', 'REAL_STACK_DATABASE_REJECTED');
  const postgresVersion = sql('show server_version_num');
  requireThat(/^17\d{4}$/.test(postgresVersion), 'REAL_STACK_POSTGRES_VERSION_REJECTED');
  async function authAdmin(method, path, body) {
    requireThat(method === 'POST' && path === '/auth/v1/admin/users' ||
      method === 'DELETE' && /^\/auth\/v1\/admin\/users\/[0-9a-f-]{36}$/.test(path), 'REAL_STACK_ADMIN_ROUTE_REJECTED');
    let response;
    try {response = await fetch(secrets.origin + path, {method, redirect: 'error', credentials: 'omit',
      headers: {apikey: secrets.anonKey, Authorization: 'Bearer ' + secrets.adminKey, 'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)});}
    catch {requireThat(false, 'REAL_STACK_AUTH_REQUEST_FAILED');}
    requireThat(response.ok, 'REAL_STACK_AUTH_ADMIN_REJECTED');
    let result; try {result = await response.json();} catch {requireThat(false, 'REAL_STACK_AUTH_RESPONSE_REJECTED');}
    return result;
  }
  return Object.freeze({owner, origin: secrets.origin, anonKey: secrets.anonKey, sql, authAdmin,
    evidence: Object.freeze({...evidence, cliVersion: CLI_VERSION, postgresVersion, sqlModel: MODEL})});
}
