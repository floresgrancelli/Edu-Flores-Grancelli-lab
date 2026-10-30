// NUT-60 signed-token experiments, LOCAL Supabase only, NEVER hosted.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomBytes,randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
const lines=readFileSync(process.env.EFG_LOCAL_STATUS_ENV||"","utf8").split(/\r?\n/);
const settings=Object.fromEntries(lines.filter(x=>x.includes("=")).map(x=>{
 const i=x.indexOf("=");return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,"")];
}));
const base=settings.API_URL,key=settings.ANON_KEY||settings.PUBLISHABLE_KEY;
assert.ok(base&&key,"Missing local-only GoTrue credentials");
const u=new URL(base);
assert.equal(u.protocol,"http:");
assert.ok(["localhost","127.0.0.1"].includes(u.hostname));
assert.equal(u.port,"54321");
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.equal(process.env.SUPABASE_DB_PASSWORD,undefined);
const db={...process.env,PGHOST:"127.0.0.1",PGPORT:"54322",PGDATABASE:"postgres",PGUSER:"postgres",PGPASSWORD:"postgres"};
function sql(q){
 const p=spawnSync("psql",["-X","-Atq","-v","ON_ERROR_STOP=1","-c",q],{env:db,encoding:"utf8",timeout:30000});
 assert.equal(p.status,0,(p.stderr||p.stdout||"SQL failed").slice(0,800));
 return p.stdout.trim();
}
async function rest(path,{method="GET",token,body}={}){
 const res=await fetch(base+path,{
  method,headers:{"Content-Type":"application/json",apikey:key,Authorization:"Bearer "+(token||key)},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(16000)
 });
 const t=await res.text();let data;try{data=JSON.parse(t)}catch{data=t}
 return {ok:res.ok,status:res.status,data};
}
function yes(r,n){assert.equal(r.ok,true,n+" "+r.status+" "+JSON.stringify(r.data).slice(0,250));return r.data}
function no(r,n){assert.equal(r.ok,false,n+" unexpectedly succeeded "+JSON.stringify(r.data).slice(0,200))}
const suffix=randomBytes(6).toString("hex"),pw=randomBytes(18).toString("hex")+"!Aa2";
async function signup(name){
 const x=yes(await rest("/auth/v1/signup",{method:"POST",body:{
  email:"nut60-"+name+"-"+suffix+"@example.invalid",password:pw
 }}),"Signed local GoTrue signup for "+name);
 assert.ok(x.access_token&&x.user?.id);
 assert.equal(x.access_token.split(".").length,3);
 assert.equal(yes(await rest("/auth/v1/user",{token:x.access_token}),"Check real signed identity").id,x.user.id);
 return {id:x.user.id,token:x.access_token};
}
const a=await signup("personalA"),b=await signup("personalB");
const coachBefore={
 goals:sql("select count(*) from public.efg_goals"),
 guides:sql("select count(*) from public.efg_food_plans"),
 notifications:sql("select count(*) from public.efg_notifications"),
 studentDaily:sql("select count(*) from public.efg_daily_logs")
}; // Earlier coach and compatibility QA may legitimately add more than one row.

const rpc=(name,user,body)=>rest("/rest/v1/rpc/"+name,{method:"POST",token:user?.token,body});
const status=user=>rpc("efg_legal_current_status",user,{});
const reg=(user,name)=>rpc("efg_register_personal",user,{p_nickname:name});
const goals=(user)=>rest("/rest/v1/efg_personal_goals?select=user_id,revision,kcal,goal_type&order=revision.asc",{token:user?.token});
const accounts=(user)=>rest("/rest/v1/efg_personal_accounts?select=user_id",{token:user?.token});
const docs=yes(await status(a),"A reads published synthetic documents");
assert.equal(docs.length,2,"Two fictional published legal docs required");
assert.ok(docs.every(d=>!d.accepted));
no(await reg(a,"Personal A"),"A cannot self-enroll before any legal acceptance");
no(await reg(null,"Anonymous"),"Anonymous cannot self-register");
const allDocs=docs.map(x=>x.document_id);
no(await rpc("efg_accept_legal_documents",a,{p_document_ids:allDocs.slice(0,1)}),
 "LEG-07 must reject incomplete terms/privacy document sets atomically");
no(await reg(a,"Personal A"),"Personal registration still denied after incomplete legal attempt");
assert.equal(Number(yes(await rpc("efg_accept_legal_documents",a,{p_document_ids:allDocs}),
 "A explicitly accepts BOTH documents in one signed transaction")),2);
assert.equal(yes(await reg(a,"Personal A"),"A self-enrolls with own signed identity"),a.id);
no(await reg(a,"Duplicate A"),"Cannot re-register an already enrolled profile");
no(await reg(b,"Personal B"),"B must accept independently; cannot inherit A acceptance");
assert.equal(Number(yes(await rpc("efg_accept_legal_documents",b,{p_document_ids:allDocs}),"B accepts terms/privacy")),2);
assert.equal(yes(await reg(b,"Personal B"),"B creates own distinct personal account"),b.id);
assert.equal(sql("select count(*) from public.efg_profiles where role='personal' and organization_id is null"),"2");
assert.equal(sql("select count(*) from public.efg_personal_accounts"),"2");
assert.equal(sql("select count(*) from public.efg_profiles where role='personal' and organization_id is not null"),"0");
const aa=yes(await accounts(a),"A reads own personal workspace");
const bb=yes(await accounts(b),"B reads own personal workspace");
assert.deepEqual(aa,[{user_id:a.id}]);
assert.deepEqual(bb,[{user_id:b.id}]);
no(await rest("/rest/v1/efg_personal_accounts",{method:"POST",token:a.token,body:{user_id:b.id}}),
 "A cannot forge B workspace through REST");
no(await rest("/rest/v1/efg_profiles",{method:"POST",token:a.token,body:{
 user_id:a.id,role:"admin",organization_id:null,email:"forged@example.invalid",nickname:"Forged"
}}),"Personal cannot grant admin role by direct REST");
const goal={goal_type:"recomp",kcal:2300,protein_g:130,carb_g:260,fat_g:70,fiber_g:30};
const save=(user,body)=>rpc("efg_save_personal_goal",user,body);
no(await save(null,{p_goal:goal,p_expected_revision:null}),"Anon cannot save personal goals");
assert.equal(Number(yes(await save(a,{p_goal:goal,p_expected_revision:null}),"Personal A saves goal revision1")),1);
no(await save(a,{p_goal:goal,p_expected_revision:null}),"Stale revision cannot overwrite");
no(await save(a,{p_goal:{...goal,kcal:100},p_expected_revision:1}),"Out of range goal must fail");
no(await save(a,{p_goal:{...goal,kcal:2150.5},p_expected_revision:1}),"Fractional kcal must not silently round");
no(await save(a,{p_goal:{...goal,user_id:b.id},p_expected_revision:1}),"A cannot embed another account's user id in goal");
no(await rest("/rest/v1/efg_personal_goals",{method:"POST",token:a.token,body:{
 user_id:a.id,revision:4,...goal
}}),"Direct REST insertion bypass must be denied");
const revised={...goal,kcal:2200};
assert.equal(Number(yes(await save(a,{p_goal:revised,p_expected_revision:1}),"Personal A revises own goal")),2);
assert.deepEqual(yes(await goals(b),"B cannot read A's personal goals"),[],"Cross-owner RLS");
const self=yes(await goals(a),"A sees own goal revisions");
assert.equal(self.length,2);
assert.deepEqual(self.map(x=>x.revision),[1,2]);
assert.equal(self[0].kcal,2300);
assert.equal(self[1].kcal,2200);
assert.ok(self.every(x=>x.user_id===a.id));
assert.equal(Number(yes(await save(b,{p_goal:goal,p_expected_revision:null}),"B saves independent revision")),1);
assert.equal(yes(await goals(b),"B sees only B").length,1);
assert.equal(sql("select count(*) from public.efg_personal_goals"),"3");
assert.equal(sql("select count(*) from public.efg_goals"),coachBefore.goals,"Personal goals cannot write coach goal history");
assert.equal(sql("select count(*) from public.efg_food_plans"),coachBefore.guides,"Personal goals cannot write coach guide");
assert.equal(sql("select count(*) from public.efg_notifications"),coachBefore.notifications,"Personal goal changes cannot fake Coach notifications");
// NUT-60 step B: isolated Personal diary, meal presets and cross-account RLS.
// This tests OWNERSHIP only; reconsent gating for old JS writes is still a release blocker.
const logDay="2026-10-30";
const diaryPath="/rest/v1/efg_personal_daily_logs";
const todayLog={user_id:a.id,log_day:logDay,
 meals:{desayuno:[{id:"egg",qty:2}]},sports:[],skipped:{},totals:{}};
yes(await rest(diaryPath,{method:"POST",token:a.token,body:todayLog}),"A owns personal breakfast");
const dayA=yes(await rest(diaryPath+"?select=user_id,log_day,meals&log_day=eq."+logDay,{token:a.token}),"A reads own breakfast");
assert.equal(dayA.length,1);
assert.equal(dayA[0].user_id,a.id);
assert.equal(dayA[0].meals.desayuno[0].qty,2);
assert.deepEqual(yes(await rest(diaryPath+"?select=user_id&log_day=eq."+logDay,{token:b.token}),
 "B can read only own empty diary"),[]);
no(await rest(diaryPath,{method:"POST",token:b.token,body:{...todayLog,log_day:"2026-10-29"}}),
 "B cannot impersonate A by supplying A user_id");
const maliciousPatch=await rest(diaryPath+"?user_id=eq."+a.id+"&log_day=eq."+logDay,{
 method:"PATCH",token:b.token,body:{meals:{desayuno:[{id:"egg",qty:99}]}}
});
assert.ok([200,204,401,403,404].includes(maliciousPatch.status),"Cross-owner PATCH rejected or zero affected rows");
const intact=yes(await rest(diaryPath+"?select=meals&log_day=eq."+logDay,{token:a.token}),"A diary intact");
assert.equal(intact[0].meals.desayuno[0].qty,2);
yes(await rest(diaryPath+"?user_id=eq."+a.id+"&log_day=eq."+logDay,{
 method:"PATCH",token:a.token,body:{meals:{desayuno:[{id:"egg",qty:3}]}}
}),"A corrects own diary");
const corrected=yes(await rest(diaryPath+"?select=meals&log_day=eq."+logDay,{token:a.token}),"A corrected diary read");
assert.equal(corrected[0].meals.desayuno[0].qty,3);
assert.equal(sql("select count(*) from public.efg_personal_daily_logs"),"1");
const favPath="/rest/v1/efg_personal_habitual_meals";
const fav={user_id:a.id,meal_slot:"desayuno",name:"Desayuno propio",items:[{id:"egg",qty:3}]};
yes(await rest(favPath,{method:"POST",token:a.token,body:fav}),"A saves own reusable meal");
const ownFav=yes(await rest(favPath+"?select=id,user_id,meal_slot,name,items",{token:a.token}),"A reads own preset");
assert.equal(ownFav.length,1);
assert.equal(ownFav[0].name,"Desayuno propio");
assert.equal(ownFav[0].user_id,a.id);
assert.deepEqual(yes(await rest(favPath+"?select=id,user_id",{token:b.token}),"B cannot read A preset"),[]);
no(await rest(favPath,{method:"POST",token:b.token,
 body:{...fav,name:"Forged cross-account meal"}}),"B cannot save A preset");
await rest(favPath+"?id=eq."+ownFav[0].id,{method:"DELETE",token:b.token});
assert.equal(yes(await rest(favPath+"?select=id",{token:a.token}),"A preset remains after B delete attempt").length,1);
// LEG-07 regression: legal version changes must prevent NEW personal writes,
// but self-read and self-deletion remain possible for privacy/access rights.
const terms=docs.find(d=>d.kind==="terms");
const newTermsId=randomUUID();
sql("update public.efg_legal_documents set status='retired',retired_at=now() where id='"+terms.document_id+"'");
sql("insert into public.efg_legal_documents(id,kind,version,content,sha256,locale,published_at,effective_at,status) "+
 "select '"+newTermsId+"','terms','synthetic-personal-3',x.body,"+
 "encode(sha256(convert_to(x.body,'UTF8')),'hex'),'es-AR',now(),now(),'published' "+
 "from (select repeat('SYNTHETIC PERSONAL TERMS REVISION ONLY. ',4) as body) x");
const changed=yes(await status(a),"Current fictional Terms after version rotation");
assert.equal(changed.find(x=>x.kind==="terms").accepted,false);
assert.equal(changed.find(x=>x.kind==="privacy").accepted,true);
no(await save(a,{p_goal:{...goal,kcal:2100},p_expected_revision:2}),
 "Personal goal revision must stop until new legal version accepted");
no(await rest(diaryPath+"?user_id=eq."+a.id+"&log_day=eq."+logDay,{
 method:"PATCH",token:a.token,body:{meals:{desayuno:[{id:"egg",qty:4}]}}
}),"Personal diary update must be gated by CURRENT legal versions");
no(await rest(diaryPath,{method:"POST",token:a.token,
 body:{...todayLog,log_day:"2026-10-29"}}),"Personal diary INSERT must stop with stale legal acceptance");
no(await rest(favPath,{method:"POST",token:a.token,
 body:{...fav,name:"Should not write"}}),"New favorites cannot be written before new terms accepted");
assert.equal(yes(await rest(diaryPath+"?select=meals&log_day=eq."+logDay,{token:a.token}),
 "Person can still read own data to exercise privacy rights").length,1);
yes(await rest(favPath+"?id=eq."+ownFav[0].id,{method:"DELETE",token:a.token}),
 "A can delete own personal data even with terms reacceptance pending");
assert.deepEqual(yes(await rest(favPath+"?select=id",{token:a.token}),"A preset deleted"),[]);
assert.equal(Number(yes(await rpc("efg_accept_legal_documents",a,{p_document_ids:[newTermsId]}),
 "A explicitly reaccepts only changed Terms")),1);
assert.equal(Number(yes(await save(a,{p_goal:{...goal,kcal:2100},p_expected_revision:2}),
 "A can save again after legal reacceptance")),3);
yes(await rest(diaryPath+"?user_id=eq."+a.id+"&log_day=eq."+logDay,{
 method:"PATCH",token:a.token,body:{meals:{desayuno:[{id:"egg",qty:4}]}}
}),"A can correct own diary after reaccepting new terms");
assert.equal(yes(await rest(diaryPath+"?select=meals&log_day=eq."+logDay,{token:a.token}),
 "A diary after legal reacceptance")[0].meals.desayuno[0].qty,4);
no(await save(b,{p_goal:{...goal,kcal:2301},p_expected_revision:1}),
 "Other person cannot inherit A's new Terms acceptance");

// NUT-60 account suspension is server-enforced even for previously signed JWTs.
// No direct-profile REST privilege is granted; fixture admin changes only local rows.
assert.equal(yes(await rpc("efg_personal_write_allowed",a,{}),
 "A has active personal write access after reacceptance"),true);
assert.equal(yes(await rpc("efg_personal_write_allowed",b,{}),
 "B loses write access until independently reaccepting Terms"),false);
no(await rpc("efg_personal_write_allowed",null,{}),
 "Anonymous cannot invoke the Personal authorization gate");
const suspendedFav={...fav,name:"Suspension regression"};
yes(await rest(favPath,{method:"POST",token:a.token,body:suspendedFav}),
 "A creates preset before account suspension");
const suspensionItem=yes(await rest(favPath+"?select=id,name",{token:a.token}),
 "A reads suspension regression preset")[0];
assert.ok(suspensionItem?.id);
sql("update public.efg_profiles set active=false where user_id='"+a.id+"' and role='personal'");
assert.equal(yes(await rpc("efg_personal_write_allowed",a,{}),
 "Suspended user must be denied by server-side predicate"),false);
no(await save(a,{p_goal:{...goal,kcal:2000},p_expected_revision:3}),
 "Suspended JWT must not save goals even after legal acceptance");
no(await rest(diaryPath,{method:"POST",token:a.token,body:{
 ...todayLog,log_day:"2026-10-31"
}}),"Suspended JWT cannot create new diary");
no(await rest(favPath,{method:"POST",token:a.token,body:{
 ...suspendedFav,name:"Forbidden suspended"
}}),"Suspended JWT cannot create new preset");
// PostgREST PATCH can correctly return 204 for zero matched rows: read back.
await rest(diaryPath+"?user_id=eq."+a.id+"&log_day=eq."+logDay,{
 method:"PATCH",token:a.token,body:{meals:{desayuno:[{id:"egg",qty:99}]}}
});
assert.equal(yes(await rest(diaryPath+"?select=meals&log_day=eq."+logDay,{token:a.token}),
 "Suspended profile can read own diary for privacy access")[0].meals.desayuno[0].qty,4,
 "Suspended profile must not mutate existing diary via PATCH");
await rest(favPath+"?id=eq."+suspensionItem.id,{
 method:"PATCH",token:a.token,body:{name:"Forged inactive edit"}
});
assert.equal(yes(await rest(favPath+"?select=name&id=eq."+suspensionItem.id,{token:a.token}),
 "Suspended profile may still view own presets")[0].name,"Suspension regression");
yes(await rest(favPath+"?id=eq."+suspensionItem.id,{method:"DELETE",token:a.token}),
 "Inactive account retains owner-only deletion for privacy rights");
assert.deepEqual(yes(await rest(favPath+"?select=id",{token:a.token}),
 "Inactive owner deletion succeeded"),[]);
sql("update public.efg_profiles set active=true where user_id='"+a.id+"' and role='personal'");
assert.equal(yes(await rpc("efg_personal_write_allowed",a,{}),
 "Explicit fixture reactivation restores valid authorizations"),true);
assert.equal(Number(yes(await save(a,{p_goal:{...goal,kcal:2000},p_expected_revision:3}),
 "Reactivated personal profile can create the next revision")),4);
yes(await rest(diaryPath+"?user_id=eq."+a.id+"&log_day=eq."+logDay,{
 method:"PATCH",token:a.token,body:{meals:{desayuno:[{id:"egg",qty:5}]}}
}),"Reactivated profile can update own diary");
assert.equal(yes(await rest(diaryPath+"?select=meals&log_day=eq."+logDay,{token:a.token}),
 "Reactivation readback")[0].meals.desayuno[0].qty,5);

assert.equal(sql("select count(*) from public.efg_personal_habitual_meals"),"0");
assert.equal(sql("select count(*) from public.efg_daily_logs"),coachBefore.studentDaily,
 "Personal diary cannot alter historic Student diary");
// Strict modality isolation: a Coach and a Coach-linked Student with VALID JWTs
// cannot impersonate an independent Personal account, even across the same DB.
const probeCoach=await signup("coachProbe"),probeStudent=await signup("studentProbe");
const probeOrg=randomUUID();
sql("insert into public.efg_organizations(id,coach_id,name) values ('"+probeOrg+"','"+probeCoach.id+"','NUT60 fictitious org')");
sql("insert into public.efg_profiles(user_id,email,nickname,role,organization_id) values "+
 "('"+probeCoach.id+"','nut60-coachProbe-"+suffix+"@example.invalid','Coach Probe','coach',null),"+
 "('"+probeStudent.id+"','nut60-studentProbe-"+suffix+"@example.invalid','Student Probe','student','"+probeOrg+"')");
for(const [who,actor] of [["Coach",probeCoach],["Student",probeStudent]]){
 assert.equal(yes(await rpc("efg_personal_write_allowed",actor,{}),
  who+" must not have Personal write rights"),false);
 no(await reg(actor,who+" re-enroll"),who+" must not convert to Personal role");
 no(await save(actor,{p_goal:goal,p_expected_revision:null}),who+" cannot save Personal goals");
 assert.deepEqual(yes(await accounts(actor),who+" Personal accounts RLS isolation"),[]);
 assert.deepEqual(yes(await goals(actor),who+" Personal goals RLS isolation"),[]);
 assert.deepEqual(yes(await rest(diaryPath+"?select=user_id",{token:actor.token}),
  who+" Personal diary RLS isolation"),[]);
 assert.deepEqual(yes(await rest(favPath+"?select=id",{token:actor.token}),
  who+" Personal favorites RLS isolation"),[]);
 no(await rest(diaryPath,{method:"POST",token:actor.token,
  body:{...todayLog,meals:{desayuno:[{id:"egg",qty:999}]}}),
  who+" cannot forge Personal A diary insert");
 no(await rest(favPath,{method:"POST",token:actor.token,body:suspendedFav}),
  who+" cannot forge Personal A preset");
}
assert.equal(yes(await rest(diaryPath+"?select=meals&log_day=eq."+logDay,{token:a.token}),
 "Coach/Student probing did not mutate A diary")[0].meals.desayuno[0].qty,5);

console.log("PASS NUT-60 LOCAL: signed JWT Personal A/B + Coach/Student, legal-gated enrollment, personal goals revisions, owner RLS diary and meal presets, no Coach/Student cross-writes. No real clinical/legal approval.");
