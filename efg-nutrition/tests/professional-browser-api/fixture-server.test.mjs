// Offline model/request-handler tests only. These tests do not start HTTP,
// launch a browser, load the SDK, prove CORS in a browser, or validate SQL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createFixtureModel, SYNTHETIC_PUBLIC_ANON_KEY } from './fixture-server.mjs';

const ORIGIN = 'http://127.0.0.1:45671';
const COLUMNS = 'id,student_id,coach_id,sender_id,body,created_at,read_at';
const OPERATION = '60000000-0000-4000-8000-000000000006';
const OTHER = '70000000-0000-4000-8000-000000000007';
const SHA256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bodyOf = result => result.body === '' ? null : JSON.parse(result.body);
const route = (path, query) => path + '?' + new URLSearchParams(query).toString();

function harness() {
  const model = createFixtureModel({ allowedOrigin: ORIGIN });
  let token;
  function request(method, path, body, extraHeaders = {}) {
    return model.handleRequest({ method, path, body: body === undefined ? '' : JSON.stringify(body),
      headers: { origin: ORIGIN, apikey: model.fixture.anonKey, 'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}), ...extraHeaders } });
  }
  function login() {
    const response = request('POST', '/auth/v1/token?grant_type=password', {
      email: model.fixture.email, password: model.fixture.password, gotrue_meta_security: {},
    });
    assert.equal(response.status, 200);
    const result = bodyOf(response);
    token = result.access_token;
    return result;
  }
  function message(body = 'Synthetic outbound only.', id = OPERATION) {
    return { id, student_id: model.fixture.studentId, coach_id: model.fixture.userId,
      sender_id: model.fixture.userId, body };
  }
  function insert(value = message()) {
    return request('POST', route('/rest/v1/efg_messages', { select: COLUMNS }), value,
      { accept: 'application/vnd.pgrst.object+json', prefer: 'return=representation' });
  }
  function receipt(id = OPERATION, query = {}) {
    return request('GET', route('/rest/v1/efg_messages', { select: COLUMNS,
      student_id: `eq.${model.fixture.studentId}`, coach_id: `eq.${model.fixture.userId}`, id: `eq.${id}`, ...query }),
    undefined, { accept: 'application/json' });
  }
  function messages() {
    return request('GET', route('/rest/v1/efg_messages', { select: COLUMNS,
      student_id: `eq.${model.fixture.studentId}`, coach_id: `eq.${model.fixture.userId}`,
      order: 'created_at.desc,id.desc', limit: '200' }));
  }
  function read(ids, date = '2026-11-07T12:30:00.000Z', overrides = {}) {
    return request('PATCH', route('/rest/v1/efg_messages', { select: COLUMNS,
      student_id: `eq.${model.fixture.studentId}`, coach_id: `eq.${model.fixture.userId}`,
      sender_id: `eq.${model.fixture.studentId}`, read_at: 'is.null', id: `in.(${ids.join(',')})`, ...overrides }),
    { read_at: date }, { prefer: 'return=representation' });
  }
  return { model, request, login, message, insert, receipt, messages, read };
}

test('fixture is explicit, synthetic, detached, and has only agreed public metadata', () => {
  const { model } = harness();
  assert.equal(model.fixture.anonKey, SYNTHETIC_PUBLIC_ANON_KEY);
  assert.match(model.fixture.email, /@example\.invalid$/);
  assert.match(model.fixture.password, /not-a-credential/);
  assert.deepEqual(Object.keys(model.fixture).sort(), ['anonKey', 'email', 'organizationId', 'password', 'studentId', 'userId']);
  assert.equal(model.snapshot().messageInsertCount, 0);
  assert.equal(model.snapshot().inboundUnreadIds.length, 1);
});

test('allowedOrigin is literal canonical IPv4 loopback with an explicit dynamic port', () => {
  for (const allowedOrigin of [undefined, '*', 'null', 'http://localhost:3000', 'http://[::1]:3000',
    'https://127.0.0.1:3000', 'http://127.0.0.1', 'http://127.0.0.1:80', 'http://127.0.0.1:0',
    'http://127.0.0.1:65536', 'http://127.0.0.1:03000', 'http://127.0.0.1:3000/',
    'http://127.0.0.1:3000?x=1', 'http://a@127.0.0.1:3000', 'http://127.0.0.1:3000#x',
    'http://127.0.0.1.example.invalid:3000']) {
    assert.throws(() => createFixtureModel({ allowedOrigin }));
  }
});

test('preflight allows only requested SDK headers, method, and exact origin', () => {
  const { model } = harness();
  const requested = 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile';
  const result = model.handleRequest({ method: 'OPTIONS', path: '/rest/v1/efg_messages?select=' + COLUMNS,
    headers: { origin: ORIGIN, 'access-control-request-method': 'POST', 'access-control-request-headers': requested } });
  assert.equal(result.status, 204);
  assert.equal(result.headers['access-control-allow-origin'], ORIGIN);
  assert.equal(result.headers['access-control-allow-methods'], 'POST');
  assert.equal(result.headers['access-control-allow-credentials'], undefined);
  assert.equal(result.headers['access-control-max-age'], '0');
  assert.equal(result.body, '');
  assert.deepEqual(model.snapshot().cors, { preflightRequests: 1, optionsAccepted: 1, originRejected: 0 });
});

test('foreign, missing, duplicate, and malformed origins never receive an ACAO header', () => {
  const { model } = harness();
  for (const headers of [{}, { origin: 'http://127.0.0.1:45672' }, { origin: '*' },
    { origin: 'https://outside.example.invalid' }, { origin: ORIGIN, Origin: ORIGIN },
    { origin: [ORIGIN] }, { origin: ORIGIN + '\r\n' }]) {
    const result = model.handleRequest({ method: 'GET', path: '/auth/v1/user', headers });
    assert.equal(result.status, 403);
    assert.equal(result.headers['access-control-allow-origin'], undefined);
  }
  assert.equal(model.snapshot().cors.originRejected, 7);
});

test('preflight rejects unknown or duplicate headers, wrong methods, body and routes', () => {
  const { model } = harness();
  const base = { method: 'OPTIONS', path: '/auth/v1/user', headers: { origin: ORIGIN, 'access-control-request-method': 'GET' } };
  for (const changes of [
    { headers: { ...base.headers, 'access-control-request-headers': 'x-admin' } },
    { headers: { ...base.headers, 'access-control-request-headers': 'authorization,Authorization' } },
    { headers: { ...base.headers, 'access-control-request-method': 'DELETE' } },
    { body: '{}' }, { path: '/admin/reset' }, { path: '/auth/v1/user?admin=true' },
  ]) assert.equal(model.handleRequest({ ...base, ...changes }).status, 403);
  assert.equal(model.snapshot().cors.optionsAccepted, 0);
});

test('target allowlist rejects normalized paths, absolute URLs, duplicated or unexpected query keys', () => {
  const h = harness(); h.login();
  for (const path of ['/auth/v1/x/../user', '/auth/v1/%2e/user', '/auth/v1/%2e%2e/user',
    '/auth//v1/user', '/auth/v1/\tuser', '/auth/v1/\\user', '//127.0.0.1/auth/v1/user',
    'http://127.0.0.1/auth/v1/user', '/auth/v1/user#x', '/auth/v1/user?x=1',
    '/auth/v1/user?x=1&x=2', '/admin/snapshot', '/rest/v1/rpc/admin_reset']) {
    assert.ok(h.request('GET', path).status >= 400, path);
  }
  assert.equal(h.request('DELETE', '/auth/v1/user').status, 405);
  assert.equal(h.request('GET', '/auth/v1/' + 'a'.repeat(16 * 1024)).status, 400);
});

test('malformed, nonobject, wrong content type and oversized JSON fail closed', () => {
  const { model } = harness();
  const request = { method: 'POST', path: '/auth/v1/token?grant_type=password',
    headers: { origin: ORIGIN, apikey: model.fixture.anonKey, 'content-type': 'application/json' } };
  for (const body of ['{', 'null', '[]', '1', '"x"']) assert.equal(model.handleRequest({ ...request, body }).status, 400);
  assert.equal(model.handleRequest({ ...request, body: 'x'.repeat(32 * 1024 + 1) }).status, 413);
  assert.equal(model.handleRequest({ ...request, body: {}, }).status, 413);
  assert.equal(model.handleRequest({ ...request, body: '{}', headers: { ...request.headers, 'content-type': 'text/plain' } }).status, 415);
});

test('fictitious login returns parseable ephemeral session and authenticated getUser', () => {
  const h = harness();
  const session = h.login();
  const [header, payload] = session.access_token.split('.').map(part => Buffer.from(part, 'base64url').toString());
  assert.equal(JSON.parse(header).alg, 'none');
  const claims = JSON.parse(payload);
  assert.equal(claims.sub, h.model.fixture.userId);
  assert.equal(claims.synthetic_fixture, true);
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(h.model.verifyAuthSession({ userId: claims.sub, sessionId: claims.session_id }), true);
  const user = bodyOf(h.request('GET', '/auth/v1/user'));
  assert.equal(user.id, h.model.fixture.userId);
  assert.equal(user.email, h.model.fixture.email);
  assert.equal(user.app_metadata.synthetic_fixture, true);
});

test('fixture rejects unknown credentials, key, token, grants and token copying between models', () => {
  const h = harness();
  assert.equal(h.request('GET', '/auth/v1/user').status, 401);
  assert.equal(h.request('POST', '/auth/v1/token?grant_type=password', { email: h.model.fixture.email, password: 'wrong' }).status, 400);
  const session = h.login();
  assert.equal(h.request('GET', '/auth/v1/user', undefined, { apikey: 'wrong' }).status, 401);
  assert.equal(h.request('GET', '/auth/v1/user', undefined, { authorization: 'Bearer fake' }).status, 401);
  assert.equal(h.request('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token }).status, 400);
  const other = harness();
  assert.equal(other.request('GET', '/auth/v1/user', undefined, { authorization: `Bearer ${session.access_token}` }).status, 401);
});

test('logout invalidates only its current fake session and preserves fixture data', () => {
  const h = harness();
  const first = h.login();
  h.insert();
  const second = h.login();
  assert.equal(h.request('POST', '/auth/v1/logout?scope=local').status, 204);
  assert.equal(h.request('GET', '/auth/v1/user').status, 401);
  assert.equal(h.request('GET', '/auth/v1/user', undefined, { authorization: `Bearer ${first.access_token}` }).status, 200);
  const secondClaims = JSON.parse(Buffer.from(second.access_token.split('.')[1], 'base64url'));
  assert.throws(() => h.model.verifyAuthSession({ userId: h.model.fixture.userId, sessionId: secondClaims.session_id }));
  assert.equal(h.model.snapshot({ operationId: OPERATION }).messageRowsForOperation, 1);
});

test('profile remains personal student in separate org while context offers synthetic coach org', () => {
  const h = harness(); h.login();
  const profile = bodyOf(h.request('GET', route('/rest/v1/efg_profiles', { select: 'user_id,role,organization_id,active',
    user_id: `eq.${h.model.fixture.userId}` }), undefined, { accept: 'application/vnd.pgrst.object+json' }));
  assert.equal(profile.role, 'student');
  assert.notEqual(profile.organization_id, h.model.fixture.organizationId);
  assert.equal(h.model.snapshot().originalProfileHash, SHA256(profile));
  const contexts = bodyOf(h.request('POST', '/rest/v1/rpc/ncc_dual_workspace_contexts_v1', {}));
  assert.equal(contexts.student_context.organization_id, profile.organization_id);
  assert.equal(contexts.coach_contexts[0].id, h.model.fixture.organizationId);
  assert.equal(contexts.coach_contexts[0].is_test, true);
  const roster = bodyOf(h.request('POST', '/rest/v1/rpc/ncc_pilot_workspace_roster_v1', { p_org: h.model.fixture.organizationId }));
  assert.equal(roster[0].user_id, h.model.fixture.studentId);
  assert.deepEqual(bodyOf(h.request('POST', '/rest/v1/rpc/efg_coach_shared_student_recipes', { p_student: h.model.fixture.studentId })), []);
});

test('insert preserves client UUID, returns object, and readback is exact id plus pair', () => {
  const h = harness(); h.login();
  const result = h.insert();
  assert.equal(result.status, 201);
  const row = bodyOf(result);
  assert.equal(row.id, OPERATION);
  assert.equal(row.body, h.message().body);
  assert.equal(row.sender_id, h.model.fixture.userId);
  assert.deepEqual(bodyOf(h.receipt()), [row]);
  const snapshot = h.model.snapshot({ operationId: OPERATION });
  assert.equal(snapshot.messageInsertCount, 1);
  assert.equal(snapshot.messageRowsForOperation, 1);
  assert.equal(snapshot.notificationRowsForOperation, 1);
  assert.equal(snapshot.messageDigest, SHA256(['ncc-message-v1', row.student_id, row.coach_id, row.sender_id, row.body]));
  assert.deepEqual(snapshot.messageIdentity, { id: OPERATION, studentId: row.student_id, coachId: row.coach_id, senderId: row.sender_id });
  assert.deepEqual(snapshot.receiptReads, [{ id: OPERATION, studentId: row.student_id, coachId: row.coach_id }]);
  assert.equal(snapshot.mutationDispatches.sendMessage, 1);
});

test('duplicate UUID is rejected without second insert or synthetic notification', () => {
  const h = harness(); h.login(); h.insert();
  const duplicate = h.insert(h.message('Changed synthetic text.'));
  assert.equal(duplicate.status, 409);
  assert.equal(bodyOf(duplicate).code, '23505');
  assert.equal(bodyOf(h.receipt())[0].body, h.message().body);
  const snapshot = h.model.snapshot({ operationId: OPERATION });
  assert.equal(snapshot.messageInsertCount, 1);
  assert.equal(snapshot.notificationRowsForOperation, 1);
  assert.equal(snapshot.mutationDispatches.sendMessage, 2);
  assert.equal(snapshot.counters.duplicateMessageInserts, 1);
});

test('insert rejects missing UUID, foreign pair/sender, empty/large body and extra columns', () => {
  const h = harness(); h.login();
  for (const mutation of [ { id: undefined }, { student_id: OTHER }, { coach_id: OTHER }, { sender_id: h.model.fixture.studentId },
    { body: '' }, { body: ' padded ' }, { body: 'x'.repeat(2001) }, { admin: true } ]) {
    assert.equal(h.insert({ ...h.message(), ...mutation }).status, 400);
  }
  assert.equal(h.model.snapshot().messageInsertCount, 0);
});

test('readback fails closed for wrong pair, missing pair or unsupported sender filter', () => {
  const h = harness(); h.login(); h.insert();
  assert.equal(h.receipt(OPERATION, { student_id: `eq.${OTHER}` }).status, 400);
  assert.equal(h.receipt(OPERATION, { coach_id: `eq.${OTHER}` }).status, 400);
  assert.equal(h.receipt(OPERATION, { student_id: '' }).status, 400);
  assert.equal(h.receipt(OPERATION, { sender_id: `eq.${h.model.fixture.userId}` }).status, 404);
  assert.deepEqual(bodyOf(h.receipt(OTHER)), []);
  assert.equal(h.model.snapshot().messageInsertCount, 1);
});

test('message list includes seeded inbound and inserted outbound without fabricating receipts', () => {
  const h = harness(); h.login(); h.insert();
  const rows = bodyOf(h.messages());
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, OPERATION);
  assert.equal(rows[1].sender_id, h.model.fixture.studentId);
  assert.equal(rows[1].read_at, null);
});

test('absence is Node-only, preserves cumulative insertion history, and cannot permit duplicate UUID', () => {
  const h = harness(); h.login(); h.insert();
  assert.throws(() => h.model.makeReceiptAbsent({ operationId: OTHER }));
  assert.equal(h.model.makeReceiptAbsent({ operationId: OPERATION }), true);
  assert.deepEqual(bodyOf(h.receipt()), []);
  const snapshot = h.model.snapshot({ operationId: OPERATION });
  assert.equal(snapshot.messageRowsForOperation, 0);
  assert.equal(snapshot.notificationRowsForOperation, 0);
  assert.equal(snapshot.messageInsertCount, 1);
  assert.equal(snapshot.messageDigest, null);
  assert.equal(h.insert().status, 409);
  assert.equal(h.model.snapshot().messageInsertCount, 1);
  assert.equal(h.request('POST', '/admin/makeReceiptAbsent', { operationId: OPERATION }).status, 404);
});

test('invisibility differs from absence: GET is empty while row and notification remain', () => {
  const h = harness(); h.login(); h.insert();
  h.model.makeReceiptInvisible({ operationId: OPERATION });
  assert.deepEqual(bodyOf(h.receipt()), []);
  const snapshot = h.model.snapshot({ operationId: OPERATION });
  assert.equal(snapshot.messageRowsForOperation, 1);
  assert.equal(snapshot.notificationRowsForOperation, 1);
  assert.equal(snapshot.messageInsertCount, 1);
  assert.equal(bodyOf(h.messages()).length, 1);
});

test('revocation empties professional contexts and denies ops without removing receipt or personal profile', () => {
  const h = harness(); h.login(); h.insert();
  const before = h.model.snapshot({ operationId: OPERATION });
  assert.throws(() => h.model.revokeProfessionalAccess({ organizationId: OTHER }));
  h.model.revokeProfessionalAccess({ organizationId: h.model.fixture.organizationId });
  assert.deepEqual(bodyOf(h.request('POST', '/rest/v1/rpc/ncc_dual_workspace_contexts_v1', {})).coach_contexts, []);
  assert.equal(h.receipt().status, 403);
  assert.equal(h.insert(h.message('Another.', OTHER)).status, 403);
  assert.equal(h.request('POST', '/rest/v1/rpc/efg_set_coach_alias', { p_alias: 'ncc.synthetic.alias' }).status, 403);
  const after = h.model.snapshot({ operationId: OPERATION });
  assert.equal(after.messageRowsForOperation, 1);
  assert.equal(after.messageInsertCount, 1);
  assert.equal(after.originalProfileHash, before.originalProfileHash);
});

test('alias returns boolean and observed hash, not an invented per-operation receipt', () => {
  const h = harness(); h.login();
  const before = h.model.snapshot();
  const result = h.request('POST', '/rest/v1/rpc/efg_set_coach_alias', { p_alias: 'ncc.synthetic.alias' });
  assert.equal(result.status, 200);
  assert.equal(bodyOf(result), true);
  const after = h.model.snapshot({ operationId: OPERATION });
  assert.equal(before.aliasHash, SHA256(null));
  assert.equal(after.aliasHash, SHA256('ncc.synthetic.alias'));
  assert.equal(after.messageRowsForOperation, 0);
  assert.equal(after.mutationDispatches.setAlias, 1);
  assert.equal(after.originalProfileHash, before.originalProfileHash);
  const organization = bodyOf(h.request('GET', route('/rest/v1/efg_organizations', {
    select: 'id,coach_id,payment_alias', id: `eq.${h.model.fixture.organizationId}`, coach_id: `eq.${h.model.fixture.userId}`,
  }), undefined, { accept: 'application/vnd.pgrst.object+json' }));
  assert.equal(organization.payment_alias, 'ncc.synthetic.alias');
});

test('read_at updates only reserved unread inbound IDs and no outbound/foreign/unreserved row', () => {
  const h = harness(); h.login(); h.insert();
  const ids = h.model.snapshot().inboundUnreadIds;
  const result = h.read([...ids, OPERATION, OTHER]);
  assert.equal(result.status, 200);
  assert.deepEqual(bodyOf(result).map(row => row.id), ids);
  assert.equal(bodyOf(h.receipt())[0].read_at, null);
  assert.equal(h.model.snapshot({ readIds: ids }).reservedReadIdsUpdated, 1);
  assert.deepEqual(h.model.snapshot().inboundUnreadIds, []);
  assert.deepEqual(bodyOf(h.read(ids)), []);
  assert.equal(h.model.snapshot().mutationDispatches.markRead, 2);
});

test('read_at rejects duplicate IDs, wrong sender/pair, invalid dates and broad PATCH', () => {
  const h = harness(); h.login();
  const ids = h.model.snapshot().inboundUnreadIds;
  assert.equal(h.read([...ids, ...ids]).status, 400);
  assert.equal(h.read(ids, 'bad-date').status, 400);
  assert.equal(h.read(ids, undefined, { sender_id: `eq.${h.model.fixture.userId}` }).status, 400);
  assert.equal(h.read(ids, undefined, { coach_id: `eq.${OTHER}` }).status, 400);
  assert.equal(h.read(ids, undefined, { read_at: 'not.is.null' }).status, 400);
  assert.equal(h.read(ids, undefined, { id: undefined }).status, 400);
  assert.equal(h.model.snapshot({ readIds: ids }).reservedReadIdsUpdated, 0);
});

test('the request-target cap accommodates the public client maximum of 200 reserved UUIDs', () => {
  const h = harness(); h.login();
  const ids = Array.from({ length: 200 }, (_, index) => `80000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
  const result = h.read(ids);
  assert.equal(result.status, 200);
  assert.deepEqual(bodyOf(result), []);
  assert.equal(h.model.snapshot({ readIds: ids }).reservedReadIdsUpdated, 0);
});

test('snapshot contains detached metadata only, not messages, aliases, passwords or sessions', () => {
  const h = harness(); const session = h.login(); h.insert();
  h.request('POST', '/rest/v1/rpc/efg_set_coach_alias', { p_alias: 'ncc.synthetic.alias' });
  const snapshot = h.model.snapshot({ operationId: OPERATION });
  const text = JSON.stringify(snapshot);
  for (const secretOrContent of [session.access_token, session.refresh_token, h.model.fixture.password,
    h.model.fixture.email, h.message().body, 'ncc.synthetic.alias']) assert.ok(!text.includes(secretOrContent));
  snapshot.mutationDispatches.sendMessage = 999;
  snapshot.cors.optionsAccepted = 999;
  assert.equal(h.model.snapshot().mutationDispatches.sendMessage, 1);
  assert.equal(h.model.snapshot().cors.optionsAccepted, 0);
});

test('errors never echo submitted credentials, payload, tokens, or stack traces', () => {
  const h = harness(); h.login();
  const result = h.insert({ ...h.message(), admin: 'synthetic-sensitive-marker' });
  assert.equal(result.status, 400);
  assert.ok(!result.body.includes('synthetic-sensitive-marker'));
  assert.ok(!result.body.includes('stack'));
  assert.deepEqual(Object.keys(bodyOf(result)).sort(), ['code', 'message']);
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('model teardown is idempotent, invalidates auth and never starts sockets', () => {
  const h = harness(); const session = h.login();
  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url'));
  h.model.close(); h.model.close();
  assert.throws(() => h.model.verifyAuthSession({ userId: h.model.fixture.userId, sessionId: claims.session_id }));
  assert.equal(h.request('GET', '/auth/v1/user').status, 503);
  const snapshot = h.model.snapshot();
  assert.equal(snapshot.counters.requests, snapshot.counters.responses);
});
