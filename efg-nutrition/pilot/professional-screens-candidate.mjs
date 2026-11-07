import {PROFESSIONAL_RECONCILIATION_ENABLED,isProfessionalMutationJournal,digestProfessionalPayload} from './professional-mutation-journal.mjs?v=ncc-professional-reconciliation-r1-20261107';
// OFF candidate. The optional journal stores operation metadata, never personal content or role rewrites.
// Presentation checks never replace the server's capability, RLS and legal checks.
export const PROFESSIONAL_SCREENS_RELEASE_ENABLED = false;
export const CONTEXTUAL_SCREEN_TRANSPORT = 'NCC_PROFESSIONAL_SCREENS_CONTEXTUAL_V1';
export const SYNTHETIC_SCREEN_TRANSPORT = 'NCC_PROFESSIONAL_SCREENS_FIXTURE_V1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clone = value => structuredClone(value);
const validId = value => typeof value === 'string' && UUID.test(value);
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const key = scope => JSON.stringify(scope);
const deny = (code, message) => { throw Object.assign(new Error(message), {code}); };
const mutationGuards=new WeakMap();
// One guard belongs to the host lifetime, not to a screen mount or workspace.
// A configured durable journal supplements RAM. Without it, reload protection remains unavailable.
export function createProfessionalMutationGuard({journal}={}) {
  const guard=Object.freeze({});mutationGuards.set(guard,{pending:new Map(),uncertain:new Set(),uncertainRecords:new Map(),journal});return guard;
}
const empty = () => ({status:'closed', organization:null, students:[], studentId:null,
  recipes:[], messages:[], aliasDraft:'', messageDraft:'', notice:null, recovery:[], recoveryProblem:null});

// The host supplies the unmodified gateway view and a monotonic navigationEpoch.
// Increment it for EVERY workspace change, even personal -> professional -> personal.
// Session epoch must also advance for logout/relogin and token/session replacement.
export function professionalScreenScope(session, workspace) {
  const view = workspace?.view, profile = view?.originalProfile, org = view?.professional;
  if (!validId(session?.userId) || typeof session.sessionId !== 'string' || !session.sessionId ||
      !Number.isSafeInteger(session.epoch) || session.epoch < 0)
    deny('LOGIN_REQUIRED', 'Volvé a iniciar sesión.');
  if (!Number.isSafeInteger(workspace?.navigationEpoch) || workspace.navigationEpoch < 0)
    deny('INVALID_CONTEXT', 'Falta la generación de navegación profesional.');
  if (!profile || profile.user_id !== session.userId || profile.active !== true ||
      !['student','coach'].includes(profile.role))
    deny('INVALID_CONTEXT', 'El perfil original no coincide con la sesión.');
  if (!org || !validId(org.id) || org.coach_id !== session.userId || org.is_test !== true ||
      !['trial','active'].includes(org.status) || org.legal_ready !== true ||
      view.selected !== 'coach:' + org.id || view.professionalState !== 'candidate_roster')
    deny('PROFESSIONAL_CONTEXT_REQUIRED', 'Abrí un espacio profesional verificado.');
  if (profile.role === 'student' && (!validId(profile.organization_id) ||
      view.originalOrganization?.id !== profile.organization_id || profile.organization_id === org.id))
    deny('PERSONAL_CONTEXT_MISMATCH', 'El vínculo personal debe permanecer separado.');
  return Object.freeze({userId:session.userId, sessionId:session.sessionId,
    sessionEpoch:session.epoch, organizationId:org.id, navigationEpoch:workspace.navigationEpoch});
}

function validateWorkspace(data, scope) {
  const org = data?.organization;
  if (!org || org.id !== scope.organizationId || org.coach_id !== scope.userId ||
      !(org.payment_alias === null || typeof org.payment_alias === 'string') ||
      (typeof org.payment_alias === 'string' && Array.from(org.payment_alias).length > 100) ||
      !Array.isArray(data.students)) deny('INVALID_WORKSPACE', 'La respuesta no corresponde al espacio profesional.');
  const seen = new Set();
  const students = data.students.map(row => {
    if (!validId(row?.user_id) || row.user_id === scope.userId || seen.has(row.user_id) ||
        row.organization_id !== scope.organizationId || typeof row.nickname !== 'string' ||
        row.nickname.length > 70 || typeof row.active !== 'boolean' || typeof row.consent_accepted !== 'boolean')
      deny('INVALID_ROSTER', 'La lista no corresponde al espacio profesional.');
    seen.add(row.user_id);
    return {user_id:row.user_id, organization_id:row.organization_id, nickname:row.nickname,
      active:row.active, consent_accepted:row.consent_accepted};
  });
  return {organization:{id:org.id, coach_id:org.coach_id, payment_alias:org.payment_alias}, students};
}
function validateRecipes(rows, scope, studentId) {
  if (!Array.isArray(rows) || rows.length > 30) deny('INVALID_RECIPES', 'La lista de recetas no es válida.');
  const seen = new Set();
  return rows.map(row => {
    if (!validId(row?.id) || seen.has(row.id) || row.student_id !== studentId ||
        row.organization_id !== scope.organizationId || typeof row.name !== 'string' ||
        !row.name.trim() || row.name.length > 70 || !Number.isSafeInteger(row.portions) ||
        row.portions < 1 || row.portions > 50 || !Array.isArray(row.ingredients) ||
        row.ingredients.length < 1 || row.ingredients.length > 12 || !row.ingredients.every(item =>
          typeof item?.foodId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(item.foodId) &&
          typeof item.grams === 'number' && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 5000) ||
        !row.totals || ['k','p','c','f','fi'].some(n => typeof row.totals[n] !== 'number' ||
          !Number.isFinite(row.totals[n]) || row.totals[n] < 0))
      deny('INVALID_RECIPES', 'Una receta no corresponde al alumno y espacio elegidos.');
    seen.add(row.id);
    return {id:row.id, name:row.name, portions:row.portions,
      ingredients:row.ingredients.map(({foodId,grams}) => ({foodId,grams})),
      totals:Object.fromEntries(['k','p','c','f','fi'].map(n => [n,row.totals[n]]))};
  });
}
function validateMessages(rows, scope, studentId) {
  if (!Array.isArray(rows) || rows.length > 200) deny('INVALID_MESSAGES', 'La conversación no es válida.');
  const seen = new Set();
  return rows.map(row => {
    if (!validId(row?.id) || seen.has(row.id) || row.student_id !== studentId || row.coach_id !== scope.userId ||
        ![studentId,scope.userId].includes(row.sender_id) || typeof row.body !== 'string' ||
        !row.body.trim() || Array.from(row.body).length > 2000 || !timestamp(row.created_at) ||
        !(row.read_at === null || timestamp(row.read_at)))
      deny('INVALID_MESSAGES', 'Un mensaje no corresponde a esta conversación.');
    seen.add(row.id);
    return {id:row.id, student_id:row.student_id, coach_id:row.coach_id, sender_id:row.sender_id,
      body:row.body, created_at:row.created_at, read_at:row.read_at};
  }).sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function createProfessionalScreens({enabled=PROFESSIONAL_SCREENS_RELEASE_ENABLED,
  syntheticEnvironment=()=>false, transport, readSession, readWorkspace, mutationGuard,
  reconciliationEnabled=PROFESSIONAL_RECONCILIATION_ENABLED}={}) {
  let state=empty(), currentKey=null, generation=0, studentEpoch=0, disposed=false;
  const lanes = new Map(), owner=Symbol('screen-instance');
  const ledger=mutationGuards.get(mutationGuard),mutations=ledger?.pending,uncertain=ledger?.uncertain,uncertainRecords=ledger?.uncertainRecords,journal=ledger?.journal;
  const durableScope=scope=>({userId:scope.userId,organizationId:scope.organizationId});
  const digestPayload=(action,args)=>digestProfessionalPayload(action==='sendMessage'?
    ['ncc-message-v1',args.student_id,args.coach_id,args.sender_id,args.body]:['ncc-mutation-v1',action,args.ids||[]]);
  function clear() { generation++; studentEpoch++; state=empty(); lanes.clear(); }
  function sync() {
    if (disposed) deny('DISPOSED', 'La vista ya se cerró.');
    if (!enabled) deny('FEATURE_DISABLED', 'Las pantallas profesionales siguen apagadas.');
    if (!ledger) deny('HOST_GUARD_REQUIRED','Falta la protección de operaciones del contenedor.');
    if (syntheticEnvironment() !== true || ![SYNTHETIC_SCREEN_TRANSPORT,CONTEXTUAL_SCREEN_TRANSPORT].includes(transport?.kind) || typeof transport.perform !== 'function') {
      clear(); currentKey=null;
      deny('SYNTHETIC_ONLY', 'Esta candidata admite únicamente fixtures sintéticas.');
    }
    let scope;
    try { scope=professionalScreenScope(readSession?.(),readWorkspace?.()); }
    catch(error) { clear(); currentKey=null; throw error; }
    const next=key(scope);
    if (next !== currentKey) { clear(); currentKey=next; }
    return scope;
  }
  function ticket({student=false}={}) {
    const scope=sync();
    if (student && (!state.studentId || !state.students.some(row => row.user_id===state.studentId && row.active && row.consent_accepted)))
      deny('STUDENT_REQUIRED', 'Elegí un alumno vigente con seguimiento autorizado.');
    return {scope, generation, studentEpoch:student ? studentEpoch : null, studentId:student ? state.studentId : null};
  }
  function check(value) {
    const scope=sync();
    if (value.generation!==generation || key(scope)!==key(value.scope) ||
        value.studentEpoch!==null && (value.studentEpoch!==studentEpoch || value.studentId!==state.studentId))
      deny('STALE_CONTEXT', 'La sesión, el espacio o el alumno cambió. Se descartó la respuesta.');
  }
  async function perform(action,args,value) {
    check(value);
    let result;
    try { result=await transport.perform(action,clone(args),clone(value.scope)); }
    catch(error) { check(value); throw error; }
    check(value);
    if (result?.error) throw Object.assign(new Error(result.error.message || 'No se autorizó la operación.'),result.error);
    return result?.data;
  }
  function currentFailure(error,value) {
    // Never let an old request erase or publish into a newer screen.
    try { check(value); } catch { return; }
    if (['DENIED','42501','INVALID_WORKSPACE','INVALID_ROSTER','INVALID_RECIPES','INVALID_MESSAGES','INVALID_RECEIPT'].includes(error.code)) {
      clear(); state.status='error'; state.notice='No se pudo verificar el acceso profesional.';
    }
  }
  async function read(action,args,value,apply) {
    const sequence=(lanes.get(action)||0)+1; lanes.set(action,sequence);
    try {
      const data=await perform(action,args,value);
      if (lanes.get(action)!==sequence) deny('STALE_CONTEXT','Llegó una consulta anterior.');
      const result=apply(data); return clone(result);
    } catch(error) { currentFailure(error,value); throw error; }
  }
  const writeKey=(action,value) => JSON.stringify([value.scope.userId,value.scope.organizationId,action,
    ['sendMessage','markRead'].includes(action) ? value.studentId : null]);
  const heldFor=scope=>[...uncertainRecords.values()].filter(row=>row.scope.userId===scope.userId&&row.scope.organizationId===scope.organizationId);
  const recordKey=row=>JSON.stringify([row.scope.userId,row.scope.organizationId,row.action,row.studentId]);
  function hold(record,id){uncertain.add(id);if(record)uncertainRecords.set(record.operationId,clone(record));}
  function releaseHeld(record,id){uncertainRecords.delete(record.operationId);if(![...uncertainRecords.values()].some(row=>recordKey(row)===id))uncertain.delete(id);}
  async function refreshRecovery(value) {
    if(!reconciliationEnabled)return;
    try {
      if(!isProfessionalMutationJournal(journal))deny('JOURNAL_UNAVAILABLE','No se pudo verificar el registro de operaciones.');
      const rows=await journal.list(durableScope(value.scope));check(value);
      const known=new Map([...rows,...heldFor(value.scope)].map(row=>[row.operationId,row]));
      state.recovery=[...known.values()].map(({operationId,action,studentId})=>({operationId,action,studentId}));state.recoveryProblem=null;
    }catch(error){try{check(value);state.recovery=[];state.recoveryProblem='No se pudo verificar el registro de operaciones. Las escrituras siguen bloqueadas.';}catch{}}
  }
  function mutate(action,args,value,apply) {
    const id=writeKey(action,value), fingerprint=JSON.stringify(args), pending=mutations.get(id);
    if (uncertain.has(id)) deny('OUTCOME_UNCERTAIN','El resultado anterior es incierto. Verificalo antes de volver a enviar.');
    if (pending) {
      if (pending.owner===owner && pending.fingerprint===fingerprint) return pending.promise;
      deny('OPERATION_PENDING','Esperá el resultado de la operación en curso.');
    }
    const entry={owner,fingerprint,promise:null};
    entry.promise=(async()=>{
      let reservation=null,invoked=false;
      try {
        if(reconciliationEnabled){
          if(!isProfessionalMutationJournal(journal))deny('JOURNAL_UNAVAILABLE','No se pudo verificar el registro de operaciones.');
          const payloadDigest=await digestPayload(action,args);check(value);
          reservation=await journal.reserve({scope:durableScope(value.scope),action,
            studentId:['sendMessage','markRead'].includes(action)?value.studentId:null,payloadDigest,
            ...(action==='markRead'?{readIds:args.ids}:{})});
          check(value); // The durable reservation commits before any transport invocation.
          if(action==='sendMessage')args={...args,id:reservation.operationId};
        }
        invoked=true;
        const data=await perform(action,args,value);
        if(action==='sendMessage'&&reservation&&data?.id!==reservation.operationId)deny('INVALID_RECEIPT','El identificador confirmado no coincide con el envío.');
        const result=apply(data);
        if(reservation)await journal.finish(reservation);
        if(reconciliationEnabled){if(reservation)releaseHeld(reservation,id);await refreshRecovery(value);}
        return clone(result);
      } catch(error) {
        if(reservation&&(!invoked||error.outcome==='not_applied')){
          try{await journal.finish(reservation);releaseHeld(reservation,id);reservation=null;}catch{hold(reservation,id);}
        }else if(error.outcome!=='not_applied'&&(!reconciliationEnabled||reservation))hold(reservation,id);
        if(reconciliationEnabled)await refreshRecovery(value);
        currentFailure(error,value);throw error;
      } finally { if(mutations.get(id)===entry)mutations.delete(id); }
    })();
    mutations.set(id,entry); return entry.promise;
  }
  async function open({discard=false}={}) {
    const value=ticket(); if(!discard)assertCanLeave(); clear(); value.generation=generation;
    state.status='loading';
    await read('workspace',{},value,data=>{
      const valid=validateWorkspace(data,value.scope);
      state={...empty(),...valid,status:'ready'}; return snapshot();
    });
    await refreshRecovery(value);check(value);return snapshot();
  }
  function snapshot() {
    const scope=sync();
    return clone({...state,scope,reconciliationEnabled:reconciliationEnabled===true, pending:[...mutations.keys()].some(id=>{const [actor,org]=JSON.parse(id);return actor===scope.userId&&org===scope.organizationId;}),
      uncertain:state.recovery.some(row=>row.action==='setAlias'||row.studentId===state.studentId)||uncertain.has(writeKey('setAlias',{scope})) ||
        !!state.studentId && ['sendMessage','markRead'].some(action=>uncertain.has(writeKey(action,{scope,studentId:state.studentId})))});
  }
  function requireReady() { sync(); if(state.status!=='ready')deny('WORKSPACE_REQUIRED','Volvé a consultar el espacio profesional.'); }
  function assertCanLeave() {
    sync();
    if (state.aliasDraft || state.messageDraft) deny('UNSAVED_DRAFT','Guardá o cancelá los borradores antes de cambiar de vista.');
  }
  function selectStudent(studentId,{discard=false}={}) {
    requireReady();
    if(studentId===state.studentId)return snapshot();
    if(!discard)assertCanLeave();
    if(!state.students.some(row=>row.user_id===studentId&&row.active&&row.consent_accepted))
      deny('STUDENT_REQUIRED','Ese alumno no está autorizado en este espacio.');
    studentEpoch++;state.studentId=studentId;state.recipes=[];state.messages=[];state.messageDraft='';
    if(discard)state.aliasDraft='';
    return snapshot();
  }
  function setDraft(kind,text) {
    requireReady();
    if(!['alias','message'].includes(kind)||typeof text!=='string')deny('INVALID_DRAFT','Borrador inválido.');
    if(kind==='message')ticket({student:true});
    if(Array.from(text).length>(kind==='alias'?100:2000))deny('INVALID_DRAFT','El borrador supera el límite.');
    state[kind+'Draft']=text;return snapshot();
  }
  function cancelDrafts() { sync();state.aliasDraft='';state.messageDraft='';return snapshot(); }
  function setAlias() {
    requireReady();const value=ticket(), alias=state.aliasDraft.trim();
    if(Array.from(alias).length<3||Array.from(alias).length>100)deny('INVALID_ALIAS','Usá un alias de 3 a 100 caracteres.');
    return mutate('setAlias',{p_alias:alias},value,data=>{
      // Existing efg_set_coach_alias returns boolean, NOT an invented receipt.
      if(data!==true)deny('INVALID_RECEIPT','El servidor no confirmó el alias.');
      state.organization.payment_alias=alias; if(state.aliasDraft.trim()===alias)state.aliasDraft='';
      return {organizationId:value.scope.organizationId,payment_alias:alias};
    });
  }
  function loadRecipes() {
    requireReady();const value=ticket({student:true});state.recipes=[];
    return read('recipes',{p_student:value.studentId},value,data=>{
      state.recipes=validateRecipes(data,value.scope,value.studentId);return state.recipes;
    });
  }
  function loadMessages() {
    requireReady();const value=ticket({student:true});
    return read('messages',{student_id:value.studentId,coach_id:value.scope.userId},value,data=>{
      state.messages=validateMessages(data,value.scope,value.studentId);return state.messages;
    });
  }
  function sendMessage() {
    requireReady();const value=ticket({student:true}), body=state.messageDraft.trim();
    if(!body||Array.from(body).length>2000)deny('INVALID_MESSAGE','Escribí un mensaje de hasta 2.000 caracteres.');
    const args={student_id:value.studentId,coach_id:value.scope.userId,sender_id:value.scope.userId,body};
    lanes.set('messages',(lanes.get('messages')||0)+1);
    return mutate('sendMessage',args,value,data=>{
      const [row]=validateMessages([data],value.scope,value.studentId);
      if(row.sender_id!==value.scope.userId||row.body!==body)deny('INVALID_RECEIPT','No se confirmó el mensaje enviado.');
      lanes.set('messages',(lanes.get('messages')||0)+1);
      state.messages=[...state.messages.filter(item=>item.id!==row.id),row];
      if(state.messageDraft.trim()===body)state.messageDraft='';return row;
    });
  }
  function markRead() {
    requireReady();const value=ticket({student:true});
    const ids=state.messages.filter(row=>row.sender_id===value.studentId&&row.read_at===null).map(row=>row.id);
    if(!ids.length)return Promise.resolve([]);
    lanes.set('messages',(lanes.get('messages')||0)+1);
    return mutate('markRead',{student_id:value.studentId,coach_id:value.scope.userId,ids},value,data=>{
      if(!Array.isArray(data)||data.some(row=>!ids.includes(row?.id)||!timestamp(row.read_at))||
          new Set(data.map(row=>row.id)).size!==data.length)deny('INVALID_RECEIPT','No se confirmaron las lecturas.');
      lanes.set('messages',(lanes.get('messages')||0)+1);
      const confirmed=new Map(data.map(row=>[row.id,row.read_at]));
      state.messages=state.messages.map(row=>confirmed.has(row.id)?{...row,read_at:confirmed.get(row.id)}:row);
      return data; // Empty response means zero persisted acknowledgements, not success.
    });
  }
  async function reconcileMessage() {
    requireReady();const value=ticket({student:true}),id=writeKey('sendMessage',value);
    if(reconciliationEnabled!==true||!isProfessionalMutationJournal(journal))deny('JOURNAL_UNAVAILABLE','La verificación tras recarga no está disponible.');
    if(mutations.has(id))deny('OPERATION_PENDING','Esperá el resultado de la operación en curso.');
    try{
      const rows=await journal.list(durableScope(value.scope));check(value);
      const reservation=heldFor(value.scope).find(row=>row.action==='sendMessage'&&row.studentId===value.studentId)||rows.find(row=>row.action==='sendMessage'&&row.studentId===value.studentId);
      if(!reservation)return {status:'unresolved',reason:'NO_VERIFIABLE_RESERVATION'};
      const data=await perform('messageReceipt',{id:reservation.operationId,student_id:value.studentId,coach_id:value.scope.userId},value);
      if(data===null){await refreshRecovery(value);return {status:'unresolved',reason:'NOT_VISIBLE'};}
      const [row]=validateMessages([data],value.scope,value.studentId);
      if(row.id!==reservation.operationId||row.sender_id!==value.scope.userId||
        await digestPayload('sendMessage',row)!==reservation.payloadDigest)deny('INVALID_RECEIPT','El recibo no coincide con la operación pendiente.');
      check(value);
      if(rows.some(row=>row.operationId===reservation.operationId)){
        try{await journal.finish(reservation);}catch(error){
          if(error.code!=='JOURNAL_RECORD_MISMATCH')throw error;
          const latest=await journal.list(durableScope(value.scope));check(value);
          if(latest.some(row=>row.operationId===reservation.operationId))throw error;
          // Another tab may have resolved this exact operation and reserved a new one.
          // The authenticated receipt above resolves only this RAM record; never delete the newer lane.
        }
      }
      check(value);releaseHeld(reservation,id);lanes.set('messages',(lanes.get('messages')||0)+1);
      state.messages=[...state.messages.filter(item=>item.id!==row.id),row];
      if(state.messageDraft.trim()===row.body)state.messageDraft='';
      await refreshRecovery(value);check(value);return {status:'confirmed',message:clone(row)};
    }catch(error){currentFailure(error,value);await refreshRecovery(value);throw error;}
  }
  function close({discard=false}={}) { if(!discard)assertCanLeave();clear();currentKey=null; }
  function dispose() { clear();currentKey=null;disposed=true; }
  return Object.freeze({open,snapshot,selectStudent,setDraft,cancelDrafts,assertCanLeave,
    setAlias,loadRecipes,loadMessages,sendMessage,markRead,reconcileMessage,close,dispose});
}
