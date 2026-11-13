import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessService, emptyState, DAY, PACKAGE_NAME } from '../access-service.mjs';

// Serial, rollback-capable IN-MEMORY reference. Not production persistence.
function setup() {
  let state = emptyState(), tail = Promise.resolve(), at = 1_800_000_000_000;
  const purchases = new Map();
  state.users = [ ['admin', ['admin']], ['coach', ['coach']], ['other', ['coach']],
    ...Array.from({ length: 22 }, (_, i) => [`s${i}`, ['student']]) ]
    .map(([id, roles]) => ({ id, roles, enabled: true }));
  const repo = { transaction(fn) {
    const run = tail.then(async () => {
      const copy = structuredClone(state);
      const result = await fn(copy); state = copy; return result;
    }); tail = run.catch(() => {}); return run;
  } };
  const service = createAccessService({ repo, clock: () => at,
    verifyPlay: async token => {
      if (!purchases.has(token)) throw new Error('GOOGLE_UNAVAILABLE');
      return structuredClone(purchases.get(token));
    } });
  const issue = (kind, extra = {}) => service.issueCode('admin', {
    kind, redeemBy: at + DAY, ...extra,
  });
  const purchase = (token, productId, extra = {}) => purchases.set(token, {
    packageName: PACKAGE_NAME, accountId: 'coach', productId,
    state: productId.endsWith('monthly') ? 'ACTIVE' : 'PURCHASED',
    expiresAt: at + 30 * DAY, acknowledged: true, ...extra,
  });
  return { service, issue, purchase, repo, state: () => structuredClone(state),
    advance: ms => { at += ms; } };
}

test('7-day trial shares deadline with one student, expires without billing or deleting links', async () => {
  const f = setup();
  const { code } = await f.issue('trial_pair');
  const start = await f.service.redeemCode('coach', code);
  assert.equal(start.access.seats, 1);
  f.advance(2 * DAY);
  const student = await f.service.redeemCode('s0', start.studentCode);
  assert.equal(student.endsAt, start.endsAt);
  assert.equal(student.access.student, true);
  assert.equal((await f.service.getAccess('coach')).used, 1);
  f.advance(5 * DAY);
  assert.equal((await f.service.getAccess('coach')).seats, 0);
  assert.equal((await f.service.getAccess('s0')).student, false);
  assert.equal(f.state().memberships.length, 1);
  assert.equal(f.state().purchases.length, 0);
});

test('single-use codes are atomic under concurrent redemptions', async () => {
  const f = setup(), { code } = await f.issue('student_gift');
  const results = await Promise.allSettled([
    f.service.redeemCode('s0', code), f.service.redeemCode('s1', code),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.state().grants.length, 1);
  assert.ok(!JSON.stringify(f.state()).includes(code));
});

test('admin authorization, account binding, revocation and expiry', async () => {
  const f = setup();
  await assert.rejects(f.service.issueCode('coach', { kind: 'trial_pair' }), /ROLE_REQUIRED/);
  const { code } = await f.issue('student_gift', { targetId: 's0' });
  await assert.rejects(f.service.redeemCode('s1', code), /CODE_UNAVAILABLE/);
  await f.service.revokeCode('admin', code);
  await assert.rejects(f.service.redeemCode('s0', code), /CODE_UNAVAILABLE/);
  const next = await f.issue('student_gift'); f.advance(DAY);
  await assert.rejects(f.service.redeemCode('s0', next.code), /CODE_UNAVAILABLE/);
});

test('no trial stacking, role escalation, or second student through same code', async () => {
  const f = setup(), { code } = await f.issue('trial_pair');
  await assert.rejects(f.service.redeemCode('s0', code), /ROLE_REQUIRED/);
  const trial = await f.service.redeemCode('coach', code);
  const repeat = await f.issue('trial_pair');
  await assert.rejects(f.service.redeemCode('coach', repeat.code), /TRIAL_ALREADY_USED/);
  await f.service.redeemCode('s0', trial.studentCode);
  await assert.rejects(f.service.redeemCode('s1', trial.studentCode), /CODE_UNAVAILABLE/);
});

test('permanent coach gift includes selected free seats; student gift survives time', async () => {
  const f = setup();
  const c = await f.issue('coach_gift', { seats: 20 });
  await f.service.redeemCode('coach', c.code);
  const a = await f.issue('student_gift'); await f.service.redeemCode('s0', a.code);
  await f.service.linkStudent('coach', 's0'); f.advance(400 * DAY);
  assert.equal((await f.service.getAccess('coach')).seats, 20);
  assert.equal((await f.service.getAccess('s0')).student, true);
});

test('temporary courtesy expires, independent permanent activation remains', async () => {
  const f = setup();
  const c = await f.issue('coach_gift', { seats: 10, durationDays: 1 });
  await f.service.redeemCode('coach', c.code);
  f.purchase('activation', 'ncc_coach_activation');
  await f.service.syncPurchase('coach', 'activation'); f.advance(DAY);
  const access = await f.service.getAccess('coach');
  assert.equal(access.coach, true); assert.equal(access.seats, 0);
});

test('verified purchase grants exactly 20 seats automatically and replay never adds seats', async () => {
  const f = setup(); f.purchase('activation', 'ncc_coach_activation');
  await f.service.syncPurchase('coach', 'activation');
  f.purchase('twenty', 'ncc_coach_20_monthly');
  for (let i = 0; i < 3; i++) {
    assert.equal((await f.service.syncPurchase('coach', 'twenty')).access.seats, 20);
  }
  assert.equal(f.state().purchases.length, 2);
});

test('pending subscription and capacity without coach activation grant no usable seats', async () => {
  const f = setup(); f.purchase('twenty', 'ncc_coach_20_monthly');
  assert.equal((await f.service.syncPurchase('coach', 'twenty')).access.seats, 0);
  f.purchase('activation', 'ncc_coach_activation'); await f.service.syncPurchase('coach', 'activation');
  f.purchase('twenty', 'ncc_coach_20_monthly', { state: 'PENDING' });
  assert.equal((await f.service.syncPurchase('coach', 'twenty')).access.seats, 0);
});

test('wrong package, owner, product and Google outage do not grant access', async () => {
  const f = setup();
  for (const extra of [{ packageName: 'wrong' }, { accountId: 'other' }, { productId: 'unknown' }]) {
    f.purchase('bad', 'ncc_coach_activation', extra);
    await assert.rejects(f.service.syncPurchase('coach', 'bad'), /INVALID_PURCHASE/);
  }
  await assert.rejects(f.service.syncPurchase('coach', 'missing'), /GOOGLE_UNAVAILABLE/);
  assert.equal(f.state().grants.length, 0);
});

test('refund revokes purchased activation, pending acknowledgments are recorded for server worker', async () => {
  const f = setup(); f.purchase('activation', 'ncc_student_activation', { accountId: 's0', acknowledged: false });
  const result = await f.service.syncPurchase('s0', 'activation');
  assert.equal(result.acknowledgeRequired, true); assert.equal(result.access.student, true);
  f.purchase('activation', 'ncc_student_activation', { accountId: 's0', state: 'REVOKED' });
  assert.equal((await f.service.syncPurchase('s0', 'activation')).access.student, false);
});

test('subscription cancellation retains access until paid expiry, hold blocks capacity', async () => {
  const f = setup(); f.purchase('activation', 'ncc_coach_activation');
  await f.service.syncPurchase('coach', 'activation');
  f.purchase('plan', 'ncc_coach_20_monthly', { state: 'CANCELED' });
  assert.equal((await f.service.syncPurchase('coach', 'plan')).access.seats, 20);
  f.advance(30 * DAY);
  assert.equal((await f.service.getAccess('coach')).seats, 0);
  f.purchase('plan', 'ncc_coach_20_monthly', { state: 'ON_HOLD' });
  assert.equal((await f.service.syncPurchase('coach', 'plan')).access.seats, 0);
});

test('renewal extends expiry; linked upgrade replaces capacity instead of adding', async () => {
  const f = setup(); f.purchase('activation', 'ncc_coach_activation');
  await f.service.syncPurchase('coach', 'activation');
  f.purchase('old', 'ncc_coach_10_monthly'); await f.service.syncPurchase('coach', 'old');
  f.purchase('new', 'ncc_coach_20_monthly', { linkedToken: 'old' });
  assert.equal((await f.service.syncPurchase('coach', 'new')).access.seats, 20);
  await assert.rejects(f.service.syncPurchase('coach', 'old'), /TOKEN_SUPERSEDED/);
  f.advance(29 * DAY); f.purchase('new', 'ncc_coach_20_monthly');
  await f.service.syncPurchase('coach', 'new'); f.advance(2 * DAY);
  assert.equal((await f.service.getAccess('coach')).seats, 20);
});

test('concurrent student links never exceed 20; archiving releases one seat', async () => {
  const f = setup(), c = await f.issue('coach_gift', { seats: 20 });
  await f.service.redeemCode('coach', c.code);
  for (let i = 0; i < 21; i++) {
    const x = await f.issue('student_gift'); await f.service.redeemCode(`s${i}`, x.code);
  }
  const results = await Promise.allSettled(Array.from({ length: 21 }, (_, i) => f.service.linkStudent('coach', `s${i}`)));
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 20);
  assert.equal((await f.service.getAccess('coach')).used, 20);
  await f.service.archiveStudent('coach', 's0');
  await f.service.linkStudent('coach', 's20');
  assert.equal((await f.service.getAccess('coach')).used, 20);
  assert.equal((await f.service.getAccess('s0')).student, true);
});

test('gift and paid packages use maximum, not sum; downgrade preserves links', async () => {
  const f = setup(), c = await f.issue('coach_gift', { seats: 1 });
  await f.service.redeemCode('coach', c.code);
  f.purchase('plan', 'ncc_coach_20_monthly');
  assert.equal((await f.service.syncPurchase('coach', 'plan')).access.seats, 20);
  await f.repo.transaction(s => { for (let i = 0; i < 12; i++) s.memberships.push({ coachId: 'coach', studentId: `s${i}`, active: true }); });
  f.purchase('lower', 'ncc_coach_10_monthly', { linkedToken: 'plan' });
  const result = await f.service.syncPurchase('coach', 'lower');
  assert.equal(result.access.seats, 10); assert.equal(result.access.overCapacity, true);
  assert.equal(f.state().memberships.length, 12);
});
