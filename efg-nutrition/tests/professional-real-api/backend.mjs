// Node-only controls over a REAL disposable Auth/PostgREST/PostgreSQL stack.
// No HTTP server, proxy, fake JWT, SDK substitute, or browser admin endpoint.
import {createHash, randomUUID} from 'node:crypto';
import {assetOrigin, literal, uuid, UUID, requireThat, openLocalRuntime, MODEL} from './local-runtime.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function snapshotFromSql(data) {
  requireThat(data && data.profile && data.profile.role === 'student' && data.profile.active === true,
    'REAL_STACK_PROFILE_REQUIRED');
  const p = data.profile, m = data.message;
  const profile = {user_id: p.user_id, role: p.role, organization_id: p.organization_id, active: p.active};
  return {
    originalProfileHash: hash(profile), messageInsertCount: data.sqlEffects.sendMessage,
    messageRowsForOperation: m ? 1 : 0, notificationRowsForOperation: data.notificationRowsForOperation,
    messageDigest: m ? hash(['ncc-message-v1', m.student_id, m.coach_id, m.sender_id, m.body]) : null,
    messageIdentity: m ? {id: m.id, studentId: m.student_id, coachId: m.coach_id, senderId: m.sender_id} : null,
    aliasHash: hash(data.alias), inboundUnreadIds: data.inboundUnreadIds,
    reservedReadIdsUpdated: data.reservedReadIdsUpdated,
    // Trigger ROW effects, never an HTTP count. For markRead this is rows changed.
    sqlEffects: data.sqlEffects,
  };
}
export async function startRealApi({allowedOrigin} = {}) {
  assetOrigin(allowedOrigin); // Validate only. Kong, not this wrapper, provides CORS.
  const runtime = openLocalRuntime();
  requireThat(runtime.sql('select version from ncc_synthetic.model where singleton') === MODEL, 'REAL_STACK_MODEL_REQUIRED');
  const created = [], organizationId = randomUUID(), personalId = randomUUID(), inboundId = randomUUID();
  const email = `synthetic.professional.${randomUUID()}@example.invalid`;
  const password = 'Synthetic-test-' + randomUUID();
  let userId, studentId, closed = false, closing;
  const q = value => literal(uuid(value));
  function current() {requireThat(!closed, 'REAL_STACK_FIXTURE_CLOSED');}
  async function createUser(userEmail, userPassword) {
    requireThat(/^synthetic\.[a-z]+\.[0-9a-f-]{36}@example\.invalid$/.test(userEmail), 'REAL_STACK_SYNTHETIC_EMAIL_REQUIRED');
    const result = await runtime.authAdmin('POST', '/auth/v1/admin/users', {
      email: userEmail, password: userPassword, email_confirm: true,
    });
    requireThat(typeof result?.id === 'string' && UUID.test(result.id) && result.email === userEmail,
      'REAL_STACK_AUTH_USER_REQUIRED');
    created.push(result.id);return result.id;
  }
  async function cleanup() {
    // Scope every SQL removal to UUIDs created by this wrapper. No shared reset.
    if (userId) runtime.sql(`begin;
      delete from ncc_synthetic.notifications where message_id in
        (select id from public.efg_messages where coach_id=${q(userId)});
      delete from public.efg_messages where coach_id=${q(userId)};
      delete from ncc_synthetic.effects where actor_id=${q(userId)};
      delete from ncc_synthetic.roster where organization_id in (${q(organizationId)},${q(personalId)});
      delete from public.efg_profiles where user_id in (${created.map(q).join(',')});
      delete from public.efg_organizations where id in (${q(organizationId)},${q(personalId)}) and coach_id=${q(userId)};
      commit;`);
    // GoTrue's own admin API owns Auth lifecycle; do not forge auth.users rows.
    for (const id of [...created].reverse()) await runtime.authAdmin('DELETE', '/auth/v1/admin/users/' + uuid(id));
  }
  try {
    userId = await createUser(email, password);
    studentId = await createUser(`synthetic.student.${randomUUID()}@example.invalid`, 'Synthetic-test-' + randomUUID());
    runtime.sql(`begin;
      insert into public.efg_organizations(id,coach_id,workspace_kind,professional_enabled)
        values (${q(personalId)},${q(userId)},'personal',false),(${q(organizationId)},${q(userId)},'professional',true);
      insert into public.efg_profiles(user_id,role,organization_id,active)
        values (${q(userId)},'student',${q(personalId)},true),(${q(studentId)},'student',${q(organizationId)},true);
      insert into ncc_synthetic.roster(user_id,organization_id,nickname)
        values (${q(studentId)},${q(organizationId)},'Synthetic student');
      insert into public.efg_messages(id,student_id,coach_id,sender_id,body)
        values (${q(inboundId)},${q(studentId)},${q(userId)},${q(studentId)},'Synthetic inbound fixture message.');
      commit;`);
  } catch {
    try {await cleanup();} catch {requireThat(false, 'REAL_STACK_FIXTURE_SETUP_CLEANUP_FAILED');}
    requireThat(false, 'REAL_STACK_FIXTURE_SETUP_FAILED');
  }
  const fixture = Object.freeze({anonKey: runtime.anonKey, email, password, userId, studentId, organizationId});
  function snapshot({operationId = null, readIds = []} = {}) {
    current();
    requireThat(operationId === null || typeof operationId === 'string' && UUID.test(operationId), 'REAL_STACK_OPERATION_REJECTED');
    requireThat(Array.isArray(readIds) && readIds.length <= 200 && readIds.every(id => typeof id === 'string' && UUID.test(id)) &&
      new Set(readIds).size === readIds.length, 'REAL_STACK_READ_IDS_REJECTED');
    const id = operationId === null ? 'null::uuid' : q(operationId);
    const ids = `array[${readIds.map(q).join(',')}]::uuid[]`;
    const raw = runtime.sql(`select json_build_object(
      'profile',(select json_build_object('user_id',user_id,'role',role,'organization_id',organization_id,'active',active)
        from public.efg_profiles where user_id=${q(userId)}),
      'message',(select row_to_json(m) from (select id,student_id,coach_id,sender_id,body from public.efg_messages
        where id=${id} and coach_id=${q(userId)} and student_id=${q(studentId)}) m),
      'alias',(select payment_alias from public.efg_organizations where id=${q(organizationId)} and coach_id=${q(userId)}),
      'notificationRowsForOperation',(select count(*) from ncc_synthetic.notifications n
        join public.efg_messages m on m.id=n.message_id where n.message_id=${id} and m.coach_id=${q(userId)}),
      'inboundUnreadIds',coalesce((select json_agg(id order by id) from public.efg_messages
        where coach_id=${q(userId)} and student_id=${q(studentId)} and sender_id=${q(studentId)} and read_at is null),'[]'::json),
      'reservedReadIdsUpdated',(select count(*) from public.efg_messages where coach_id=${q(userId)}
        and student_id=${q(studentId)} and sender_id=${q(studentId)} and id=any(${ids}) and read_at is not null),
      'sqlEffects',json_build_object(
        'sendMessage',(select count(*) from ncc_synthetic.effects where actor_id=${q(userId)} and action='sendMessage'),
        'setAlias',(select count(*) from ncc_synthetic.effects where actor_id=${q(userId)} and action='setAlias'),
        'markRead',(select count(*) from ncc_synthetic.effects where actor_id=${q(userId)} and action='markRead'))
    );`);
    let data;try {data = JSON.parse(raw);} catch {requireThat(false, 'REAL_STACK_SNAPSHOT_REJECTED');}
    return snapshotFromSql(data);
  }
  function makeReceiptAbsent({operationId} = {}) {
    current();uuid(operationId);
    const before = snapshot({operationId});
    requireThat(before.messageRowsForOperation === 1 && before.notificationRowsForOperation === 1 && before.messageInsertCount === 1,
      'REAL_STACK_RECEIPT_CONTROL_REJECTED');
    runtime.sql(`delete from public.efg_messages where id=${q(operationId)} and coach_id=${q(userId)} and student_id=${q(studentId)};`);
    const after = snapshot({operationId});
    requireThat(after.messageRowsForOperation === 0 && after.notificationRowsForOperation === 0 && after.messageInsertCount === 1,
      'REAL_STACK_RECEIPT_CONTROL_FAILED');return true;
  }
  function revokeProfessionalAccess({organizationId: requested} = {}) {
    current();requireThat(requested === organizationId, 'REAL_STACK_ORGANIZATION_REJECTED');
    const count = runtime.sql(`with changed as (update public.efg_organizations set professional_enabled=false
      where id=${q(organizationId)} and coach_id=${q(userId)} and workspace_kind='professional' and professional_enabled
      returning id) select count(*) from changed;`);
    requireThat(count === '1', 'REAL_STACK_REVOCATION_FAILED');return true;
  }
  function verifyAuthSession({userId: requested, sessionId} = {}) {
    current();requireThat(requested === userId, 'REAL_STACK_SESSION_USER_REJECTED');uuid(sessionId);
    requireThat(runtime.sql(`select exists(select 1 from auth.sessions where id=${q(sessionId)} and user_id=${q(userId)}
      and (not_after is null or not_after>now()))`) === 't', 'REAL_STACK_AUTH_SESSION_REQUIRED');return true;
  }
  async function close() {
    if (!closing) {closed = true;closing = cleanup();}return closing;
  }
  return Object.freeze({origin: runtime.origin, fixture, evidence: runtime.evidence, snapshot, makeReceiptAbsent,
    revokeProfessionalAccess, verifyAuthSession, close});
}
