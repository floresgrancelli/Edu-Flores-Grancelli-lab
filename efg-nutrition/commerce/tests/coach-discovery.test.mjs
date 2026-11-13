import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCoachCards, renderCoachDirectory, createContactRequestController } from '../coach-discovery.mjs';

const coach = extra => ({ id: 'coach_demo', displayName: 'Perfil de ejemplo',
  published: true, recommended: true, coachOptIn: true, enabled: true,
  acceptingRequests: true, ...extra });

test('directory exposes only opted-in, published, recommended, available profiles', () => {
  for (const field of ['published', 'recommended', 'coachOptIn', 'enabled', 'acceptingRequests']) {
    assert.equal(publicCoachCards([coach({ [field]: false })]).length, 0);
  }
  assert.equal(publicCoachCards([coach(), coach()]).length, 1);
  assert.equal(publicCoachCards([coach({ id: '" onclick="bad' })]).length, 0);
});

test('public cards whitelist fields and never expose private email, quota or health records', () => {
  const rows = publicCoachCards([coach({ email: 'private@example.test', studentRecords: ['private'],
    payment_alias: 'private.alias', seatLimit: 20, description: 'Acompañamiento' })]);
  const output = JSON.stringify(rows);
  assert.ok(!output.includes('private')); assert.ok(!output.includes('seatLimit'));
  assert.equal(rows[0].description, 'Acompañamiento');
});

test('render escapes profile content, marks sponsorship, and has no payment CTA', () => {
  const html = renderCoachDirectory({ rows: [coach({ displayName: '<script>bad()</script>', sponsored: true })] });
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Patrocinado')); assert.ok(html.includes('Ingresar para solicitar contacto'));
  assert.ok(!html.includes('mailto:')); assert.ok(!html.includes('data-act="sendProof"'));
});

test('empty, loading and failed states do not pretend coaches or requests exist', () => {
  assert.ok(renderCoachDirectory().includes('no hay coaches disponibles'));
  assert.ok(renderCoachDirectory({ loading: true }).includes('role="status"'));
  assert.ok(renderCoachDirectory({ error: 'private provider details' }).includes('role="alert"'));
  assert.ok(!renderCoachDirectory({ error: 'secret' }).includes('secret'));
});

function controller(transport, getSession = async () => ({ user: { id: 'prospect_demo' } })) {
  return createContactRequestController({ transport, getSession, createRequestId: () => 'request_demo' });
}
const confirmed = p => ({ ...p, persisted: true, status: 'pending' });

test('contact requires verified session adapter and explicit contact consent', async () => {
  let calls = 0; const c = controller(async p => { calls++; return confirmed(p); });
  await assert.rejects(c.request({ coachId: 'coach_demo', contactConsent: false }), /CONSENT_REQUIRED/);
  await assert.rejects(controller(async p => confirmed(p), async () => null)
    .request({ coachId: 'coach_demo', contactConsent: true }), /SIGN_IN_REQUIRED/);
  assert.equal(calls, 0);
});

test('repeated/concurrent clicks send one request with no health or purchase payload', async () => {
  const payloads = [];
  const c = controller(async p => { payloads.push(p); await new Promise(resolve => setTimeout(resolve, 5)); return confirmed(p); });
  const args = { coachId: 'coach_demo', contactConsent: true, diary: 'must not send' };
  const results = await Promise.all([c.request(args), c.request(args)]);
  await c.request(args);
  assert.equal(payloads.length, 1); assert.deepEqual(results[0], results[1]);
  assert.deepEqual(Object.keys(payloads[0]).sort(), ['coachId', 'contactConsent', 'requestId']);
});

test('network errors retry same id and unconfirmed or mismatched response is not success', async () => {
  const ids = []; let attempt = 0;
  const c = controller(async p => { ids.push(p.requestId); if (++attempt === 1) throw Error('OFFLINE'); return confirmed(p); });
  const args = { coachId: 'coach_demo', contactConsent: true };
  await assert.rejects(c.request(args), /OFFLINE/); await c.request(args);
  assert.equal(ids[0], ids[1]);
  for (const response of [{ persisted: false }, { requestId: 'wrong' }, { coachId: 'wrong' }, { status: 'unknown' }]) {
    await assert.rejects(controller(async p => ({ ...confirmed(p), ...response })).request(args), /NOT_CONFIRMED/);
  }
});

test('session switch during response prevents showing another account contact result', async () => {
  let id = 'person_a';
  const c = controller(async p => { id = 'person_b'; return confirmed(p); }, async () => ({ user: { id } }));
  await assert.rejects(c.request({ coachId: 'coach_demo', contactConsent: true }), /SESSION_CHANGED/);
});
