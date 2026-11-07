// Pure, dependency-free policy. Offline tests exercise policy, not a real backend.
export const HEAD = 'a0e612ffba09141d430441e9dd9a9b7867df171c';
export const SDK_VERSION = '2.118.0';
export const JOURNAL_QUERY = '?v=ncc-professional-reconciliation-r1-20261107';
export const MODULE_HASHES = Object.freeze({
  'professional-mutation-journal.mjs':'78a159d9c538165b29040e0e10cbddb5ef1f4a9dbfec09f8c6c75e7f91d39aaf',
  'professional-screens-candidate.mjs':'c35872f18badf099d06343bf61a103f79a62202416640ca5b8406bba28aeb9e7',
  'professional-screens-transport.mjs':'7edc9bccac080caa4e03b88aba73a076d3ebb0b01b09f0e908295d4c09803440'
});
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const SHA256 = /^[0-9a-f]{64}$/;
export function fail(code) { throw Object.assign(new Error(code), {code}); }
export function requireThat(ok, code='INVALID_CONFIG') { if(!ok) fail(code); }
export function loopbackOrigin(value) {
  requireThat(typeof value === 'string');
  let u; try { u = new URL(value); } catch { fail('INVALID_ORIGIN'); }
  requireThat(['http:','https:'].includes(u.protocol) && ['127.0.0.1','localhost','[::1]'].includes(u.hostname) &&
    !u.username && !u.password && !u.search && !u.hash && u.pathname==='/' && value===u.origin, 'LOOPBACK_REQUIRED');
  return u.origin;
}
export function strictAssetPath(value) {
  requireThat(typeof value==='string' && /^\/[A-Za-z0-9_./-]+(?:\?v=ncc-professional-reconciliation-r1-20261107)?$/.test(value), 'INVALID_ASSET_PATH');
  requireThat(!value.includes('..') && !value.includes('//') && !value.includes('\\'), 'INVALID_ASSET_PATH');
  return value;
}
export function validatePublicConfig(c) {
  requireThat(c && Object.keys(c).sort().join(',') === 'backendOrigin,dbName,frontendOrigin,runId,sdk');
  loopbackOrigin(c.frontendOrigin); loopbackOrigin(c.backendOrigin);
  requireThat(typeof c.runId==='string' && /^[a-z0-9-]{8,48}$/.test(c.runId));
  requireThat(c.dbName === 'ncc-professional-fixture-journal-'+c.runId);
  requireThat(c.sdk && Object.keys(c.sdk).sort().join(',')==='format,path,sha256,version');
  requireThat(c.sdk.version===SDK_VERSION, 'SDK_VERSION_MISMATCH');
  requireThat(['umd','esm'].includes(c.sdk.format) && SHA256.test(c.sdk.sha256));
  strictAssetPath(c.sdk.path);
  requireThat(c.sdk.path.startsWith('/sdk/') && !c.sdk.path.includes('?'));
  return c;
}
const api = new Map([
  ['POST /auth/v1/token', new Set(['grant_type'])],
  ['GET /auth/v1/user',new Set()],
  ['POST /auth/v1/logout',new Set(['scope'])],
  ['POST /rest/v1/rpc/ncc_dual_workspace_contexts_v1',new Set()],
  ['POST /rest/v1/rpc/ncc_pilot_workspace_roster_v1',new Set()],
  ['POST /rest/v1/rpc/efg_set_coach_alias',new Set()],
  ['POST /rest/v1/rpc/efg_coach_shared_student_recipes',new Set()],
  ['GET /rest/v1/efg_profiles',new Set(['select','user_id'])],
  ['GET /rest/v1/efg_organizations',new Set(['select','id','coach_id'])],
  ['GET /rest/v1/efg_messages',new Set(['select','student_id','coach_id','id','order','limit'])],
  ['POST /rest/v1/efg_messages',new Set(['select','columns'])],
  ['PATCH /rest/v1/efg_messages',new Set(['select','student_id','coach_id','sender_id','read_at','id'])]
]);
export function assertApiRequest(value, method, backendOrigin) {
  loopbackOrigin(backendOrigin);
  let u; try{u=new URL(value);}catch{fail('REQUEST_REJECTED');}
  requireThat(u.origin===backendOrigin && !u.username && !u.password && !u.hash &&
    !/%|\\|\/\//.test(u.pathname), 'REQUEST_REJECTED');
  const allowed=api.get(method+' '+u.pathname);
  requireThat(allowed && [...u.searchParams.keys()].every(k=>allowed.has(k)) &&
    [...u.searchParams.keys()].length===new Set(u.searchParams.keys()).size, 'ROUTE_REJECTED');
  if(u.pathname==='/auth/v1/token') requireThat(u.search==='?grant_type=password','AUTH_FLOW_REJECTED');
  if(u.pathname==='/auth/v1/logout') requireThat(u.search==='?scope=local','AUTH_FLOW_REJECTED');
  return {path:u.pathname,method};
}
export function assertBrowserRequest(value, method, config, assetPaths) {
  const u=new URL(value);
  requireThat(!u.username&&!u.password&&!u.hash,'REQUEST_REJECTED');
  if(u.origin===config.frontendOrigin && assetPaths.has(u.pathname+u.search)) {
    requireThat(method==='GET','ROUTE_REJECTED'); return {kind:'asset',key:u.pathname+u.search};
  }
  assertApiRequest(value,method,config.backendOrigin); return {kind:'api'};
}
export const mutationAction = (method,path) => method==='POST'&&path==='/rest/v1/efg_messages'?'sendMessage':
  method==='PATCH'&&path==='/rest/v1/efg_messages'?'markRead':
  method==='POST'&&path==='/rest/v1/rpc/efg_set_coach_alias'?'setAlias':null;
export function metadataOnly(records) {
  requireThat(Array.isArray(records),'INVALID_JOURNAL');
  const required=['version','backendNamespace','scope','lane','operationId','action','studentId','createdAt','payloadDigest'];
  for(const r of records) {
    requireThat(required.every(k=>Object.hasOwn(r,k)) && Object.keys(r).every(k=>required.includes(k)||k==='readIds'),'INVALID_JOURNAL');
    requireThat(r.version===1&&typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&new Date(r.createdAt).toISOString()===r.createdAt,'INVALID_JOURNAL');
    loopbackOrigin(r.backendNamespace);
    requireThat(UUID.test(r.operationId)&&SHA256.test(r.payloadDigest)&&['setAlias','sendMessage','markRead'].includes(r.action),'INVALID_JOURNAL');
    requireThat(Object.keys(r.scope).sort().join(',')==='organizationId,userId'&&UUID.test(r.scope.userId)&&UUID.test(r.scope.organizationId),'INVALID_JOURNAL');
    requireThat(r.studentId===null&&r.action==='setAlias'||UUID.test(r.studentId)&&r.studentId!==r.scope.userId&&r.action!=='setAlias','INVALID_JOURNAL');
    requireThat(r.lane===JSON.stringify([r.backendNamespace,r.scope.userId,r.scope.organizationId,r.action,r.studentId]),'INVALID_JOURNAL');
    if(r.action==='markRead')requireThat(Array.isArray(r.readIds)&&r.readIds.length>0&&r.readIds.length<=200&&r.readIds.every(x=>UUID.test(x))&&new Set(r.readIds).size===r.readIds.length,'INVALID_JOURNAL');
    else requireThat(!Object.hasOwn(r,'readIds'),'INVALID_JOURNAL');
  }
  requireThat(new Set(records.map(r=>r.operationId)).size===records.length&&new Set(records.map(r=>r.lane)).size===records.length,'INVALID_JOURNAL');
  return true;
}
