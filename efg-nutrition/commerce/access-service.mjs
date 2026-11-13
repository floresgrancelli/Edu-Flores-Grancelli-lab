// Server only. No HTTP routes or production database adapter are enabled here.
import { randomBytes, createHash } from 'node:crypto';

export const DAY = 86_400_000;
export const PACKAGE_NAME = 'ar.com.nutricionconciencia.app';
// Proposed IDs: must be created and tested in Play Console before release.
export const PRODUCTS = Object.freeze({
  ncc_student_activation: { role: 'student', usd: 10 },
  ncc_coach_activation: { role: 'coach', usd: 10 },
  ncc_coach_10_monthly: { seats: 10, usd: 29 },
  ncc_coach_20_monthly: { seats: 20, usd: 49 },
  ncc_coach_50_monthly: { seats: 50, usd: 95 },
});
export const emptyState = () => ({ users: [], codes: [], grants: [], purchases: [],
  memberships: [], trialUsers: [], audit: [] });
const fail = code => { throw new Error(code); };
const digest = value => createHash('sha256').update(value).digest('hex');
const newCode = () => `NCC-${randomBytes(24).toString('hex')}`;
const live = (g, now) => !g.revoked && g.startsAt <= now &&
  (g.endsAt === null || g.endsAt > now);
const user = (s, id) => s.users.find(u => u.id === id && u.enabled) || fail('USER_DISABLED');
const role = (s, id, name) => user(s, id).roles.includes(name) || fail('ROLE_REQUIRED');
const finiteTime = value => Number.isSafeInteger(value) && value >= 0;
const positiveSeats = n => Number.isInteger(n) && n > 0 && n <= 10_000;
const grant = (s, data) => s.grants.push({ revoked: false, ...data });

export function accessFor(s, userId, now) {
  const u = user(s, userId);
  const grants = s.grants.filter(g => g.userId === userId && live(g, now));
  const student = u.roles.includes('student') && grants.some(g => g.role === 'student');
  const coach = u.roles.includes('coach') && grants.some(g => g.role === 'coach');
  const seats = coach ? Math.max(0, ...grants.map(g => g.seats || 0)) : 0;
  const used = s.memberships.filter(m => m.coachId === userId && m.active).length;
  return { student, coach, seats, used, available: Math.max(0, seats - used),
    overCapacity: used > seats };
}

/**
 * repo.transaction(fn) MUST be durable, serializable and roll back on errors.
 * actorId is supplied by a verified server session, never a client body field.
 * verifyPlay performs Google API lookup and server account mapping; the client
 * supplies only a token, never price, seats, role, state, expiry or accountId.
 */
export function createAccessService({ repo, verifyPlay, clock = Date.now }) {
  if (typeof repo?.transaction !== 'function') fail('TRANSACTION_ADAPTER_REQUIRED');
  const now = () => { const t = clock(); if (!finiteTime(t)) fail('INVALID_CLOCK'); return t; };
  const audit = (s, actorId, action, at) => s.audit.push({ actorId, action, at });
  const admin = (s, id) => role(s, id, 'admin');

  return {
    async issueCode(actorId, { kind, targetId = null, seats = null,
      durationDays = null, redeemBy }) {
      return repo.transaction(s => {
        admin(s, actorId); const at = now();
        if (!['trial_pair', 'student_gift', 'coach_gift'].includes(kind)) fail('INVALID_KIND');
        if (!finiteTime(redeemBy) || redeemBy <= at) fail('INVALID_REDEMPTION_DEADLINE');
        if (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)) fail('INVALID_DURATION');
        if (kind === 'coach_gift' ? !positiveSeats(seats) : seats !== null) fail('INVALID_SEATS');
        if (kind === 'trial_pair' && durationDays !== null) fail('TRIAL_FIXED_SEVEN_DAYS');
        if (targetId !== null) user(s, targetId);
        const code = newCode();
        s.codes.push({ hash: digest(code), kind, targetId, seats, durationDays,
          redeemBy, redeemedBy: null, revoked: false });
        audit(s, actorId, 'code_issued', at);
        return { code }; // plaintext is returned once, never persisted or logged
      });
    },

    async revokeCode(actorId, code) {
      return repo.transaction(s => {
        admin(s, actorId);
        const c = s.codes.find(c => c.hash === digest(code)) || fail('INVALID_CODE');
        if (c.redeemedBy) fail('ALREADY_REDEEMED');
        c.revoked = true; audit(s, actorId, 'code_revoked', now());
      });
    },

    async redeemCode(actorId, code) {
      if (typeof code !== 'string' || !/^NCC-[a-f0-9]{48}$/.test(code)) fail('INVALID_CODE');
      return repo.transaction(s => {
        user(s, actorId); const at = now();
        const c = s.codes.find(c => c.hash === digest(code));
        if (!c || c.revoked || c.redeemBy <= at || c.redeemedBy ||
          (c.targetId !== null && c.targetId !== actorId)) fail('CODE_UNAVAILABLE');
        const requiredRole = ['trial_pair', 'coach_gift'].includes(c.kind) ? 'coach' : 'student';
        role(s, actorId, requiredRole);
        const endsAt = c.kind === 'trial_pair' ? at + 7 * DAY :
          c.kind === 'trial_student' ? c.endsAt :
          c.durationDays === null ? null : at + c.durationDays * DAY;
        if (c.kind.startsWith('trial_')) {
          if (s.trialUsers.includes(actorId)) fail('TRIAL_ALREADY_USED');
          s.trialUsers.push(actorId);
        }
        let studentCode;
        if (c.kind === 'trial_student') {
          const coachAccess = accessFor(s, c.coachId, at);
          if (!coachAccess.coach || coachAccess.available < 1) fail('NO_CAPACITY');
          if (s.memberships.some(m => m.studentId === actorId && m.active)) fail('ALREADY_LINKED');
          s.memberships.push({ coachId: c.coachId, studentId: actorId, active: true });
        }
        grant(s, { userId: actorId, role: requiredRole, seats: c.kind === 'trial_pair' ? 1 : c.seats,
          startsAt: at, endsAt, source: c.hash });
        if (c.kind === 'trial_pair') {
          studentCode = newCode();
          s.codes.push({ hash: digest(studentCode), kind: 'trial_student', targetId: null,
            coachId: actorId, endsAt, redeemBy: endsAt, seats: null,
            redeemedBy: null, revoked: false });
        }
        c.redeemedBy = actorId;
        audit(s, actorId, 'code_redeemed', at);
        return { access: accessFor(s, actorId, at), endsAt, ...(studentCode ? { studentCode } : {}) };
      });
    },

    async syncPurchase(actorId, token) {
      if (typeof token !== 'string' || !token || token.length > 4096) fail('INVALID_TOKEN');
      if (typeof verifyPlay !== 'function') fail('PLAY_NOT_CONFIGURED');
      return repo.transaction(async s => {
        user(s, actorId); const at = now();
        // Re-query Google; RTDN/client data alone never grants an entitlement.
        const p = await verifyPlay(token);
        const product = Object.hasOwn(PRODUCTS, p?.productId) ? PRODUCTS[p.productId] : null;
        if (!product || p.packageName !== PACKAGE_NAME || p.accountId !== actorId) fail('INVALID_PURCHASE');
        const hash = digest(token);
        const previous = s.purchases.find(x => x.hash === hash);
        if (previous && previous.userId !== actorId) fail('TOKEN_ALREADY_ASSIGNED');
        if (previous && previous.productId !== p.productId) fail('TOKEN_PRODUCT_MISMATCH');
        if (previous?.supersededBy) fail('TOKEN_SUPERSEDED');
        role(s, actorId, product.role || 'coach');
        if (p.linkedToken) {
          const linkedHash = digest(p.linkedToken);
          const linked = s.purchases.find(x => x.hash === linkedHash);
          if (linked && linked.userId !== actorId) fail('LINKED_TOKEN_OWNER_MISMATCH');
          if (linkedHash === hash) fail('INVALID_LINKED_TOKEN');
          if (linked) linked.supersededBy = hash;
          s.grants.filter(g => g.source === linkedHash).forEach(g => { g.revoked = true; });
        }
        const subscription = !!product.seats;
        if (subscription && !finiteTime(p.expiresAt)) fail('INVALID_EXPIRY');
        const entitled = subscription ?
          ['ACTIVE', 'IN_GRACE_PERIOD', 'CANCELED'].includes(p.state) && p.expiresAt > at :
          p.state === 'PURCHASED';
        const record = { hash, userId: actorId, productId: p.productId,
          state: p.state, checkedAt: at, acknowledgeRequired: entitled && !p.acknowledged };
        if (previous) Object.assign(previous, record); else s.purchases.push(record);
        s.grants = s.grants.filter(g => g.source !== hash);
        if (entitled) grant(s, { source: hash, userId: actorId,
          role: product.role || null, seats: product.seats || null,
          startsAt: at, endsAt: subscription ? p.expiresAt : null });
        audit(s, actorId, 'purchase_refreshed', at);
        return { access: accessFor(s, actorId, at), acknowledgeRequired: record.acknowledgeRequired };
      });
    },

    async linkStudent(actorId, studentId) {
      return repo.transaction(s => {
        role(s, actorId, 'coach'); role(s, studentId, 'student'); const at = now();
        const existing = s.memberships.find(m => m.studentId === studentId && m.active);
        if (existing) {
          if (existing.coachId === actorId) return accessFor(s, actorId, at);
          fail('ALREADY_LINKED');
        }
        if (!accessFor(s, studentId, at).student) fail('STUDENT_ACTIVATION_REQUIRED');
        const access = accessFor(s, actorId, at);
        if (!access.coach || access.available < 1) fail('NO_CAPACITY');
        s.memberships.push({ coachId: actorId, studentId, active: true });
        audit(s, actorId, 'student_linked', at);
        return accessFor(s, actorId, at);
      });
    },

    async archiveStudent(actorId, studentId) {
      return repo.transaction(s => {
        role(s, actorId, 'coach');
        s.memberships.filter(m => m.coachId === actorId && m.studentId === studentId)
          .forEach(m => { m.active = false; });
        audit(s, actorId, 'student_archived', now());
        return accessFor(s, actorId, now());
      });
    },

    async getAccess(actorId) {
      return repo.transaction(s => accessFor(s, actorId, now()));
    },
  };
}
