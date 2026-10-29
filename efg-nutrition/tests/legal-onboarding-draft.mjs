import assert from "node:assert/strict";
import {LEGAL_ONBOARDING_ENABLED,legalOutstanding,renderLegalOnboarding,makeLegalAcceptanceRequest} from "../pilot/legal-onboarding.js";
const hash="a".repeat(64);
const docs=["terms","privacy"].map(kind=>({kind,id:"20261029_"+kind,version:"2026.10",sha256:hash,status:"published",
 sections:[{heading:"Alcance",body:'Información clara de la plataforma, no un diagnóstico. <script>alert("XSS")</script>'}]}));
assert.equal(LEGAL_ONBOARDING_ENABLED,false,"Legal gate cannot be silently activated without backend and approved text");
assert.deepEqual(legalOutstanding(docs),["terms","privacy"]);
const ui=renderLegalOnboarding(docs);
assert.match(ui,/Antes de empezar/);
assert.match(ui,/Términos y Condiciones/);
assert.match(ui,/Política de Privacidad/);
assert.match(ui,/data-act="confirmLegalAcceptance"/);
assert.doesNotMatch(ui,/checked(?=>|\s)/,"No box can be prechecked");
assert.doesNotMatch(ui,/<script>/,"Escape untrusted legal text in UI");
assert.match(ui,/&lt;script&gt;/);
assert.throws(()=>makeLegalAcceptanceRequest(docs,[],{terms:true,privacy:false}),/separado/);
const req=makeLegalAcceptanceRequest(docs,[],{terms:true,privacy:true});
assert.equal(req.length,2);
assert.deepEqual(Object.keys(req[0]).sort(),["acceptance_method","document_id"]);
assert.ok(!JSON.stringify(req).includes("accepted_at"),"Client may not supply acceptance timestamp");
assert.ok(!JSON.stringify(req).includes("user_id"),"Client may not choose the account owner");
assert.ok(!JSON.stringify(req).includes("sha256"),"The server resolves the published hash");
const accepted=docs.map(d=>({kind:d.kind,document_id:d.id,version:d.version,document_hash_sha256:d.sha256}));
assert.deepEqual(legalOutstanding(docs,accepted),[]);
assert.equal(renderLegalOnboarding(docs,accepted),"");
const revised=docs.map(d=>({...d,version:d.kind==="terms"?"2026.11":d.version,
 id:d.kind==="terms"?"20261101_terms":d.id}));
assert.deepEqual(legalOutstanding(revised,accepted),["terms"]);
assert.deepEqual(makeLegalAcceptanceRequest(revised,accepted,{terms:true}),[{document_id:"20261101_terms",acceptance_method:"explicit_checkbox"}]);
for(const invalid of [
 docs.map(x=>({...x,status:"draft"})),
 [docs[0],docs[0]],
 docs.map(x=>({...x,sha256:"invalid"}))
])assert.throws(()=>renderLegalOnboarding(invalid),/legal|Documento|Faltan/i);
console.log("PASS: legal onboarding preview is opt-in, versioned, explicit, escaped and server-authoritative");
