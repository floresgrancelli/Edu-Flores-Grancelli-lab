// Public, synthetic HTTP fixture. This is not a Supabase service, GoTrue,
// JWT validation, database security policy, or a model of hosted SQL behavior.
// It exists only to exercise the real browser SDK's HTTP/storage behavior.
import { createHash, randomUUID } from 'node:crypto';

const MAX_BODY_BYTES = 32 * 1024;
// 200 reserved UUIDs in the public client's PATCH filter fit within this cap.
const MAX_TARGET_BYTES = 16 * 1024;
export const SYNTHETIC_PUBLIC_ANON_KEY = 'ncc-public-synthetic-anon-key';
const REQUEST_HEADERS = new Set([
  'accept', 'accept-profile', 'apikey', 'authorization', 'content-profile',
  'content-type', 'prefer', 'range', 'range-unit', 'x-client-info',
  'x-supabase-api-version',
]);
const METHODS = new Set(['GET', 'POST', 'PATCH', 'OPTIONS']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MESSAGE_COLUMNS = 'id,student_id,coach_id,sender_id,body,created_at,read_at';
const PROFILE_COLUMNS = 'user_id,role,organization_id,active';
const ORGANIZATION_COLUMNS = 'id,coach_id,payment_alias';
const ROUTES = new Map([
  ['POST /auth/v1/token', ['grant_type']],
  ['GET /auth/v1/user', []],
  ['POST /auth/v1/logout', ['scope']],
  ['POST /rest/v1/rpc/ncc_dual_workspace_contexts_v1', []],
  ['POST /rest/v1/rpc/ncc_pilot_workspace_roster_v1', []],
  ['POST /rest/v1/rpc/efg_set_coach_alias', []],
  ['POST /rest/v1/rpc/efg_coach_shared_student_recipes', []],
  ['GET /rest/v1/efg_profiles', ['select', 'user_id']],
  ['GET /rest/v1/efg_organizations', ['select', 'id', 'coach_id']],
  ['GET /rest/v1/efg_messages', ['select', 'student_id', 'coach_id', 'id', 'order', 'limit']],
  ['POST /rest/v1/efg_messages', ['select', 'columns']],
  ['PATCH /rest/v1/efg_messages', ['select', 'student_id', 'coach_id', 'sender_id', 'read_at', 'id']],
]);

function exactLoopbackOrigin(value) {
  if (typeof value !== 'string' || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(value)) {
    throw new TypeError('Fixture requires an exact http://127.0.0.1:<port> asset origin.');
  }
  const parsed = new URL(value);
  if (parsed.origin !== value || !parsed.port || Number(parsed.port) > 65535) {
    throw new TypeError('Fixture asset origin is not canonical loopback.');
  }
  return value;
}

function clone(value) { return structuredClone(value); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function onlyKeys(value, keys) { return isRecord(value) && Object.keys(value).every(key => keys.includes(key)); }
function validId(value) { return typeof value === 'string' && UUID.test(value); }

function normalizedHeaders(input) {
  if (!isRecord(input) || Object.keys(input).length > 48) return null;
  const output = Object.create(null);
  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(lower) || typeof value !== 'string' || value.length > 8192 || /[\r\n]/.test(value) || lower in output) return null;
    output[lower] = value;
  }
  return output;
}

function parseJsonBody(body, headers) {
  if (typeof body !== 'string') throw Object.assign(new Error('JSON text required.'), { status: 400 });
  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) throw Object.assign(new Error('Fixture request too large.'), { status: 413 });
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(headers['content-type'] || '')) {
    throw Object.assign(new Error('Fixture accepts JSON only.'), { status: 415 });
  }
  let value;
  try { value = JSON.parse(body); } catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
  if (!isRecord(value)) throw Object.assign(new Error('JSON object required.'), { status: 400 });
  return value;
}

function parseTarget(target) {
  if (typeof target !== 'string' || Buffer.byteLength(target, 'utf8') > MAX_TARGET_BYTES || !target.startsWith('/') || target.startsWith('//') || /[\\\s#]/.test(target)) return null;
  const url = new URL(target, 'http://127.0.0.1');
  if (url.pathname !== target.split('?')[0] || url.pathname.includes('%') || url.pathname.includes('//')) return null;
  if ([...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)) return null;
  return url;
}

function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function ensure(condition, status = 400, code = 'FIXTURE_REQUEST_REJECTED') {
  if (!condition) throw Object.assign(new Error(code), { status, code });
}
function keysExactly(value, keys) { return onlyKeys(value, keys) && keys.every(key => Object.hasOwn(value, key)); }

// No socket, network call, filesystem, or browser is used by this model.
// Callers can test the exact HTTP request handler offline.
export function createFixtureModel({ allowedOrigin } = {}) {
  exactLoopbackOrigin(allowedOrigin);
  const fixture = Object.freeze({
    userId: '10000000-0000-4000-8000-000000000001',
    studentId: '20000000-0000-4000-8000-000000000002',
    organizationId: '30000000-0000-4000-8000-000000000003',
    email: 'synthetic.coach@example.invalid',
    password: 'public-fixture-password-not-a-credential',
    anonKey: SYNTHETIC_PUBLIC_ANON_KEY,
  });
  const profile = Object.freeze({ user_id: fixture.userId, role: 'student',
    organization_id: '40000000-0000-4000-8000-000000000004', active: true });
  const organization = { id: fixture.organizationId, coach_id: fixture.userId, payment_alias: null };
  const seedId = '50000000-0000-4000-8000-000000000005';
  const messages = new Map([[seedId, { id: seedId, student_id: fixture.studentId,
    coach_id: fixture.userId, sender_id: fixture.studentId, body: 'Synthetic inbound fixture message.',
    created_at: '2026-01-01T00:00:00.000Z', read_at: null }]]);
  // Notifications here are invented test rows, NOT evidence of a SQL trigger.
  const notifications = new Map();
  const insertedIds = new Set();
  const hiddenIds = new Set();
  const sessions = new Map();
  const receiptReads = [];
  const counters = { requests: 0, responses: 0, messageReads: 0, messageReceiptReads: 0,
    userReads: 0, logins: 0, duplicateMessageInserts: 0, messageInsertCount: 0 };
  const mutationDispatches = { sendMessage: 0, setAlias: 0, markRead: 0 };
  const cors = { preflightRequests: 0, optionsAccepted: 0, originRejected: 0 };
  let revoked = false;
  let disposed = false;

  function response(status, data, acceptedOrigin = false) {
    counters.responses++;
    return {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        vary: 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
        ...(acceptedOrigin ? {
          'access-control-allow-origin': allowedOrigin,
          'access-control-expose-headers': 'Content-Type',
        } : {}),
      },
      body: data === undefined ? '' : JSON.stringify(data),
    };
  }

  function user(session) {
    return { id: fixture.userId, aud: 'authenticated', role: 'authenticated', email: fixture.email,
      email_confirmed_at: '2026-01-01T00:00:00.000Z', phone: '', confirmed_at: '2026-01-01T00:00:00.000Z',
      app_metadata: { provider: 'email', providers: ['email'], synthetic_fixture: true },
      user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z', last_sign_in_at: new Date(session.issuedAt * 1000).toISOString(),
      is_anonymous: false };
  }

  function authenticate(headers) {
    const authorization = headers.authorization;
    ensure(typeof authorization === 'string' && authorization.startsWith('Bearer '), 401, 'FIXTURE_AUTH_REQUIRED');
    const session = sessions.get(authorization.slice(7));
    ensure(session && session.expiresAt > Math.floor(Date.now() / 1000), 401, 'FIXTURE_SESSION_UNKNOWN');
    return session;
  }

  function login(body) {
    ensure(sessions.size < 100, 429, 'FIXTURE_LIMIT');
    ensure(onlyKeys(body, ['email', 'password', 'gotrue_meta_security']) &&
      body.email === fixture.email && body.password === fixture.password &&
      (body.gotrue_meta_security === undefined || keysExactly(body.gotrue_meta_security, [])), 400, 'FIXTURE_LOGIN_REJECTED');
    const issuedAt = Math.floor(Date.now() / 1000);
    const sessionId = randomUUID();
    const session = { sessionId, issuedAt, expiresAt: issuedAt + 3600 };
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    // Parseable JWT-shaped test text, intentionally unsigned. Acceptance is exact
    // membership in this ephemeral fixture's RAM, never signature verification.
    const accessToken = `${encode({ alg: 'none', typ: 'JWT', synthetic_fixture: true })}.${encode({
      sub: fixture.userId, session_id: sessionId, aud: 'authenticated', role: 'authenticated',
      iat: issuedAt, exp: session.expiresAt, synthetic_fixture: true,
    })}.synthetic-not-a-signature`;
    sessions.set(accessToken, session);
    counters.logins++;
    return { access_token: accessToken, token_type: 'bearer', expires_in: 3600,
      expires_at: session.expiresAt, refresh_token: `synthetic-unused-${randomUUID()}`,
      user: user(session) };
  }

  function pair(params) {
    ensure(params.get('student_id') === `eq.${fixture.studentId}` && params.get('coach_id') === `eq.${fixture.userId}`);
  }
  function representation(rows, headers) {
    if (headers.accept === 'application/vnd.pgrst.object+json') {
      ensure(rows.length === 1, 406, 'PGRST116');
      return rows[0];
    }
    ensure(headers.accept === undefined || headers.accept === '*/*' || headers.accept === 'application/json');
    return rows;
  }

  function dispatch(method, url, headers, body) {
    const path = url.pathname;
    const params = url.searchParams;
    ensure(headers.apikey === fixture.anonKey, 401, 'FIXTURE_API_KEY_REQUIRED');
    if (path === '/auth/v1/token') {
      ensure(params.get('grant_type') === 'password' && [...params].length === 1);
      return { status: 200, data: login(body) };
    }
    const session = authenticate(headers);
    if (path === '/auth/v1/user') { counters.userReads++; return { status: 200, data: user(session) }; }
    if (path === '/auth/v1/logout') {
      ensure(params.get('scope') === 'local' && [...params].length === 1 && keysExactly(body, []));
      sessions.delete(headers.authorization.slice(7));
      return { status: 204 };
    }
    if (path === '/rest/v1/rpc/ncc_dual_workspace_contexts_v1') {
      ensure(keysExactly(body, []));
      return { status: 200, data: { user_id: fixture.userId, active: true, profile_role: profile.role,
        student_context: { organization_id: profile.organization_id },
        coach_contexts: revoked ? [] : [{ id: fixture.organizationId, coach_id: fixture.userId,
          is_test: true, status: 'trial', legal_ready: true }] } };
    }
    if (path === '/rest/v1/efg_profiles') {
      ensure(params.get('select') === PROFILE_COLUMNS && params.get('user_id') === `eq.${fixture.userId}`);
      return { status: 200, data: representation([profile], headers) };
    }
    ensure(!revoked, 403, '42501');
    if (path === '/rest/v1/rpc/ncc_pilot_workspace_roster_v1') {
      ensure(keysExactly(body, ['p_org']) && body.p_org === fixture.organizationId);
      return { status: 200, data: [{ user_id: fixture.studentId, organization_id: fixture.organizationId,
        nickname: 'Synthetic student', active: true, consent_accepted: true }] };
    }
    if (path === '/rest/v1/rpc/efg_coach_shared_student_recipes') {
      ensure(keysExactly(body, ['p_student']) && body.p_student === fixture.studentId);
      return { status: 200, data: [] };
    }
    if (path === '/rest/v1/rpc/efg_set_coach_alias') {
      ensure(keysExactly(body, ['p_alias']) && typeof body.p_alias === 'string' && body.p_alias === body.p_alias.trim() &&
        Array.from(body.p_alias).length >= 3 && Array.from(body.p_alias).length <= 100);
      organization.payment_alias = body.p_alias;
      // Boolean matches the public client contract. It is not an operation receipt.
      return { status: 200, data: true };
    }
    if (path === '/rest/v1/efg_organizations') {
      ensure(params.get('select') === ORGANIZATION_COLUMNS && params.get('id') === `eq.${fixture.organizationId}` &&
        params.get('coach_id') === `eq.${fixture.userId}`);
      return { status: 200, data: representation([organization], headers) };
    }
    ensure(path === '/rest/v1/efg_messages');
    ensure(params.get('select') === MESSAGE_COLUMNS);
    if (method === 'GET') {
      pair(params);
      counters.messageReads++;
      let rows = [...messages.values()].filter(row => !hiddenIds.has(row.id));
      if (params.has('id')) {
        ensure(/^eq\./.test(params.get('id')) && validId(params.get('id').slice(3)) && !params.has('limit') && !params.has('order'));
        counters.messageReceiptReads++;
        ensure(receiptReads.length < 1000, 429, 'FIXTURE_LIMIT');
        receiptReads.push({ id: params.get('id').slice(3), studentId: fixture.studentId, coachId: fixture.userId });
        rows = rows.filter(row => row.id === params.get('id').slice(3) && row.student_id === fixture.studentId &&
          row.coach_id === fixture.userId);
      } else {
        ensure(params.get('order') === 'created_at.desc,id.desc' && params.get('limit') === '200');
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        rows = rows.slice(0, 200);
      }
      return { status: 200, data: representation(rows, headers) };
    }
    if (method === 'POST') {
      ensure(keysExactly(body, ['id', 'student_id', 'coach_id', 'sender_id', 'body']) && validId(body.id) &&
        body.student_id === fixture.studentId && body.coach_id === fixture.userId && body.sender_id === fixture.userId &&
        typeof body.body === 'string' && body.body.trim() === body.body && Array.from(body.body).length >= 1 &&
        Array.from(body.body).length <= 2000);
      if (params.has('columns')) {
        ensure(params.get('columns') === '"id","student_id","coach_id","sender_id","body"');
      }
      ensure(headers.prefer === 'return=representation' && headers.accept === 'application/vnd.pgrst.object+json');
      if (insertedIds.has(body.id) || messages.has(body.id)) {
        counters.duplicateMessageInserts++;
        ensure(false, 409, '23505');
      }
      ensure(insertedIds.size < 200, 429, 'FIXTURE_LIMIT');
      const row = { id: body.id, student_id: body.student_id, coach_id: body.coach_id,
        sender_id: body.sender_id, body: body.body, created_at: new Date().toISOString(), read_at: null };
      messages.set(row.id, row);
      insertedIds.add(row.id);
      notifications.set(row.id, { message_id: row.id, synthetic_fixture: true });
      counters.messageInsertCount++;
      return { status: 201, data: clone(row) };
    }
    ensure(method === 'PATCH');
    pair(params);
    ensure(params.get('sender_id') === `eq.${fixture.studentId}` && params.get('read_at') === 'is.null' &&
      keysExactly(body, ['read_at']) && typeof body.read_at === 'string' && Number.isFinite(Date.parse(body.read_at)) &&
      new Date(body.read_at).toISOString() === body.read_at && headers.prefer === 'return=representation');
    const idFilter = params.get('id');
    ensure(typeof idFilter === 'string' && idFilter.startsWith('in.(') && idFilter.endsWith(')'));
    const ids = idFilter.slice(4, -1).split(',');
    ensure(ids.length >= 1 && ids.length <= 200 && ids.every(validId) && new Set(ids).size === ids.length);
    const rows = [];
    for (const id of ids) {
      const row = messages.get(id);
      if (row && !hiddenIds.has(id) && row.student_id === fixture.studentId && row.coach_id === fixture.userId &&
          row.sender_id === fixture.studentId && row.read_at === null) {
        row.read_at = body.read_at;
        rows.push(clone(row));
      }
    }
    return { status: 200, data: rows };
  }

  function handleRequest({ method, path, headers: suppliedHeaders = {}, body = '' } = {}) {
    counters.requests++;
    const headers = normalizedHeaders(suppliedHeaders);
    if (!headers || headers.origin !== allowedOrigin) {
      cors.originRejected++;
      return response(403, { code: 'FIXTURE_ORIGIN_REJECTED', message: 'Synthetic fixture origin rejected.' });
    }
    try {
      ensure(!disposed, 503, 'FIXTURE_CLOSED');
      ensure(METHODS.has(method), 405);
      const url = parseTarget(path);
      ensure(url, 400);
      if (method === 'OPTIONS') {
        cors.preflightRequests++;
        const requestedMethod = headers['access-control-request-method'];
        const allowed = ROUTES.get(`${requestedMethod} ${url.pathname}`);
        ensure(allowed && [...url.searchParams.keys()].every(key => allowed.includes(key)), 403);
        const names = (headers['access-control-request-headers'] || '').split(',').map(name => name.trim().toLowerCase()).filter(Boolean);
        ensure(names.length <= REQUEST_HEADERS.size && new Set(names).size === names.length &&
          names.every(name => REQUEST_HEADERS.has(name)) && body === '', 403);
        cors.optionsAccepted++;
        const result = response(204, undefined, true);
        result.headers['access-control-allow-methods'] = requestedMethod;
        if (names.length) result.headers['access-control-allow-headers'] = names.join(', ');
        result.headers['access-control-max-age'] = '0';
        return result;
      }
      const allowed = ROUTES.get(`${method} ${url.pathname}`);
      ensure(allowed && [...url.searchParams.keys()].every(key => allowed.includes(key)), 404);
      ensure(typeof body === 'string' && Buffer.byteLength(body, 'utf8') <= MAX_BODY_BYTES, 413);
      const data = method === 'GET' ? (ensure(body === ''), undefined) :
        // Auth logout from the SDK has no body; the fixture also accepts {}.
        url.pathname === '/auth/v1/logout' && body === '' ? {} : parseJsonBody(body, headers);
      if (url.pathname === '/rest/v1/efg_messages' && method === 'POST') mutationDispatches.sendMessage++;
      if (url.pathname === '/rest/v1/efg_messages' && method === 'PATCH') mutationDispatches.markRead++;
      if (url.pathname === '/rest/v1/rpc/efg_set_coach_alias') mutationDispatches.setAlias++;
      const result = dispatch(method, url, headers, data);
      return response(result.status, result.data, true);
    } catch (error) {
      const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
      // Never serialize request data, tokens, stacks, or internal exception messages.
      return response(status, { code: error?.code || 'FIXTURE_REQUEST_REJECTED', message: 'Synthetic fixture request rejected.' }, true);
    }
  }

  function snapshot({ operationId = null, readIds = [] } = {}) {
    ensure(operationId === null || validId(operationId));
    ensure(Array.isArray(readIds) && readIds.length <= 200 && readIds.every(validId) && new Set(readIds).size === readIds.length);
    const row = operationId === null ? null : messages.get(operationId);
    return clone({
      originalProfileHash: hash(profile), mutationDispatches, messageInsertCount: counters.messageInsertCount,
      messageRowsForOperation: row ? 1 : 0,
      notificationRowsForOperation: operationId !== null && notifications.has(operationId) ? 1 : 0,
      messageDigest: row ? hash(['ncc-message-v1', row.student_id, row.coach_id, row.sender_id, row.body]) : null,
      messageIdentity: row ? { id: row.id, studentId: row.student_id, coachId: row.coach_id, senderId: row.sender_id } : null,
      aliasHash: hash(organization.payment_alias),
      inboundUnreadIds: [...messages.values()].filter(row => row.sender_id === fixture.studentId && row.read_at === null).map(row => row.id).sort(),
      reservedReadIdsUpdated: readIds.filter(id => messages.has(id) && messages.get(id).sender_id === fixture.studentId && messages.get(id).read_at !== null).length,
      cors, counters, receiptReads,
    });
  }

  function makeReceiptAbsent({ operationId } = {}) {
    ensure(validId(operationId) && insertedIds.has(operationId) && messages.has(operationId) && notifications.has(operationId) &&
      counters.messageInsertCount === 1 && notifications.size === 1);
    messages.delete(operationId);
    notifications.delete(operationId);
    hiddenIds.delete(operationId);
    return true;
  }

  // A Node-only model control for offline tests, never an HTTP admin route.
  function makeReceiptInvisible({ operationId } = {}) {
    ensure(validId(operationId) && insertedIds.has(operationId) && messages.has(operationId));
    hiddenIds.add(operationId);
    return true;
  }

  function revokeProfessionalAccess({ organizationId } = {}) {
    ensure(organizationId === fixture.organizationId);
    revoked = true;
    return true;
  }

  function verifyAuthSession({ userId, sessionId } = {}) {
    ensure(userId === fixture.userId && validId(sessionId) && [...sessions.values()].some(session =>
      session.sessionId === sessionId && session.expiresAt > Math.floor(Date.now() / 1000)), 401, 'FIXTURE_SESSION_UNKNOWN');
    return true;
  }

  function close() { if (!disposed) { disposed = true; sessions.clear(); } }
  return Object.freeze({ fixture, handleRequest, snapshot, makeReceiptAbsent, makeReceiptInvisible,
    revokeProfessionalAccess, verifyAuthSession, close });
}

// This wrapper is source-only outside the existing GitHub Actions Ubuntu job.
// Importing this module never starts a server. Offline tests do not invoke it.
export async function startFixtureApi({ allowedOrigin } = {}) {
  exactLoopbackOrigin(allowedOrigin);
  ensure(process.platform === 'linux' && process.env.GITHUB_ACTIONS === 'true' &&
    process.env.NCC_SYNTHETIC_BROWSER_API === '1', 403, 'FIXTURE_CI_ONLY');
  const { createServer } = await import('node:http');
  const model = createFixtureModel({ allowedOrigin });
  const server = createServer({ maxHeaderSize: 16 * 1024 }, (request, reply) => {
    let size = 0;
    const chunks = [];
    let answered = false;
    function answer(body) {
      if (answered || reply.destroyed) return;
      answered = true;
      const result = model.handleRequest({ method: request.method, path: request.url,
        headers: request.headers, body });
      reply.writeHead(result.status, { ...result.headers, connection: 'close' });
      reply.end(result.body);
    }
    request.on('data', chunk => {
      if (answered) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        chunks.length = 0;
        answer('x'.repeat(MAX_BODY_BYTES + 1));
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      answer(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', () => { if (!reply.destroyed) reply.destroy(); });
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 1_000;
  server.maxRequestsPerSocket = 1000;
  server.on('clientError', (_error, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  let closing;
  const close = () => {
    if (!closing) {
      model.close();
      closing = new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    }
    return closing;
  };
  return Object.freeze({ origin: `http://127.0.0.1:${address.port}`, fixture: model.fixture,
    snapshot: model.snapshot, makeReceiptAbsent: model.makeReceiptAbsent,
    makeReceiptInvisible: model.makeReceiptInvisible, revokeProfessionalAccess: model.revokeProfessionalAccess,
    verifyAuthSession: model.verifyAuthSession, close });
}
