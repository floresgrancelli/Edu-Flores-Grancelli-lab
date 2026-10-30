// COACH-67 · Legal bridge synthetic verified-doc source; NO real user/server.
import assert from "node:assert/strict";
import {COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED,loadCoachLegalOnboarding,
 renderCoachLegalOnboarding,acceptCoachLegalOnboarding} from "../pilot/coach-legal-bridge.js";
import {LEGAL_ONBOARDING_ENABLED} from "../pilot/legal-onboarding.js";
assert.equal(COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED,false);
assert.equal(LEGAL_ONBOARDING_ENABLED,false);
const terms="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const privacy="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const hash="a".repeat(64);
const text="Documento hipotético exclusivamente para pruebas: "+("Explica derechos, alcance, privacidad y condiciones en detalle. ").repeat(3)+"<script>alert('bad')</script>";
let docs=[
 {id:terms,kind:"terms",version:"2026.10",sha256:hash,content:text,status:"published"},
 {id:privacy,kind:"privacy",version:"2026.10",sha256:hash,content:text,status:"published"}
],accepted=new Set(),writes=0,queries=0,misreport=false;
const sb={
 rpc(name,payload){
  if(name==="efg_legal_current_status")
   return Promise.resolve({data:docs.map(d=>({kind:d.kind,document_id:d.id,version:d.version,sha256:d.sha256,
    accepted:accepted.has(d.id)})),error:null});
  assert.equal(name,"efg_accept_legal_documents");
  writes++;
  assert.deepEqual([...payload.p_document_ids].sort(),docs.filter(d=>!accepted.has(d.id)).map(d=>d.id).sort());
  if(!misreport)for(const id of payload.p_document_ids)accepted.add(id);
  return Promise.resolve({data:2,error:null});
 },
 from(name){
  assert.equal(name,"efg_legal_documents");queries++;
  return {select(){return this;},in(k,values){assert.equal(k,"id");assert.deepEqual([...values].sort(),docs.map(d=>d.id).sort());return this},
   limit(n){assert.equal(n,2);return Promise.resolve({data:docs,error:null})}};
 }
};
await assert.rejects(()=>loadCoachLegalOnboarding(sb),/no puede activarse/);
assert.equal(queries,0);assert.equal(writes,0);
const off=await assert.rejects(()=>acceptCoachLegalOnboarding(sb,{},{terms:true,privacy:true}),/aceptación legal explícita/);
assert.equal(writes,0);
const opts={enabled:true,legalEnabled:true};
const loaded=await loadCoachLegalOnboarding(sb,opts);
assert.deepEqual(loaded.missing,["terms","privacy"]);
const ui=renderCoachLegalOnboarding(loaded);
assert.match(ui,/Confirmar y continuar/);
assert.match(ui,/Términos y Condiciones completos/);
assert.match(ui,/Política de Privacidad completa/);
assert.match(ui,/&lt;script&gt;/);
assert.doesNotMatch(ui,/<script>/);
assert.doesNotMatch(ui,/checked(?=>|\s)/);
await assert.rejects(()=>acceptCoachLegalOnboarding(sb,loaded,{terms:true,privacy:false},
 {...opts,explicitSubmit:true}),/por separado/);
assert.equal(writes,0);
await assert.rejects(()=>acceptCoachLegalOnboarding(sb,loaded,{terms:true,privacy:true},opts),
 /aceptación legal explícita/);
assert.equal(writes,0);
const yes=await acceptCoachLegalOnboarding(sb,loaded,{terms:true,privacy:true},
 {...opts,explicitSubmit:true});
assert.deepEqual(yes.missing,[]);
assert.equal(renderCoachLegalOnboarding(yes),"");
assert.equal(writes,1);
// The old accepted document ID cannot authorize a newly published version.
docs=docs.map((d,i)=>i===0?{...d,id:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",version:"2026.11"}:d);
const refresh=await loadCoachLegalOnboarding(sb,opts);
assert.deepEqual(refresh.missing,["terms"]);
misreport=true;
await assert.rejects(()=>acceptCoachLegalOnboarding(sb,refresh,{terms:true},{...opts,explicitSubmit:true}),/servidor no confirmó/);
assert.equal(writes,2);
console.log("PASS COACH-67: legal docs are exact version/hash, checked individually, HTML escaped, RPC explicit, readback mandatory and all flags OFF.");
