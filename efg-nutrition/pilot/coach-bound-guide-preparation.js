import {adaptedScopeKey} from './coach-adapted-workspace.js';
export function createBoundGuidePreparation({sb,readScope,readGoal,foodIds,onSaved}){
 let busy=false;
 const capture=()=>{const scope=readScope(),key=adaptedScopeKey(scope);if(!key||!scope.sessionId||!Number.isSafeInteger(scope.sourceEpoch)||scope.sourceEpoch<1)throw Error('Contexto del coach no verificado.');return {scope,key};};
 const guard=t=>{if(t.key!==adaptedScopeKey(readScope()))throw Error('Cambió el alumno, la sesión o la revisión.');};
 async function signed(t){guard(t);const u=await sb.auth.getUser();guard(t);if(u.error||u.data?.user?.id!==t.scope.userId)throw Error('Sesión no verificada.');}
 async function prepare({preferredIds,dislikedIds,confirmed=false}){
  if(busy||!confirmed)throw Error('Revisión explícita requerida.');
  const t=capture(),raw=readGoal();if(!raw||raw.student_id!==t.scope.studentId)throw Error('Calculá objetivos para este alumno.');
  const goal=Object.fromEntries(['goal_type','kcal','protein_g','carb_g','fat_g','fiber_g'].map(k=>[k,raw[k]]));
  for(const k of ['kcal','protein_g','carb_g','fat_g','fiber_g'])if(!Number.isFinite(goal[k]))throw Error('Objetivo incompleto.');
  for(const ids of [preferredIds,dislikedIds])if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(x=>!foodIds.includes(x)))throw Error('Selección de alimentos inválida.');
  if(preferredIds.some(x=>dislikedIds.includes(x)))throw Error('Un alimento no puede ser preferido y excluido.');
  busy=true;
  try{
   await signed(t);
   const intake=await sb.from('efg_coach_relaunch_intakes').select('student_id,organization_id,revision,shared_at,preferred_foods,disliked_foods').eq('student_id',t.scope.studentId).single();guard(t);
   if(intake.error||intake.data?.organization_id!==t.scope.organizationId||!intake.data?.shared_at)throw Error('Ficha actual no autorizada.');
   const health=await sb.rpc('efg_get_coach_health_intake',{p_student:t.scope.studentId});guard(t);
   const h=health.data,d=h?.restriction_declaration;
   if(health.error||h?.student_id!==t.scope.studentId||h?.organization_id!==t.scope.organizationId||
     d?.kind!=='none_declared'||d.declared_by!==t.scope.studentId||d.source_revision!==h.revision)
    throw Error('Falta declaración explícita vigente; no se infiere ausencia de restricciones.');
   const draft=await sb.from('efg_coach_plan_drafts').select('draft_revision').eq('student_id',t.scope.studentId).maybeSingle();guard(t);if(draft.error)throw Error('No se pudo comprobar el borrador vigente.');
   await signed(t); // No write if context changed during any read or Auth.
   const saved=await sb.rpc('efg_prepare_bound_guide',{p_student:t.scope.studentId,p_goal:goal,
    p_intake_revision:intake.data.revision,p_health_revision:h.revision,p_preferred:preferredIds,p_disliked:dislikedIds,
    p_food_ids:[...foodIds],p_expected_draft:draft.data?.draft_revision??null});guard(t);
   if(saved.error||!Number.isSafeInteger(saved.data))throw Error('El servidor rechazó la preparación. Revalidá ficha y objetivos.');
   const back=await sb.rpc('efg_read_bound_guide',{p_student:t.scope.studentId});guard(t);
   if(back.error||back.data?.draft_revision!==saved.data||['kcal','protein_g','carb_g','fat_g','fiber_g','goal_type'].some(k=>back.data?.goal?.[k]!==goal[k]))throw Error('No se confirmó el mismo objetivo guardado.');
   await onSaved(t.scope.studentId);return saved.data;
  }finally{busy=false;}
 }
 function mount(element){
  element.innerHTML='<section class="card"><h3>Preparar guía desde estos objetivos</h3><p>Ensayo local. Revisá la ficha visible y seleccioná los gustos correspondientes; no certifica aptitud clínica.</p><label>Preferido <select data-bound-preferred></select></label><label>Excluir por gusto <select data-bound-disliked></select></label><label><input type="checkbox" data-bound-source-review> Revisé los objetivos calculados y su correspondencia con la ficha.</label><button type="button" class="btn" data-bound-prepare>Guardar objetivos y preparar borrador</button><p role="status" data-bound-prepare-status></p></section>';
  for(const select of element.querySelectorAll('select'))for(const id of ['',...foodIds]){const opt=element.ownerDocument.createElement('option');opt.value=id;opt.textContent=id||'Sin selección';select.append(opt);}
  element.querySelector('[data-bound-prepare]').onclick=async()=>{const p=element.querySelector('[data-bound-preferred]').value,n=element.querySelector('[data-bound-disliked]').value;
   try{await prepare({preferredIds:p?[p]:[],dislikedIds:n?[n]:[],confirmed:element.querySelector('[data-bound-source-review]').checked});}
   catch(e){if(element.isConnected)element.querySelector('[data-bound-prepare-status]').textContent=e.message;}};
 }
 return {prepare,mount};
}
