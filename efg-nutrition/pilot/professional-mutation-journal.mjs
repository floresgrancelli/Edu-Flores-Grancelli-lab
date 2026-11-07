// Detached, synthetic-only candidate. No network, TTL, logout clearing or automatic retry.
// Browser storage deletion/eviction and other browsers/devices are NOT covered.
// Reservations survive reload as uncertain outcomes, never as receipts of application.
export const PROFESSIONAL_RECONCILIATION_ENABLED = false;
const VERSION = 1;
const MAX_RESERVATIONS = 10000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const validId = value => typeof value === 'string' && UUID.test(value);
const HASH = /^[0-9a-f]{64}$/;
const journals = new WeakSet();
const copy = value => structuredClone(value);
const fail = (code='JOURNAL_UNAVAILABLE') => { throw Object.assign(new Error(code), {code}); };
const object = x => !!x && Object.getPrototypeOf(x) === Object.prototype;
function keys(x, required, optional=[]) {
  if (!object(x) || required.some(k=>!Object.hasOwn(x,k)) || Object.keys(x).some(k=>![...required,...optional].includes(k))) fail('INVALID_JOURNAL_DATA');
}
function namespace(value) {
  if (typeof value !== 'string') fail('INVALID_NAMESPACE');
  if (/^fixture:[a-z0-9][a-z0-9_-]{0,63}$/.test(value)) return value;
  let url; try {url=new URL(value);} catch {fail('INVALID_NAMESPACE');}
  if (!['http:','https:'].includes(url.protocol) || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname!=='/' || value!==url.origin) fail('INVALID_NAMESPACE');
  return value;
}
function scopeIds(scope) {
  keys(scope,['userId','organizationId']);
  if (!validId(scope.userId) || !validId(scope.organizationId)) fail('INVALID_JOURNAL_DATA');
  return {userId:scope.userId,organizationId:scope.organizationId};
}
function validateIntent(x) {
  if (!['setAlias','sendMessage','markRead'].includes(x.action) || typeof x.payloadDigest!=='string' || !HASH.test(x.payloadDigest) ||
      (x.action==='setAlias' ? x.studentId!==null : !validId(x.studentId) || x.studentId===x.scope.userId)) fail('INVALID_JOURNAL_DATA');
  if (x.action==='markRead') {
    if (!Array.isArray(x.readIds) || x.readIds.length<1 || x.readIds.length>200 ||
        x.readIds.some(id=>typeof id!=='string'||!UUID.test(id)) || new Set(x.readIds).size!==x.readIds.length) fail('INVALID_JOURNAL_DATA');
  } else if (Object.hasOwn(x,'readIds')) fail('INVALID_JOURNAL_DATA');
}
const lane = x => JSON.stringify([x.backendNamespace,x.scope.userId,x.scope.organizationId,x.action,x.studentId]);
function record(x) {
  keys(x,['version','backendNamespace','scope','lane','operationId','action','studentId','createdAt','payloadDigest'],['readIds']);
  if (x.version!==VERSION || !validId(x.operationId) || typeof x.createdAt!=='string' ||
      !Number.isFinite(Date.parse(x.createdAt)) || new Date(x.createdAt).toISOString()!==x.createdAt) fail('INVALID_JOURNAL_DATA');
  namespace(x.backendNamespace); scopeIds(x.scope); validateIntent(x);
  if (x.lane!==lane(x)) fail('INVALID_JOURNAL_DATA');
  return x;
}
const initial = () => ({version:VERSION,records:[]});
function envelope(x) {
  keys(x,['version','records']);
  if (x.version!==VERSION || !Array.isArray(x.records) || x.records.length>MAX_RESERVATIONS) fail('INVALID_JOURNAL_DATA');
  const seen=new Set(),operations=new Set();
  for (const r of x.records) {
    record(r);
    if(seen.has(r.lane) || operations.has(r.operationId))fail('INVALID_JOURNAL_DATA');
    seen.add(r.lane);operations.add(r.operationId);
  }
  return x;
}

export const isProfessionalMutationJournal = value => journals.has(value);
export async function digestProfessionalPayload(payload, crypto=globalThis.crypto) {
  // Only the digest is returned; callers must never put the payload into the journal.
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  if(!crypto?.subtle?.digest)fail();
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}

export function createProfessionalMutationJournal({enabled=PROFESSIONAL_RECONCILIATION_ENABLED,
  syntheticEnvironment=()=>false,backendNamespace,driver,crypto=globalThis.crypto}={}) {
  function gate() {
    if(enabled!==true)fail('FEATURE_DISABLED');
    if(typeof syntheticEnvironment!=='function'||syntheticEnvironment()!==true)fail('SYNTHETIC_ONLY');
    namespace(backendNamespace);
    if(typeof driver?.transaction!=='function')fail();
  }
  async function transact(fn) {
    gate();
    try {return await driver.transaction(state=>fn(envelope(state)));}
    catch(error) {
      if(['OUTCOME_UNCERTAIN','JOURNAL_RECORD_MISMATCH','INVALID_JOURNAL_DATA'].includes(error?.code))throw error;
      fail();
    }
  }
  async function reserve(input) {
    gate(); keys(input,['scope','action','studentId','payloadDigest'],['readIds']);
    const safeScope=scopeIds(input.scope);validateIntent(input);
    if(typeof crypto?.randomUUID!=='function')fail();
    const next={version:VERSION,backendNamespace,scope:safeScope,operationId:crypto.randomUUID(),
      action:input.action,studentId:input.studentId,createdAt:new Date().toISOString(),payloadDigest:input.payloadDigest,
      ...(input.readIds ? {readIds:[...input.readIds]} : {})};
    next.lane=lane(next);record(next);
    return transact(state=>{
      if(state.records.some(r=>r.lane===next.lane))fail('OUTCOME_UNCERTAIN');
      if(state.records.length>=MAX_RESERVATIONS || state.records.some(r=>r.operationId===next.operationId))fail('INVALID_JOURNAL_DATA');
      state.records.push(copy(next));return copy(next);
    });
  }
  async function list(scope) {
    gate();const ids=scopeIds(scope);
    return transact(state=>copy(state.records.filter(r=>r.backendNamespace===backendNamespace &&
      r.scope.userId===ids.userId && r.scope.organizationId===ids.organizationId)));
  }
  async function finish(value) {
    gate();const expected=copy(record(value));
    if(expected.backendNamespace!==backendNamespace)fail('JOURNAL_RECORD_MISMATCH');
    return transact(state=>{
      const index=state.records.findIndex(r=>r.lane===expected.lane);
      if(index<0 || state.records[index].operationId!==expected.operationId ||
          JSON.stringify(state.records[index])!==JSON.stringify(expected))fail('JOURNAL_RECORD_MISMATCH');
      state.records.splice(index,1);return true;
    });
  }
  const journal=Object.freeze({reserve,list,finish});journals.add(journal);return journal;
}

// Shared state is intentionally injectable for synthetic reload/concurrency/failure tests.
// This driver is NOT durable beyond its state lifetime. Production must never use it.
export function createMemoryJournalDriver({state={value:initial()}}={}) {
  return Object.freeze({transaction:async fn=>{
    const next=copy(state.value),result=fn(next); // synchronous, atomic within this JS realm
    if(state.failure)throw new Error(state.failure);
    state.value=next;return copy(result);
  }});
}

export function createIndexedDBJournalDriver({indexedDB=globalThis.indexedDB,name='ncc-professional-fixture-journal-v1'}={}) {
  if(!/^ncc-professional-fixture-journal-[a-z0-9-]{1,64}$/.test(name))fail('INVALID_NAMESPACE');
  let opening;
  function open() {
    if(opening)return opening;
    opening=new Promise((resolve,reject)=>{
      let refused=false;
      const request=indexedDB.open(name,VERSION);
      request.onupgradeneeded=()=>{
        // Only first creation initializes metadata. Never silently migrate unknown schemas.
        if(request.transaction.db.objectStoreNames.length!==0){request.transaction.abort();return;}
        request.result.createObjectStore('journal').add(initial(),'state');
      };
      request.onerror=()=>{refused=true;reject(new Error('JOURNAL_UNAVAILABLE'));};
      request.onblocked=()=>{refused=true;reject(new Error('JOURNAL_UNAVAILABLE'));};
      request.onsuccess=()=>{
        const db=request.result;
        if(refused){db.close();return;}
        db.onversionchange=()=>db.close();resolve(db);
      };
    });
    return opening;
  }
  return Object.freeze({transaction:async fn=>{
    const db=await open();
    return new Promise((resolve,reject)=>{
      // Both read and write live in one exclusive readwrite transaction.
      const tx=db.transaction('journal','readwrite',{durability:'strict'});
      let result,problem;
      tx.oncomplete=()=>resolve(copy(result)); // Never resolve at request.success.
      tx.onabort=()=>reject(problem || new Error('JOURNAL_UNAVAILABLE'));
      tx.onerror=()=>{problem ||= new Error('JOURNAL_UNAVAILABLE');};
      const store=tx.objectStore('journal'),request=store.get('state');
      request.onsuccess=()=>{
        try {const state=envelope(request.result);result=fn(state);store.put(state,'state');}
        catch(error){problem=error;tx.abort();}
      };
    });
  }});
}
