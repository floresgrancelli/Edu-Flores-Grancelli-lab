import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createProfessionalReleaseAdapter} from '../pilot/professional-release-adapter.mjs';
import {createProfessionalCoachTools} from '../pilot/professional-coach-tools.mjs';
import {createReleaseJournal} from '../pilot/professional-release-journal.mjs';
import {fakeIDB} from './professional-terms-test-support.mjs';
export const IDS={user:'11000000-0000-4000-8000-000000000001',session:'11000000-0000-4000-8000-000000000002',org:'11000000-0000-4000-8000-000000000003',student:'11000000-0000-4000-8000-000000000004',personal:'11000000-0000-4000-8000-000000000005',mentor:'11000000-0000-4000-8000-000000000006',payment:'11000000-0000-4000-8000-000000000007'};
export function coachFixture(){
 const id=IDS,now='2026-11-07T12:00:00.000Z',catalog=JSON.parse(readFileSync(new URL('../catalog/guide-catalog.json',import.meta.url)));
 const s={session:id.session,active:true,consent:true,legal:true,calls:[],writes:[],loss:null,queryHook:null,tamper:false,receipts:new Map(),tables:{
  efg_coach_relaunch_intakes:[{student_id:id.student,organization_id:id.org,revision:1,updated_at:now,shared_at:now,completed_version:'coach_major_2026_r1',objective:'recomp',age_years:40,height_cm:170,weight_kg:75,activity_level:'light',dietary_pattern:'omnivore',eating_window:'regular'}],
  efg_organizations:[{id:id.org,coach_id:id.user,payment_alias:null}],efg_messages:[],
  efg_consents:[{student_id:id.student,organization_id:id.org,accepted:true}],efg_coach_plan_drafts:[],efg_goals:[],efg_food_plans:[],efg_period_reports:[],efg_weekly_reports:[],efg_weights:[],efg_activities:[],
  efg_payments:[{id:id.payment,payer_id:id.student,recipient_id:id.user,payment_kind:'student_coach',amount_ars:100,period_label:'FICTICIO',status:'pending',receipt_path:'fictional/receipt.png',created_at:now,reviewed_at:null}],
  efg_daily_logs:[{student_id:id.student,log_day:'2026-11-06',meals:{desayuno:[{id:'egg',name:'Huevo',k:150,p:12,c:2,f:10,fi:0}]},sports:[],skipped:{}}]
 }};
 const original={user_id:id.user,active:true,role:'student',organization_id:id.personal,nickname:'Coach ficticia'};
 const token=()=>`a.${Buffer.from(JSON.stringify({session_id:s.session})).toString('base64url')}.b`;
 const listeners=new Set();
 const sdk={supabaseUrl:'https://ncc.example.com',auth:{onAuthStateChange(fn){listeners.add(fn);return {data:{subscription:{unsubscribe(){listeners.delete(fn);}}}};},async getSession(){return {data:{session:{access_token:token()}}};},async getUser(){return {data:{user:{id:id.user}}};}},
 storage:{from(){return {async createSignedUrl(path){return {data:{signedUrl:'https://ncc.example.com/storage/v1/object/sign/efg-receipts/'+path+'?token=fictional'}};}};}},
 from(table){let filters=[],sort=[],limit=Infinity,range=null,single=false,maybe=false,insert=null,selected=false;const q={
  select(){selected=true;return q;},eq(k,v){filters.push(row=>row[k]===v);return q;},in(k,vs){filters.push(row=>vs.includes(row[k]));return q;},not(k,op,v){filters.push(row=>row[k]!==v);return q;},is(k,v){filters.push(row=>row[k]===v);return q;},gte(k,v){filters.push(row=>row[k]>=v);return q;},gt(k,v){filters.push(row=>row[k]>v);return q;},lte(k,v){filters.push(row=>row[k]<=v);return q;},order(k,o={}){sort.push([k,o.ascending!==false]);return q;},limit(n){limit=n;return q;},range(a,b){range=[a,b];return q;},single(){single=true;return q;},maybeSingle(){maybe=true;return q;},insert(row){insert=structuredClone(row);return q;},
  async then(resolve,reject){try{s.calls.push({table,insert:!!insert});let rows;
   if(table==='efg_profiles')rows=[structuredClone(original)];else rows=structuredClone(s.tables[table]||[]);
   if(insert){s.writes.push({table,record:insert});s.tables[table]||=[];if(s.tables[table].some(r=>r.id===insert.id))return resolve({data:null,error:{code:'23505'}});s.tables[table].push({...insert,created_at:now,...(table==='efg_messages'?{read_at:null}:{})});rows=[s.tables[table].at(-1)];if(s.loss==='report')throw Error('fictional lost insert');}
   if(!s.tamper)rows=rows.filter(r=>filters.every(f=>f(r)));
   rows.sort((a,b)=>{for(const [k,asc]of sort){const d=String(a[k]).localeCompare(String(b[k]));if(d)return asc?d:-d;}return 0;});if(range)rows=rows.slice(range[0],range[1]+1);rows=rows.slice(0,limit);
   if(s.queryHook)await s.queryHook(table,rows);
   if(single&&rows.length!==1)return resolve({data:null,error:{code:'PGRST116'}});
   resolve({data:single||maybe?(rows[0]||null):rows,error:null});
  }catch(e){reject(e);}}
 };return q;},
 async rpc(name,args){s.calls.push({rpc:name,args:structuredClone(args)});
  if(name==='ncc_dual_workspace_contexts_v1')return {data:{user_id:id.user,active:s.active,profile_role:'student',student_context:{organization_id:id.personal,coach_id:id.mentor,consent_accepted:true},coach_contexts:[{id:id.org,coach_id:id.user,name:'Coach ficticia',is_test:true,legal_ready:s.legal,status:'active',seat_limit:10,active_students:1,pending_invitations:0}],managed_coaches:[]}};
  if(name==='ncc_pilot_workspace_roster_v1')return {data:[{user_id:id.student,organization_id:id.org,nickname:'Alumno ficticio',active:true,consent_accepted:s.consent}]};
  if(name==='efg_get_coach_health_intake')return {data:null};
  if(name==='efg_coach_guide_catalog')return {data:{version:catalog.version,foods:args.p_food_ids.map(x=>catalog.foods[x])}};
  if(name==='efg_save_coach_plan_draft'){const prior=s.tables.efg_coach_plan_drafts[0];if((prior?.draft_revision??null)!==args.p_expected_revision)return {data:null,error:{code:'PT409'}};const row={student_id:id.student,organization_id:id.org,coach_id:id.user,source_intake_updated_at:args.p_intake_updated_at,source_intake_revision:args.p_intake_revision,goal_proposal:args.p_goal,guide_proposal:args.p_guide,draft_revision:(prior?.draft_revision||0)+1,status:'draft',updated_at:now};s.tables.efg_coach_plan_drafts=[structuredClone(row)];s.writes.push({rpc:name,args});if(s.loss==='save')throw Error('fictional lost save');return {data:row.draft_revision};}
  if(name==='efg_publish_coach_plan_draft_atomic'){const goalId=webcrypto.randomUUID(),receipt={request_id:args.p_request_id,student_id:id.student,organization_id:id.org,coach_id:id.user,draft_revision:args.p_expected_revision,goal_id:goalId};s.receipts.set(args.p_request_id,receipt);s.tables.efg_coach_plan_drafts[0].status='published';s.writes.push({rpc:name,args});if(s.loss==='publish')throw Error('fictional lost publish');return {data:goalId};}
  if(name==='ncc_professional_plan_receipt_v1')return {data:s.receipts.get(args.p_request_id)||null};
  if(name==='efg_confirm_payment'){s.tables.efg_payments[0].status=args.p_status;s.tables.efg_payments[0].reviewed_at=now;s.writes.push({rpc:name,args});if(s.loss==='payment')throw Error('fictional lost review');return {data:true};}
  throw Error('Unexpected fictional RPC '+name);
 }};
 const journal=createReleaseJournal(fakeIDB()),reader=createProfessionalReleaseAdapter({sdk,config:{explicitReleaseConfiguration:true,backendOrigin:sdk.supabaseUrl},enabled:true,journal,crypto:webcrypto});
 const create=()=>createProfessionalCoachTools({reader,enabled:true,journal,crypto:webcrypto,loadSeedIds:async()=>Object.keys(catalog.foods)});
 return {id,s,sdk,reader,original,create,async open(){await reader.selectOrganization(id.org);const tools=create();await tools.open(id.student,{studentName:'Alumno ficticio',coachName:'Coach ficticia'});return tools;},emit(event){for(const fn of listeners)fn(event);}};
}
