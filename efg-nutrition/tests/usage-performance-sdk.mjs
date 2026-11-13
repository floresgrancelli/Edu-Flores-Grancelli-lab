// Loopback RAM transport only. Not Auth/JWT/RLS or hosted-backend certification.
import {createClient as base,bindApp as baseBind,fixture} from './student-day-visual-sdk.mjs';
export {fixture};
let app;
const ids={student:'10000000-0000-4000-8000-000000000001',coach:'10000000-0000-4000-8000-000000000099',org:'20000000-0000-4000-8000-000000000001'};
const model={ids,intake:null,goal:null,plan:null,draft:null,writes:[],reads:[],catalog:__USAGE_CATALOG__};
const storedDiary=()=>JSON.parse(sessionStorage.getItem('ncc-student-day-synthetic-record')||'null');
function rows(table){
 const roster=Array.from({length:50},(_,i)=>({user_id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),nickname:i===0?'Ana · recorrido ficticio':'Alumno '+String(i+1).padStart(2,'0')+' · ficticio',role:'student',organization_id:ids.org,active:true}));
 return table==='efg_profiles'?[...roster,app?.state.profile].filter(Boolean):table==='efg_consents'?roster.map(p=>({student_id:p.user_id,organization_id:ids.org,accepted:true})):table==='efg_coach_relaunch_intakes'?[model.intake].filter(Boolean):table==='efg_goals'?[model.goal].filter(Boolean):table==='efg_food_plans'?[model.plan].filter(Boolean):table==='efg_coach_plan_drafts'?[model.draft].filter(Boolean):table==='efg_daily_logs'?[storedDiary()].filter(Boolean):table==='efg_student_plan_access'&&model.plan?[{student_id:ids.student,organization_id:ids.org,status:'published'}]:[];
}
export function createClient(url){
 const sdk=base(url),from=sdk.from,baseRpc=sdk.rpc;
 sdk.auth.getUser=async()=>({data:{user:app?.state.session?.user||null},error:null});
 sdk.from=table=>{
  if(table==='efg_daily_logs'&&app?.state.profile?.role==='student')return from(table);
  const filters=[];let single=false,cap=Infinity;
  const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},not(k,o,v){filters.push(r=>r[k]!==v);return q},gte(k,v){filters.push(r=>r[k]>=v);return q},lte(k,v){filters.push(r=>r[k]<=v);return q},gt(){return q},is(){return q},order(){return q},limit(n){cap=n;return q},range(){return q},single(){single=true;return q},maybeSingle(){single=true;return q},then(resolve){model.reads.push(table);const found=rows(table).filter(r=>filters.every(f=>f(r))).slice(0,cap);resolve({data:structuredClone(single?found[0]||null:found),error:null})}};
  for(const op of ['upsert','insert','update','delete'])q[op]=()=>{throw Error('Unexpected local mutation '+table+'/'+op)};
  return q;
 };
 sdk.rpc=async(name,args)=>{
  if(name==='efg_coach_shared_student_recipes')return {data:[],error:null};
  if(name==='efg_get_coach_health_intake')return {data:null,error:null};
  if(name==='efg_coach_guide_catalog')return {data:{version:model.catalog.version,foods:args.p_food_ids.map(id=>model.catalog.foods[id])},error:null};
  if(name==='efg_save_coach_plan_draft'){
   if((model.draft?.draft_revision??null)!==args.p_expected_revision)return {data:null,error:{code:'PT409'}};
   model.draft={student_id:ids.student,organization_id:ids.org,coach_id:ids.coach,source_intake_updated_at:args.p_intake_updated_at,source_intake_revision:args.p_intake_revision,goal_proposal:structuredClone(args.p_goal),guide_proposal:structuredClone(args.p_guide),draft_revision:(model.draft?.draft_revision||0)+1,status:'draft',updated_at:new Date().toISOString()};model.writes.push({rpc:name});return {data:model.draft.draft_revision,error:null};
  }
  if(name==='efg_publish_coach_plan_draft_atomic'){
   const id=crypto.randomUUID(),stamp=new Date().toISOString();model.goal={...model.draft.goal_proposal,id,student_id:ids.student,approved_at:stamp,start_on:app.today()};model.plan={student_id:ids.student,organization_id:ids.org,guided_goal_id:id,guided_plan:structuredClone(model.draft.guide_proposal),guided_plan_approved_at:stamp};model.draft.status='published';model.writes.push({rpc:name});return {data:id,error:null};
  }
  return baseRpc(name,args);
 };return sdk;
}
export function bindApp(hooks){app=hooks;baseBind(hooks);window.__NCC_USAGE_MODEL__=model;window.__NCC_USAGE_FIXTURE__={
 captureIntake(payload){model.intake={...payload,student_id:ids.student,organization_id:ids.org,completed_version:'coach_major_2026_r1',revision:1,shared_at:new Date().toISOString(),updated_at:new Date().toISOString()};},
 async enter(role){await fixture.loginAs(role==='coach'?'mentor':'learner');const s=app.state,id=ids[role];s.session.user.id=id;s.profile.user_id=id;s.profile.role=role;s.profile.organization_id=ids.org;s.org={id:ids.org,coach_id:ids.coach,status:'active',seat_limit:50};s.consent={student_id:ids.student,organization_id:ids.org,accepted:true};s.coachPilotEntry={route:'ready',canLogMeals:true};s.scienceWelcomePending=false;s.welcomePending=false;
 if(role==='coach'){s.roster=rows('efg_profiles').filter(p=>p.role==='student');s.selectedStudent=null;s.coachIntakeVerified=true;s.coachIntakeDraftVerified=true;s.coachIntakeForms=model.intake?{[ids.student]:structuredClone(model.intake)}:{};s.coachIntakeGoals={};s.coachIntakeAccess={};s.coachIntakeDraftStatuses={};s.tab='coachStudents';window.__NCC_USAGE_HOOKS__.setConsent(Object.fromEntries(s.roster.map(p=>[p.user_id,true])));}
 else{s.tab='home';s.foodPlan=model.plan?structuredClone(model.plan):null;s.goals=model.goal?[structuredClone(model.goal)]:s.goals;if(storedDiary())s.diary=storedDiary();}
 await app.render();document.getElementById('ncc-student-day-fixture-controls').hidden=true;
 }
};}
