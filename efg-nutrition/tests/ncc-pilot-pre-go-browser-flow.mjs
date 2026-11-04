// P22 — authentic P20 staged browser modules, synthetic Coach/student state.
// This joins the P21 versioned overlay to real education, legal, guided-day and
// Coach draft clients. The fake signed transport is NOT a substitute for the
// independent local GoTrue/JWT/RLS SDK suite or hosted/physical UAT.
import assert from 'node:assert/strict';

export async function runStagedPilotFlow(page,build){
 const outcome=await page.evaluate(async build=>{
  const [education,legal,participation,entry,journey,guideEngine,drafts,onboarding]=
   await Promise.all([
    './science-welcome.js','./coach-pilot-legal-client.js',
    './pilot-participation-demo.js','./coach-pilot-entry-client.js',
    './coach-student-journey.js','./guided-day-v2.js',
    './coach-plan-draft-client.js','./coach-relaunch-onboarding.js'
   ].map(path=>import(path+'?v='+build)));
  const check=(yes,reason)=>{if(!yes)throw Error('P22: '+reason);};
  const mustReject=async(fn,reason)=>{
   let rejected=false;try{await fn();}catch{rejected=true;}
   check(rejected,reason);
  };
  const student='11111111-1111-4111-8111-111111111111';
  const coach='22222222-2222-4222-8222-222222222222';
  const otherCoach='33333333-3333-4333-8333-333333333333';
  const org='44444444-4444-4444-8444-444444444444';
  const goalId='55555555-5555-4555-8555-555555555555';
  const earlier='2026-11-03T12:00:00.000Z';
  const later='2026-11-03T14:00:00.000Z';
  const sourceIntake={student_id:student,organization_id:org,
   updated_at:earlier,shared_at:earlier,revision:4,
   completed_version:onboarding.COACH_RELEASE_INTAKE_VERSION,
   dietary_pattern:'omnivore',health_section_confirmed:true};
  const profile={role:'student',active:true,user_id:student,organization_id:org};
  let signed=student,seenIntro=false,accepted=false,shared=false,draft=null,revision=0;
  const published=[],archived=[],calls=[],diaryWrites=[];
  const docs=['terms','privacy'].map((kind,i)=>({
   id:i?'77777777-7777-4777-8777-777777777777':'66666666-6666-4666-8666-666666666666',
   kind,version:'synthetic_pilot_2026_v1',
   body:('Local fictional pilot notice for browser verification; not a real acceptance. ').repeat(8),
   sha256:(i?'b':'a').repeat(64),is_current:true,published_at:earlier
  }));
  const sb={
   auth:{getUser:async()=>({data:{user:{id:signed}},error:null})},
   from(table){
    const filters={};
    const query={
     select(){return query;},eq(name,value){filters[name]=value;return query;},
     not(){return query;},in(){return query;},
     limit:async()=>({data:table==='efg_legal_documents'?docs:[],error:null}),
     maybeSingle:async()=>{
      if(table==='efg_science_intro_receipts')
       return {data:seenIntro?{user_id:student,version:education.SCIENCE_WELCOME_VERSION,seen_at:earlier}:null,error:null};
      if(table==='efg_consents')return {data:{accepted:shared},error:null};
      if(table==='efg_coach_relaunch_intakes')
       return {data:shared?sourceIntake:null,error:null};
      if(table==='efg_coach_plan_drafts')return {data:draft,error:null};
      return {data:null,error:{message:'Unexpected synthetic table '+table}};
     }
    };
    return query;
   },
   async rpc(name,params={}){
    calls.push(name);
    if(name==='efg_ack_science_intro'){
     if(signed!==student||!['completed','skipped'].includes(params.p_action))
      return {data:null,error:{message:'Wrong actor'}};
     seenIntro=true;return {data:true,error:null};
    }
    if(name==='efg_legal_current_status')
     return {data:docs.map(d=>({kind:d.kind,document_id:d.id,
      version:d.version,sha256:d.sha256,accepted})),error:null};
    if(name==='efg_accept_current_legal'){
     if(signed!==student||params.p_terms_checked!==true||params.p_privacy_checked!==true)
      return {data:null,error:{message:'Explicit consent required'}};
     accepted=true;return {data:true,error:null};
    }
    if(name==='efg_save_coach_plan_draft'){
     if(signed!==coach||!shared)return {data:null,error:{message:'Wrong Coach or no sharing'}};
     check(params.p_intake_revision===4,'Coach must bind actual intake revision');
     check(params.p_intake_updated_at===earlier,'Coach must bind intake timestamp');
     check(params.p_goal.kcal===2500||params.p_goal.kcal===2100,'Unexpected guide calories');
     const ids=[...new Set(params.p_guide.meals.flatMap(m=>m.items.map(i=>i.id)))].sort();
     check(JSON.stringify(params.p_guide.approvedFoodIds)===JSON.stringify(ids),
      'Food references must equal selected ingredients, not a whitelist');
     check(params.p_guide.meals.length===6,'Six initial guide slots required');
     check((params.p_expected_revision??null)===(revision||null),
      'Stale draft revision cannot overwrite current');
     revision++;draft={student_id:student,coach_id:coach,organization_id:org,
      source_intake_updated_at:earlier,source_intake_revision:4,
      goal_proposal:params.p_goal,guide_proposal:params.p_guide,
      draft_revision:revision,status:'draft',updated_at:later};
     return {data:revision,error:null};
    }
    if(name==='efg_publish_coach_plan_draft_atomic'){
     if(signed!==coach||draft?.status!=='draft'||params.p_expected_revision!==revision)
      return {data:null,error:{message:'Publication denied'}};
     if(published.length)archived.push(structuredClone(published.at(-1)));
     published.push({goal:structuredClone(draft.goal_proposal),
      guide:structuredClone(draft.guide_proposal),revision});
     draft.status='published';
     return {data:goalId,error:null};
    }
    diaryWrites.push(name);
    return {data:null,error:{message:'Unknown local RPC '+name}};
   }
  };
  check(education.SCIENCE_STEPS.length===9,'Nine educational steps missing: eight reference lessons plus serotonin closing');
  for(let i=0;i<8;i++)check(education.renderScienceWelcomeStep(i)
   .includes('data-science-step="'+(i+1)+'"'),'Education step '+(i+1));
  check((await education.readScienceWelcomeStatus(sb,{profile,userId:student})).pending,
   'First sign-in requires education');
  await mustReject(()=>education.acknowledgeScienceWelcome(sb,{
   profile,userId:student,action:'completed',explicitClick:false
  }),'Education receipt must require an explicit action');
  await education.acknowledgeScienceWelcome(sb,{profile,userId:student,
   action:'completed',explicitClick:true});
  check(!(await education.readScienceWelcomeStatus(sb,{profile,userId:student})).pending,
   'Educational intro must be one-time per verified user');

  const legalSnapshot=await legal.loadCoachPilotLegal(sb,{profile});
  check(legalSnapshot.ready&&!legalSnapshot.accepted,'Legal notices start unaccepted');
  const legalDom=document.implementation.createHTMLDocument('P22 isolated');
  legalDom.body.innerHTML=legal.renderCoachPilotLegal(legalSnapshot);
  const terms=legalDom.getElementById('efgCoachPilotLegal_terms');
  const privacy=legalDom.getElementById('efgCoachPilotLegal_privacy');
  check(terms&&!terms.checked&&privacy&&!privacy.checked,'Two independent unchecked notices');
  terms.checked=true;
  await mustReject(()=>legal.readCoachPilotLegalSelections(legalDom,legalSnapshot),
   'Terms-only must not grant legal acceptance');
  privacy.checked=true;
  const choice=legal.readCoachPilotLegalSelections(legalDom,legalSnapshot);
  await legal.submitCoachPilotLegal(sb,legalSnapshot,choice,{explicitSubmit:true,profile});
  check((await legal.loadCoachPilotLegal(sb,{profile})).accepted,
   'Signed two-document legal readback required');

  const participationDom=document.implementation.createHTMLDocument('P22 participation');
  participationDom.body.innerHTML=participation.renderPilotParticipationNotice({serverReceipts:true});
  check(!participationDom.getElementById('efgPilotParticipate').checked&&
   !participationDom.getElementById('efgPilotShare').checked,'Sharing never prechecked');
  participationDom.getElementById('efgPilotParticipate').checked=true;
  const privateChoice=participation.readPilotParticipationSelection(participationDom,{explicitClick:true});
  check(privateChoice.sharingRequested===false,'Student may keep intake private');
  const pending=journey.resolveCoachStudentJourney({
   profile,userId:student,identityVerified:true,participationFetched:true,
   participation:{user_id:student,version:participation.PILOT_PARTICIPATION_VERSION,
    participation_accepted:true,sharing_accepted:true,accepted_at:earlier,revoked_at:null},
   intake:sourceIntake,intakeFetched:true,plan:null,planFetched:true,
   guide:null,guideFetched:true
  });
  check(pending.route==='review'&&!pending.canLogMeals,'Student waits before Coach approval');
  check(journey.renderCoachPlanWaiting().includes('Tu coach está preparando tu plan'),
   'Waiting UI must remain available');

  const nutrients={
   egg:[1.48,.124,.0096,.0996],bread:[2.47,.13,.41,.042],
   milk_skim:[.35,.034,.05,.001],banana:[.89,.011,.23,.003],
   yogurt:[.50,.042,.081,.0009],apple:[.52,.003,.138,.002],
   chicken:[1.65,.31,0,.036],brownrice:[1.23,.027,.256,.01],
   pumpkin:[.34,.01,.08,.001],oil:[8.84,0,0,1],
   cheese:[2.17,.27,.017,.12],mandarin:[.53,.008,.133,.003],
   fish_hake:[.82,.178,0,.007],potato:[.86,.0171,.2001,.001],
   rocket:[.25,.026,.037,.007],oats_raw:[3.89,.169,.663,.069],
   yogurt_greek_light:[.59,.102,.036,.004],tofu_firm:[1.19,.12,.02,.07],
   avocado:[1.6,.02,.085,.147],walnuts:[6.54,.15,.14,.65]
  };
  const catalog=Object.entries(nutrients).map(([id,[k,p,c,f]])=>({
   id,name:id,unit:id==='milk_skim'?'ml':'g',k,p,c,f,fi:0
  }));
  const goal={goal_type:'recomp',kcal:2500,protein_g:150,carb_g:280,fat_g:80,fiber_g:25};
  const initial=guideEngine.generateFlexibleGuidedDay(catalog,goal,{
   patternId:'balanced',restrictionStatus:'unknown'});
  check(initial.meals.length===6,'Actual guide generator must create six slots');
  const revised=guideEngine.replaceFlexibleFood(initial,'almuerzo',0,
   {id:'tofu_firm',qty:150},catalog,goal);
  check(initial.meals[2].items[0].id!==revised.meals[2].items[0].id,
   'Coach edits must not mutate the auto-generated source');

  const client=drafts.createCoachPlanDraftClient({sb,enabled:true,
   relaunchEnabled:true,versionedBackendVerified:true});
  signed=coach;shared=true;
  await mustReject(()=>client.save({studentId:student,sourceUpdatedAt:earlier,
   sourceRevision:3,goal,guide:revised}),'Changed intake revision must block Coach save');
  const first=await client.save({studentId:student,sourceUpdatedAt:earlier,
   sourceRevision:4,goal,guide:revised});
  check(first.revision===1,'First private Coach draft must be saved');
  check((await client.load(student)).status==='draft','Coach must recover the private draft');
  await mustReject(()=>client.publish({studentId:student,expectedRevision:1,
   requestId:'88888888-8888-4888-8888-888888888888',confirmed:false}),
   'No atomic publication without explicit Coach approval');
  check(published.length===0,'Draft generation cannot publish silently');
  await client.publish({studentId:student,expectedRevision:1,
   requestId:'88888888-8888-4888-8888-888888888888',confirmed:true});
  check(published.length===1&&published[0].goal.kcal===2500,
   'Confirmed Coach must use atomic publish endpoint');
  const goal2={...goal,kcal:2100,protein_g:145,carb_g:230,fat_g:65,fiber_g:25};
  const newGuide=guideEngine.generateFlexibleGuidedDay(catalog,goal2,{
   patternId:'balanced',restrictionStatus:'unknown'});
  const changedGuide=guideEngine.replaceFlexibleFood(newGuide,'almuerzo',0,
   {id:'tofu_firm',qty:140},catalog,goal2);
  const second=await client.save({studentId:student,sourceUpdatedAt:earlier,
   sourceRevision:4,goal:goal2,guide:changedGuide,expectedRevision:1});
  await client.publish({studentId:student,expectedRevision:second.revision,
   requestId:'99999999-9999-4999-8999-999999999999',confirmed:true});
  check(published.length===2&&archived.length===1&&
   archived[0].goal.kcal===2500&&published[1].goal.kcal===2100,
   'CO-05 change 2500→2100 must retain historical version');
  const menuOnly=guideEngine.replaceFlexibleFood(changedGuide,'cena',0,
   {id:'tofu_firm',qty:130},catalog,goal2);
  const third=await client.save({studentId:student,sourceUpdatedAt:earlier,
   sourceRevision:4,goal:goal2,guide:menuOnly,expectedRevision:2});
  await client.publish({studentId:student,expectedRevision:third.revision,
   requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',confirmed:true});
  check(published.length===3&&archived.length===2&&published[2].goal.kcal===2100,
   'Menu-only renewal must preserve prior guide and calories');

  const ready=journey.resolveCoachStudentJourney({
   profile,userId:student,identityVerified:true,participationFetched:true,
   participation:{user_id:student,version:participation.PILOT_PARTICIPATION_VERSION,
    participation_accepted:true,sharing_accepted:true,accepted_at:earlier,revoked_at:null},
   intake:sourceIntake,intakeFetched:true,
   plan:{student_id:student,organization_id:org,status:'published',
    published_goal_id:goalId,published_at:later},planFetched:true,
   guide:{student_id:student,organization_id:org,guided_goal_id:goalId,
    guided_plan_approved_at:later},guideFetched:true
  });
  check(ready.route==='ready'&&ready.canLogMeals,'Student access only after approval');
  signed=otherCoach;
  await mustReject(()=>client.load(student),'Coach session switch must reject stale draft');
  check(diaryWrites.length===0,'Guide proposals must never write actual diary');
  check(calls.filter(x=>x==='efg_publish_coach_plan_draft_atomic').length===3,
   'Three versioned coach publications must use atomic RPC');
  return {intro:8,legal:2,initialSlots:6,guideVersions:published.length,
   preserved:archived.length,blockedBeforeApproval:!pending.canLogMeals,
   readyAfterApproval:ready.canLogMeals,switchRejected:true,
   noDiaryWrites:diaryWrites.length===0};
 },build);
 assert.equal(outcome.intro,8);
 assert.equal(outcome.legal,2);
 assert.equal(outcome.guideVersions,3);
 assert.equal(outcome.preserved,2);
 assert.equal(outcome.initialSlots,6);
 assert.equal(outcome.blockedBeforeApproval,true);
 assert.equal(outcome.readyAfterApproval,true);
 assert.equal(outcome.noDiaryWrites,true);
 console.log('PASS NCC P22 staged real modules: intro 8 once; terms/privacy; optional sharing; wait; auto guide→coach edit→private draft→confirmed atomic client; CO-05 2500→2100 and menu-only with prior versions; session isolation; no diary writes. In-memory synthetic server ONLY, NOT hosted E2E/UAT.');
 return outcome;
}
