import vector from './professional-terms-v2-fixture-vector.json' with {type:'json'};
import {mountProfessionalWorkspaceReleasePanel} from '../pilot/professional-workspace-release-panel.mjs';
const user=vector.bundle.actor_id,org=vector.bundle.organization_id,personal='75000000-0000-4000-8000-000000000001',mentor='75000000-0000-4000-8000-000000000002',session='75000000-0000-4000-8000-000000000003';
const original={user_id:user,role:'student',email:'coach@example.invalid',nickname:'Alumna ficticia',active:true,organization_id:personal};
const state=JSON.parse(localStorage.getItem('ncc-release-ui-demo')||'null')||{legal:false,lost:false,writes:0,receipts:{},role:'student',seats:10,pending:0};
const save=()=>localStorage.setItem('ncc-release-ui-demo',JSON.stringify(state));
const listeners=new Set();
const sdk={supabaseUrl:'https://ncc.example.com',auth:{onAuthStateChange(cb){listeners.add(cb);return {data:{subscription:{unsubscribe(){listeners.delete(cb);}}}};},async getSession(){return {data:{session:{access_token:'a.'+btoa(JSON.stringify({session_id:session}))+'.b'}}};},async getUser(){return {data:{user:{id:user}}};}},from(table){
 if(table!=='efg_profiles')throw Error('Fixture only profile reads expected');const q={select(){return q;},eq(){return q;},single(){return q;},then(resolve){resolve({data:{...original,role:state.role,organization_id:state.role==='student'?personal:null}});}};return q;
},async rpc(name,args){
 if(name==='ncc_dual_workspace_contexts_v1')return {data:{user_id:user,active:true,profile_role:state.role,student_context:state.role==='student'?{organization_id:personal,coach_id:mentor,consent_accepted:true}:null,coach_contexts:state.role==='student'?[{id:org,coach_id:user,name:'Coach ficticia',is_test:true,legal_ready:state.legal,status:'active',seat_limit:state.seats,active_students:0,pending_invitations:state.pending}]:[],managed_coaches:state.role==='admin'?[{id:org,name:'Coach ficticia',seat_limit:state.seats,active_students:0,pending_invitations:state.pending}]:[]}};
 if(name==='ncc_pilot_workspace_legal_bundle_v2')return {data:vector.bundle};
 if(name==='ncc_pilot_workspace_receipt_v1'){if(state.receipts[args.p_request_id]?.operation==='acceptTerms'){state.legal=true;save();}return {data:state.receipts[args.p_request_id]||null};}
 if(name==='ncc_pilot_workspace_accept_terms_v2'){
  state.writes++;const result={contract_version:2,actor_id:user,organization_id:org,request_id:args.p_request_id,legal_ready:true,legal_binding_sha256:args.p_expected_binding_sha256};
  state.receipts[args.p_request_id]={operation:'acceptTerms',payload:{p_org:args.p_org,p_expected_binding_sha256:args.p_expected_binding_sha256},result};
  if(!state.lost)state.legal=true;save();if(state.lost)throw Error('Fictional lost response');return {data:result};
 }
 if(name==='ncc_pilot_workspace_set_seats_v1'){
  state.writes++;state.seats=args.p_seats;const result={organization_id:org,seat_limit:args.p_seats};state.receipts[args.p_request_id]={operation:'seats',payload:{p_org:args.p_org,p_seats:args.p_seats},result};save();return {data:result};
 }
 if(name==='ncc_pilot_workspace_roster_v1')return {data:[]};
 throw Error('Unsupported fictional RPC '+name);
}};
const config={backendOrigin:sdk.supabaseUrl,explicitReleaseConfiguration:true};
const root=document.querySelector('#professional');
const panel=mountProfessionalWorkspaceReleasePanel({root,sdk,config,enabled:true,
 readLegacyPersonal:()=>({profile:{...original,role:state.role,organization_id:state.role==='student'?personal:null},organization:{id:personal}}),
 onView:value=>{document.querySelector('#personal').hidden=value;document.querySelector('#personal').inert=value;}});
// Minimal workspace read used after acceptance; no application credentials or external requests.
const old=sdk.from;sdk.from=table=>{if(table==='efg_profiles')return old(table);if(table==='efg_organizations'){const q={select(){return q;},eq(){return q;},single(){return q;},then(resolve){resolve({data:{id:org,coach_id:user,payment_alias:null}});}};return q;}throw Error('Unexpected fictional table');};
window.fixture={state,save,original,ready:panel.ready,async reset(){panel.dispose();localStorage.removeItem('ncc-release-ui-demo');for(const name of ['ncc-professional-terms-journal-v1','ncc-professional-release-journal-v1'])await new Promise((res,rej)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=res;r.onerror=rej;r.onblocked=res;});},emit(event){for(const cb of listeners)cb(event);}};
