// COACH115-117: authenticated legal versions + two explicit receipts.
// Synthetic client QA only, without accounts/credentials; hosted migration
// presence and RLS/grants are verified separately with read-only SQL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCoachPilotLegal,renderCoachPilotLegal,readCoachPilotLegalSelections,
 submitCoachPilotLegal} from '../pilot/coach-pilot-legal-client.js';
import {validateCoachPilotEntryResponse} from '../pilot/coach-pilot-entry-client.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const terms='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const privacy='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const hash='1'.repeat(64);
const version='coach_major_2026_r1';
const body='Contenido legal verificado y sujeto a revisión profesional. '.repeat(12);
let statuses=[
 {kind:'terms',document_id:terms,version,sha256:hash,accepted:false},
 {kind:'privacy',document_id:privacy,version,sha256:hash,accepted:false}
];
let docs=[
 {id:terms,kind:'terms',version,sha256:hash,body,is_current:true,published_at:'2026-10-30T00:00:00Z'},
 {id:privacy,kind:'privacy',version,sha256:hash,body,is_current:true,published_at:'2026-10-30T00:00:00Z'}
];
const profile={user_id:id,role:'student',active:true};
let calls=[];
function mocked(user=id){
 return {
  auth:{getUser:async()=>({data:{user:{id:user}},error:null})},
  rpc:async(name,payload)=>{
   calls.push({name,payload});
   if(name==='efg_legal_current_status')return {data:structuredClone(statuses),error:null};
   if(name==='efg_accept_current_legal'){
    assert.deepEqual(Object.keys(payload).sort(),
     ['p_privacy_checked','p_privacy_id','p_terms_checked','p_terms_id'].sort());
    if(payload.p_terms_checked&&payload.p_privacy_checked){
     statuses=statuses.map(x=>({...x,accepted:true}));return {data:true,error:null};
    }
   }
   return {data:null,error:{message:'denied'}};
  },
  from:t=>{assert.equal(t,'efg_legal_documents');return {
   select:()=>({in:()=>({limit:async()=>({data:structuredClone(docs),error:null})})})
  }}
 };
}
let sb=mocked();
let snapshot=await loadCoachPilotLegal(sb,{profile});
assert.equal(snapshot.ready,true);assert.equal(snapshot.accepted,false);
// Even if an operator accidentally marks a draft as current, the client
// must refuse to present it for acceptance or record a receipt.
const baselineDocs=structuredClone(docs);
for(const marker of ['[PENDIENTE: responsable]', 'BORRADOR NO PUBLICAR', 'NO EN VIGENCIA', 'ESTADO: NO APROBADO']){
 docs=structuredClone(baselineDocs);
 docs[0].body=marker+' '+body;
 await assert.rejects(loadCoachPilotLegal(mocked(),{profile}),/borradores no aprobados/);
}
docs=baselineDocs;
assert.equal(calls.filter(x=>x.name==='efg_accept_current_legal').length,0);
const html=renderCoachPilotLegal(snapshot);
assert.match(html,/Términos y Condiciones/);
assert.match(html,/Política de Privacidad/);
assert.match(html,/checkbox/);
assert.doesNotMatch(html,/<input[^>]*\bchecked\b/, 'The consent checkboxes must start unselected');
const selections=()=>readCoachPilotLegalSelections({getElementById:key=>({
 checked:key==='efgCoachPilotLegal_terms'||key==='efgCoachPilotLegal_privacy'
})},snapshot);
assert.throws(()=>readCoachPilotLegalSelections({getElementById:()=>({checked:false})},snapshot),
 /ambas casillas/);
let sel=selections();
assert.equal(sel.p_terms_id,terms);assert.equal(sel.p_privacy_id,privacy);
await assert.rejects(submitCoachPilotLegal(sb,snapshot,sel,{explicitSubmit:false,profile}),
 /requiere confirmar/);
const accepted=await submitCoachPilotLegal(sb,snapshot,sel,{explicitSubmit:true,profile});
assert.equal(accepted.accepted,true);
assert.equal(calls.filter(x=>x.name==='efg_accept_current_legal').length,1);
// Do not render A's consent receipt to B after a session switch mid-fetch.
const switched=mocked();
let legalAuthChecks=0;
switched.auth.getUser=async()=>({data:{user:{id:++legalAuthChecks===1?id:privacy}},error:null});
await assert.rejects(loadCoachPilotLegal(switched,{profile}),/sesión cambió/);
assert.equal(legalAuthChecks,2);
await assert.rejects(loadCoachPilotLegal(mocked(privacy),{profile}),/verificar tu cuenta/);
statuses=[];
const absent=await loadCoachPilotLegal(mocked(),{profile});
assert.equal(absent.ready,false);
assert.match(renderCoachPilotLegal(absent),/Documentos en preparación/);
assert.doesNotMatch(renderCoachPilotLegal(absent),/data-act="acceptCoachPilotLegal"/);
const base={route:'legal',can_log_meals:false,legal_current_accepted:false,
 participation_confirmed:false,general_intake_shared:false,
 required_pilot_version:'coach_pilot_2026_demo1',
 required_intake_version:version,requires_separate_health_consent:true};
assert.equal(validateCoachPilotEntryResponse(base).route,'legal');
assert.equal(validateCoachPilotEntryResponse({...base,route:'ready',
 legal_current_accepted:false,can_log_meals:true,participation_confirmed:true,
 general_intake_shared:true}).canLogMeals,false);
const sql=readFileSync(new URL('../migrations/20261030_coach115_versioned_legal_documents_receipts.sql',import.meta.url),'utf8');
for(const part of ['efg_legal_documents','efg_legal_acceptances',
 'efg_legal_current_status','efg_accept_current_legal','p_terms_checked','p_privacy_checked',
 'pg_catalog.sha256','for share','enable row level security','from public,anon,authenticated',
 'grant execute on function public.efg_accept_current_legal'])assert.ok(sql.includes(part),part);
assert.doesNotMatch(sql,/insert into public\.efg_legal_documents/i,'Documents are unseeded until approved');
assert.match(sql,/insert into public\.efg_legal_acceptances\(user_id,document_id\)/i,
 'Only authenticated server RPC creates explicit legal receipts');
assert.equal((sql.match(/insert into public\.efg_legal_acceptances\(/gi)||[]).length,1,
 'There is exactly one receipt insertion path in the signed RPC');
const upgraded=readFileSync(new URL('../migrations/20261030_coach116_legal_first_student_status.sql',import.meta.url),'utf8');
assert.match(upgraded,/if v_current_legal_count<>2 then/);
assert.match(upgraded,/\x27route\x27,\x27legal\x27,\x27can_log_meals\x27,false/);
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
assert.match(app,/state\.coachPilotLegal=await loadCoachPilotLegal\(sb/);
assert.match(app,/renderCoachPilotLegal\(state\.coachPilotLegal\)/);
assert.match(app,/if\(action==="acceptCoachPilotLegal"\)/);
assert.match(app,/await submitCoachPilotLegal\(sb/);
console.log('PASS COACH115-117: signed separate legal versioned receipts, fail-closed missing docs, legal route before MI DIA; no medical consent inferred.');
