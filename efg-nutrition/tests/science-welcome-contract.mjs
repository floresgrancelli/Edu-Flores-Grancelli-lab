import './student-navigation-contract.mjs';
import {expectedReleaseFlag} from './approved-release-flags.mjs';
// BRAND-77B: synthetic offline tests. Do not claim hosted deployment.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {SCIENCE_STEPS,SCIENCE_WELCOME_ENABLED,SCIENCE_WELCOME_VERSION,sciencePanels,
 renderScienceWelcomeStep,renderScienceVerticalView,readScienceWelcomeStatus,
 acknowledgeScienceWelcome} from "../pilot/science-welcome.js";
assert.equal(SCIENCE_WELCOME_ENABLED,expectedReleaseFlag("SCIENCE_WELCOME_ENABLED"));
const ownerEight=readFileSync(new URL("../pilot/assets/ncc-p26m-owner-eight-reference.jpg",import.meta.url));
assert.equal(ownerEight.length,479092);
assert.equal(createHash("sha256").update(ownerEight).digest("hex"),"4ca3067e7508cf7e887422d0c8b375c6b3a71e563231f06e4ad3e186f802f2b4");
assert.deepEqual(SCIENCE_STEPS,[
 "Portada: Nutrición Con-Ciencia","¿Qué son las calorías?","Los macronutrientes",
 "La proteína y el entrenamiento","¿Qué pasa si consumo más?",
 "El mito de los hidratos de carbono","Cómo se combinan en tu día",
 "Conclusiones","Serotonina · cierre"
]);
const panels=sciencePanels();
assert.equal(panels.length,9);
assert.match(renderScienceWelcomeStep(0),/ns-owner-reference-art-1/);
assert.match(renderScienceWelcomeStep(7),/ns-owner-reference-art-8/);
assert.doesNotMatch(renderScienceWelcomeStep(8),/ns-owner-reference-art/);
assert.match(renderScienceWelcomeStep(0),/ns-owner-reference-transcript/);
assert.match(panels[3],/¿Por qué importa moverse\?/);
assert.match(panels[3],/Caminar, bailar, andar en bicicleta/);
assert.match(renderScienceVerticalView(),/¿Por qué importa moverse\?/);
assert.match(renderScienceVerticalView(),/https:\/\/www\.who\.int\/news-room\/fact-sheets\/detail\/physical-activity/);
const eduSource=readFileSync(new URL("../pilot/nutrition-science.js",import.meta.url),"utf8");
assert.doesNotMatch(eduSource,/EFG LAB · APRENDÉ/,"Former visible laboratory brand");
assert.match(eduSource,/NUTRICIÓN CON-CIENCIA · APRENDÉ EN 5 MINUTOS/);

const texts=["Nutrición","¿Qué son las calorías?","Los tres macros",
 "¿Por qué importa la proteína","¿Más proteínas que grasas?",
 "Los hidratos no son el villano","Cómo combinar tus alimentos","Conclusiones para recordar","Más que nutrición"];
for(let i=0;i<9;i++){
 assert.ok(panels[i].includes(texts[i]),"missing content step "+(i+1));
 const html=renderScienceWelcomeStep(i);
 assert.ok(html.includes('data-science-step="'+(i+1)+'"'));
 assert.ok(html.includes((i+1)+" de 9"));
 assert.doesNotMatch(html,/data-act="scienceSkip"/,
  "The introductory slideshow cannot jump over any of the nine approved pages");
 if(i<8){
  assert.match(html,new RegExp("ns-owner-reference-art-"+(i+1)+"(?:\\\"|\\s)"),
   "The "+(i+1)+"th owner panel must use the corresponding 4x2 image crop");
  assert.match(html,/<figure class="ns-owner-reference"/);
  assert.match(html,/<figcaption class="ns-owner-reference-transcript">/);
  assert.doesNotMatch(html,/ns-(?:hero|intro|macro-grid|protein-focus|balance|myth|meal-grid|conclusions)/,
   "Older alternate educational HTML must never be rendered behind owner images");
 }else{
  assert.doesNotMatch(html,/ns-owner-reference-art/);
 }
 if(i===0){assert.doesNotMatch(html,/data-act="sciencePrev"/);assert.match(html,/data-act="scienceNext"/);}
 else if(i===8){assert.match(html,/data-act="scienceFinish"/);assert.match(html,/Comenzar/);assert.doesNotMatch(html,/data-act="scienceNext"/);}
 else{assert.match(html,/data-act="sciencePrev"/);assert.match(html,/data-act="scienceNext"/);}
}
assert.throws(()=>renderScienceWelcomeStep(-1),RangeError);
assert.throws(()=>renderScienceWelcomeStep(9),RangeError);
const errorHtml=renderScienceWelcomeStep(3,{busy:true,error:"No <b> permitido"});
assert.match(errorHtml,/role="alert"/);
assert.match(errorHtml,/No &lt;b&gt; permitido/);
assert.doesNotMatch(errorHtml,/No <b>/);
assert.match(errorHtml,/aria-busy="true"/);
const vertical=renderScienceVerticalView();
assert.equal((vertical.match(/class="ns-library-panel(?: |")/g)||[]).length,9);
assert.equal((vertical.match(/data-science-step="/g)||[]).length,9);
assert.match(vertical,/Preguntas que aparecen siempre/);
assert.match(vertical,/¿De dónde sale esta información/);
assert.match(vertical,/Conocimiento hoy. Mejores decisiones mañana/);
assert.ok(vertical.indexOf("Conclusiones para recordar")<vertical.indexOf("Más que nutrición"),"scientific summary precedes approved brand finale");
const finale=renderScienceWelcomeStep(8);
assert.match(renderScienceWelcomeStep(7),/aria-label="Conclusiones"/);
assert.doesNotMatch(renderScienceWelcomeStep(7),/data-act="scienceFinish"/);
assert.match(finale,/data-act="scienceFinish"/);
assert.match(finale,/Más que nutrición/);
assert.match(finale,/serotonina-acuarela\.avif/);
assert.match(finale,/Molécula de serotonina en acuarela/);
assert.match(finale,/No depende de una sola cosa|no depende de una sola cosa/);
assert.match(finale,/Nutrirte mejor también puede ayudarte a sentirte mejor/);
assert.ok(!/cura la ansiedad|aumenta la serotonina cerebral|eleva la serotonina/.test(finale),"no unsupported biochemical promise");
const wellbeingCss=readFileSync(new URL("../pilot/science-wellbeing.css",import.meta.url),"utf8");
assert.match(wellbeingCss,/\.ns-wellbeing-logo/);
assert.match(wellbeingCss,/@media\(max-width:520px\)/);
assert.match(readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8"),/science-wellbeing\.css\?v=ncc-pilot-3a40474052be/);
assert.match(vertical,/La proteína acompaña al entrenamiento/);
const uid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const profile={user_id:uid,active:true,role:"student"};
let stored=null,queries=0,changes=0;
const sb={
 auth:{getUser:async()=>({data:{user:{id:uid}},error:null})},
 from(table){assert.equal(table,"efg_science_intro_receipts");
  return {select(cols){assert.equal(cols,"user_id,version,seen_at");return this},
   eq(k,v){assert.ok(k==="user_id"&&v===uid||k==="version"&&v===SCIENCE_WELCOME_VERSION);return this},
   maybeSingle(){queries++;return Promise.resolve({data:stored,error:null})}};
 },
 rpc(name,args){
  assert.equal(name,"efg_ack_science_intro");
  assert.equal(args.p_version,SCIENCE_WELCOME_VERSION);
  assert.ok(["completed","skipped"].includes(args.p_action));changes++;
  stored??={user_id:uid,version:SCIENCE_WELCOME_VERSION,seen_at:"2026-10-30T15:00:00.123Z"};
  return Promise.resolve({data:true,error:null});
 }
};
assert.equal((await readScienceWelcomeStatus(sb,{profile,userId:uid})).pending,true);
await assert.rejects(()=>readScienceWelcomeStatus(sb,{profile,userId:other}),/validar/);
await assert.rejects(()=>readScienceWelcomeStatus(sb,{profile:{...profile,role:"admin"},userId:uid}),/validar/);
await assert.rejects(()=>acknowledgeScienceWelcome(sb,{profile,userId:uid,action:"skipped"}),/explícita/);
await assert.rejects(()=>acknowledgeScienceWelcome(sb,{profile,userId:uid,action:"opened",explicitClick:true}),/explícita/);
assert.equal(changes,0);
await assert.rejects(()=>acknowledgeScienceWelcome({auth:sb.auth,rpc:async()=>({data:false,error:null})},{profile,userId:uid,action:"completed",explicitClick:true}),/no confirmó/);
const readsBeforeAck=queries;
const confirmed=await acknowledgeScienceWelcome(sb,{profile,userId:uid,action:"skipped",explicitClick:true});
assert.equal(confirmed.pending,false);
assert.equal(changes,1);
assert.equal(queries,readsBeforeAck+1,"must read back authenticated receipt after explicit RPC");
assert.equal((await readScienceWelcomeStatus(sb,{profile,userId:uid})).pending,false);
await acknowledgeScienceWelcome(sb,{profile,userId:uid,action:"completed",explicitClick:true});
assert.equal(changes,2);
// Regression: an old network response must not show account A's receipt to B.
let statusIdentityReads=0;
const changedDuringStatus={...sb,auth:{getUser:async()=>({
 data:{user:{id:++statusIdentityReads===1?uid:other}},error:null
})}};
await assert.rejects(
 ()=>readScienceWelcomeStatus(changedDuringStatus,{profile,userId:uid}),
 /La sesión cambió/);
assert.equal(statusIdentityReads,2,"Read result must verify session again");
// An explicit receipt sent during account switching cannot be presented as confirmed.
let ackIdentityReads=0,ackRpcCalls=0;
const changedDuringAck={auth:{getUser:async()=>({
 data:{user:{id:++ackIdentityReads===1?uid:other}},error:null
})},rpc:async()=>{ackRpcCalls++;return {data:true,error:null}}};
await assert.rejects(
 ()=>acknowledgeScienceWelcome(changedDuringAck,{profile,userId:uid,
  action:"completed",explicitClick:true}),/La sesión cambió/);
assert.equal(ackRpcCalls,1);
assert.equal(ackIdentityReads,2,"Receipt RPC must be followed by identity re-check");
await assert.rejects(
 ()=>readScienceWelcomeStatus({...sb,auth:{getUser:async()=>({data:{user:null},error:null})}},
 {profile,userId:uid}),/La sesión cambió/);
await assert.rejects(
 ()=>acknowledgeScienceWelcome({rpc:async()=>({data:true,error:null})},
 {profile,userId:uid,action:"skipped",explicitClick:true}),/verificar tu sesión/);
const sql=readFileSync(new URL("../docs/BRAND77B_SCIENCE_WELCOME_STAGING_ONLY.sql",import.meta.url),"utf8");
assert.match(sql,/nut57_isolated_staging_marker/);
assert.match(sql,/alter table public\.efg_science_intro_receipts enable row level security/);
assert.match(sql,/using\(user_id=\(select auth\.uid\(\)\)\)/);
assert.match(sql,/on conflict\(user_id,version\) do nothing/);
assert.match(sql,/p\.role in \('student','coach'\)/);
assert.match(sql,/revoke all on public\.efg_science_intro_receipts from public,anon,authenticated/);
assert.doesNotMatch(sql,/grant (insert|update|delete) on public\.efg_science_intro_receipts/i);
const pilot=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const welcomeFirst=pilot.indexOf('if(state.profile.role==="student"&&SCIENCE_WELCOME_ENABLED&&');
const releaseLegal=pilot.indexOf('if(MAJOR_RELEASE_FLOW_ENABLED&&RELEASE_COMMUNICATIONS_ENABLED&&state.majorRelease');
const pilotLegal=pilot.indexOf('if(state.profile.role==="student"&&COACH_STUDENT_JOURNEY_ENABLED){');
assert.ok(welcomeFirst>0&&welcomeFirst<releaseLegal&&releaseLegal<pilotLegal,
 'The nine introductory screens precede BOTH current legal routes');
assert.match(pilot,/state\.scienceWelcomePending=true;\s*state\.scienceWelcomeError=/,
 'A failed introduction receipt lookup cannot silently skip the nine screens');
assert.match(pilot,/renderScienceWelcomeStep\(state\.scienceWelcomeStep/);
assert.match(pilot,/scienceNext","sciencePrev","scienceFinish"/);
assert.doesNotMatch(pilot,/scienceSkip/,"Do not allow jumping past original owner images");
assert.match(pilot,/scienceWelcomePending=false;state\.scienceWelcomeStep=0/);
assert.match(pilot,/nutritionScience:renderScienceVerticalView/);
assert.match(pilot,/:role==="admin"\?\[\["admin"[\s\S]*?\["nutritionScience","✦","Nutrición Con-Ciencia"\]/);
assert.match(pilot,/state\.scienceWelcomePending=intro\.pending/);
assert.match(pilot,/if\(state\.coachPilotEntry\.route!=="ready"\)return render\(\)/);
assert.match(pilot,/if\(state\.welcomePending\)return welcomeView\(\);/);
console.log("PASS P26M: eight illustrated topics, Conclusions #8 and watercolor serotonin closing #9; nine shared panels, receipts and safe navigation. OFFLINE ONLY.");


assert.equal((vertical.match(/class="ns-topic"/g)||[]).length,10);
assert.doesNotMatch(vertical,/<details[^>]* open/);
for(const panel of panels.slice(1))assert.ok(vertical.includes(panel),"Original scientific panel retained verbatim");
