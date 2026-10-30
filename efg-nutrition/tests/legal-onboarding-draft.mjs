import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
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


// SEC-10: OTP proves identity only, never serves as consent to share health data.
// Legacy sessionStorage flags may be removed but cannot grant any permissions.
const pilot=readFileSync("efg-nutrition/pilot/pilot.js","utf8");
const otp=pilot.split("async function confirmOtp(token){")[1]?.split("function sessionConnectionRetry(){")[0];
assert.ok(otp,"OTP handler must exist");
assert.match(otp,/auth\.verifyOtp\(\{email,token:code,type:"email"\}\)/);
assert.doesNotMatch(otp,/efg_consents|efgNutritionCoachConsent|sessionStorage\.setItem/,
 "OTP confirmation must never create Coach sharing permission");
const refresh=pilot.split("async function refresh(){")[1]?.split("// Explicit pull-to-refresh")[0];
assert.ok(refresh,"Authenticated refresh must exist");
assert.doesNotMatch(refresh,/acceptedNotice|\.from\("efg_consents"\)\.update/,
 "Reopening a logged-in session must not auto-grant Coach data access");
assert.match(refresh,/sessionStorage\.removeItem\("efgNutritionCoachConsent:"\+id\)/,
 "Any stale legacy OTP consent flag must be discarded");
assert.match(pilot,/data-act="grantConsent"/,
 "A dedicated voluntary Coach-sharing action is required");
const consentAction=pilot.split('if(action==="revokeConsent"||action==="grantConsent"){')[1]?.split('if(action==="saveWeight")')[0];
assert.ok(consentAction);
assert.match(consentAction,/state\.profile\?\.role!=="student"/,
 "Only the Student can invoke their own sharing consent UI action");
assert.match(consentAction,/accepted&&!window\.confirm\(/,
 "Grant requires a separate, affirmative user interaction");
assert.match(consentAction,/\.eq\("student_id",state\.session\.user\.id\)/,
 "Never change another person's consent");
assert.match(pilot,/Este código verifica únicamente tu identidad\. No autoriza a compartir tus datos/);
assert.doesNotMatch(pilot,/ingresar con tu código\. Podés retirar el permiso/,
 "Privacy panel must not represent OTP entry as Coach sharing consent");
console.log("PASS SEC-10: authentication and Coach health-data sharing are separate opt-in actions.");
