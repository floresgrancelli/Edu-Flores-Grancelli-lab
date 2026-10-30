// NUT-60 signed-token experiments, LOCAL Supabase only, NEVER hosted.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
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
 notifications:sql("select count(*) from public.efg_notifications")
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
console.log("PASS NUT-60 local: signed JWT personal A/B, legal gating, no auto-acceptance, no role escalation, isolated versioned personal goals, CAS, cross-account RLS. NO hosted, NO plans UI, NO real terms.");
