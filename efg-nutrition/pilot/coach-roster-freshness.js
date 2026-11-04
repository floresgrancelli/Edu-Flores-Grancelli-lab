// P26M: refresh from signed, current Coach RLS reads without reloading an unchanged
// selected student's draft editor. No DB writes, flags, localStorage or history edits.
export function createCoachRosterRefresh({sb,state,setConsents,loadForms,loadGoals,
 loadDraftStatuses,loadDetail,closeWorkspace}){
 if(!sb||!state||typeof setConsents!=='function')throw Error('Coach roster refresh dependencies missing');
 return async function refreshCoachRosterForView(){
  const role=state.profile?.role;
  if(role!=='coach'&&!(role==='admin'&&state.org?.is_test))return;
  const uid=state.session?.user?.id,org=state.org?.id,epoch=state.authContextEpoch||0;
  const guard=()=>{if(!uid||!org||state.session?.user?.id!==uid||
   state.profile?.user_id!==uid||state.org?.id!==org||(state.authContextEpoch||0)!==epoch)
   throw Error('La sesión del coach cambió. Volvé a consultar el listado.');};
  const signed=async()=>{guard();const r=await sb.auth.getUser();guard();
   if(r.error||r.data?.user?.id!==uid)throw Error('No se verificó la identidad del coach.');};
  await signed();
  const [p,i]=await Promise.all([
   sb.from('efg_profiles').select('*').eq('organization_id',org).eq('role','student'),
   sb.from('efg_invitations').select('*').eq('organization_id',org).eq('role','student')]);
  await signed();if(p.error||i.error)throw p.error||i.error;
  const roster=p.data||[];
  if(roster.some(x=>x.organization_id!==org||x.role!=='student'))
   throw Error('Lista de alumnos fuera de la organización actual.');
  const ids=roster.map(x=>x.user_id),allowedIds=new Set(ids);
  const grant=ids.length?await sb.from('efg_consents').select('*').in('student_id',ids):{data:[],error:null};
  await signed();if(grant.error)throw grant.error;
  const rows=grant.data||[];
  if(rows.some(x=>!allowedIds.has(x.student_id)))throw Error('Permiso fuera de la organización actual.');
  const selected=state.selectedStudent,previouslyAllowed=state.consent?.accepted===true;
  const before=state.coachIntakeForms?.[selected]||null;
  state.roster=roster;
  if(role==='coach')state.invitations=i.data||[];else state.testInvitations=i.data||[];
  const consents={};for(const row of rows)consents[row.student_id]=row.accepted===true;
  setConsents(consents);
  const authorized=roster.filter(x=>x.active&&consents[x.user_id]===true).map(x=>x.user_id);
  await loadForms(authorized);await loadGoals();await loadDraftStatuses();await signed();
  const current=roster.some(x=>x.user_id===selected&&x.active)&&consents[selected]===true;
  if(selected&&!current){
   // An active revocation must close cached private content, even if unsaved.
   state.selectedStudent=null;state.consent=null;
   for(const key of ['coachLogs','coachProgressLogs','coachWeights','coachGoals',
    'coachActivities','coachHistory','coachSharedRecipes'])state[key]=[];
   for(const key of ['coachFoodPlan','coachSharedRecipeScope','pendingGoal',
    'pendingGoalRevision','coachGuidedDraft','coachIntakePrefill','coachIntakeGuidePreview',
    'coachPlanDraftRecord','coachGuideHealth'])state[key]=null;
   closeWorkspace();
   state.coachIntakeRefreshNotice='El permiso cambió o el alumno dejó de estar activo. Su ficha se cerró; los históricos siguen intactos.';
  }else if(selected){
   state.consent=rows.find(x=>x.student_id===selected)||null;
   if(!previouslyAllowed)await loadDetail(selected);
   else{
    const after=state.coachIntakeForms?.[selected]||null;
    const altered=before?.revision!==after?.revision||before?.updated_at!==after?.updated_at||
     before?.shared_at!==after?.shared_at;
    state.coachIntakeRefreshNotice=altered?
     'Cambió la ficha compartida. El borrador local se conservó pero requiere nueva revisión antes de guardarlo.':null;
   }
  }else state.coachIntakeRefreshNotice=null;
  return {rosterCount:roster.length,authorizedCount:authorized.length,source:'signed_rls_read_only'};
 };
}
