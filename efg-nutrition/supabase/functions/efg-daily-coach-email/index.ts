import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import nodemailer from "npm:nodemailer@9.0.2";

// Invoked only from a signed pg_cron request. Do not accept a coach/student ID from the request.
// All student information is selected on the server and filtered by active consent.
const URL=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const db=createClient(URL,KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const str=(x:unknown)=>String(x??"");
const html=(x:unknown)=>str(x).replace(/[&<>"']/g,(s)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]||s));
const money=(n:number)=>Math.round(n||0).toLocaleString("es-AR");
const numeric=(n:number)=>Math.round((n||0)*10)/10;
const dateEs=(s:string)=>s.split("-").reverse().join("/");
function earlierDate(day:string,days:number) {
 const t=new Date(day+"T12:00:00Z");t.setUTCDate(t.getUTCDate()-days);return t.toISOString().slice(0,10);
}
type Log={student_id:string;log_day:string;skipped:any;totals:any;meals?:any};
function isClosed(l:Log){return l?.skipped?._closed===true && Object.values(l?.meals||{}).some((v)=>Array.isArray(v)&&v.length>0);}
function kcal(l:Log){return Number(l.totals?.k||0);}
function reportData(l:Log){return {k:kcal(l),p:Number(l.totals?.p||0),c:Number(l.totals?.c||0),f:Number(l.totals?.f||0),fi:Number(l.totals?.fi||0)};}
function response(status:number,obj:unknown){return Response.json(obj,{status,headers:{"Cache-Control":"no-store"}});}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return response(405,{error:"method"});
 const day=req.headers.get("x-efg-report-day")||"";
 const signature=req.headers.get("x-efg-report-signature")||"";
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^[a-f0-9]{64}$/.test(signature))return response(401,{error:"unauthorized"});
 try {
  const a=await db.rpc("efg_daily_report_cron_authorized",{p_day:day,p_signature:signature});
  if(a.error||a.data!==true)return response(403,{error:"forbidden"});
  const hostname=Deno.env.get("EFG_REPORT_SMTP_HOST")||"smtp.gmail.com";
  const username=Deno.env.get("EFG_REPORT_SMTP_USER")||"";
  const password=Deno.env.get("EFG_REPORT_SMTP_PASSWORD")||"";
  const sender=Deno.env.get("EFG_REPORT_SMTP_FROM")||username;
  if(!username||!password||!sender)return response(503,{error:"smtp_not_configured"});
  const transport=nodemailer.createTransport({host:hostname,port:465,secure:true,auth:{user:username,pass:password},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000});
  const organizations=await db.from("efg_organizations").select("id,name,coach_id,status,is_test").in("status",["active","trial","grace"]).not("coach_id","is",null);
  if(organizations.error)throw organizations.error;
  let sent=0,skipped=0,failed=0;
  for(const org of organizations.data||[]){
   try{
    const coachRes=await db.from("efg_profiles").select("email,role,active").eq("user_id",org.coach_id).maybeSingle();
    const coach=coachRes.data;
    if(coachRes.error||!coach?.active||!(coach.role==="coach"||(org.is_test&&coach.role==="admin"))||!coach.email){skipped++;continue;}
    const rosterRes=await db.from("efg_profiles").select("user_id,nickname").eq("organization_id",org.id).eq("role","student").eq("active",true);
    if(rosterRes.error)throw rosterRes.error;
    const roster=rosterRes.data||[];
    if(roster.length===0){skipped++;continue;}
    const userIds=roster.map((p)=>p.user_id);
    const consentRes=await db.from("efg_consents").select("student_id,organization_id,accepted").eq("organization_id",org.id).eq("accepted",true).in("student_id",userIds);
    if(consentRes.error)throw consentRes.error;
    const allowed=new Set((consentRes.data||[]).map((c)=>c.student_id));
    const participants=roster.filter((p)=>allowed.has(p.user_id));
    if(!participants.length){skipped++;continue;}
    const permitted=participants.map((p)=>p.user_id);
    const logsRes=await db.from("efg_daily_logs").select("student_id,log_day,skipped,totals,meals").in("student_id",permitted).gte("log_day",earlierDate(day,13)).lte("log_day",day);
    if(logsRes.error)throw logsRes.error;
    const logs:Log[]=logsRes.data||[];
    const todays=new Map(logs.filter((l)=>l.log_day===day&&isClosed(l)).map((l)=>[l.student_id,l]));
    if(!todays.size){skipped++;continue;}
    const goalsRes=await db.from("efg_goals").select("student_id,kcal,start_on,approved_at").in("student_id",permitted).lte("start_on",day).order("approved_at",{ascending:false});
    if(goalsRes.error)throw goalsRes.error;
    const goals=new Map<string,number>();
    for(const goal of goalsRes.data||[]){if(!goals.has(goal.student_id))goals.set(goal.student_id,Number(goal.kcal||0));}
    const lines:string[]=[];
    const markup:string[]=[];
    for(const student of participants){
     const log=todays.get(student.user_id);if(!log)continue;
     const t=reportData(log);
     const history=logs.filter((l)=>l.student_id===student.user_id&&isClosed(l));
     const avg=history.length?Math.round(history.reduce((n,l)=>n+kcal(l),0)/history.length):null;
     const target=goals.get(student.user_id)||null;
     const difference=target===null?null:Math.round(t.k-target);
     const delta=difference===null?"Sin objetivo":(difference>0?"+":"")+difference+" kcal frente al objetivo";
     const title=str(student.nickname).slice(0,90);
     lines.push(title+": "+money(t.k)+" kcal, proteínas "+numeric(t.p)+" g, hidratos "+numeric(t.c)+" g, grasas "+numeric(t.f)+" g, fibra "+numeric(t.fi)+" g; "+delta+". Promedio últimos "+history.length+" días cerrados: "+(avg===null?"—":money(avg)+" kcal")+".");
     markup.push("<tr><td style='padding:10px;border-bottom:1px solid #ddd'>"+html(title)+"</td><td style='padding:10px;border-bottom:1px solid #ddd'>"+money(t.k)+" kcal<br><small>P "+numeric(t.p)+" g · HC "+numeric(t.c)+" g · G "+numeric(t.f)+" g · Fibra "+numeric(t.fi)+" g</small></td><td style='padding:10px;border-bottom:1px solid #ddd'>"+html(delta)+"<br><small>Promedio "+history.length+" días cerrados: "+(avg===null?"—":money(avg)+" kcal")+"</small></td></tr>");
    }
    if(!lines.length){skipped++;continue;}
    const sentRes=await db.from("efg_daily_email_deliveries").select("status,attempted_at").eq("organization_id",org.id).eq("report_day",day).maybeSingle();
    if(sentRes.error)throw sentRes.error;
    if(sentRes.data?.status==="sent"||(sentRes.data?.status==="sending"&&Date.now()-new Date(sentRes.data.attempted_at).getTime()<35*60000)){skipped++;continue;}
    const mark=await db.from("efg_daily_email_deliveries").upsert({organization_id:org.id,report_day:day,status:"sending",attempted_at:new Date().toISOString(),error_message:null},{onConflict:"organization_id,report_day"});
    if(mark.error)throw mark.error;
    const subject="EFG Nutrition | Informe diario del "+dateEs(day);
    const body="<div style='font-family:Arial,sans-serif;max-width:720px;color:#173c38'><h2>EFG Nutrition · Informe del "+dateEs(day)+"</h2><p>Resumen de alumnos con día cerrado y consentimiento activo. Los días incompletos no se consideran cero.</p><table style='border-collapse:collapse;width:100%'><thead><tr style='background:#e8f5ef'><th style='text-align:left;padding:10px'>Alumno</th><th style='text-align:left;padding:10px'>Consumo</th><th style='text-align:left;padding:10px'>Comparación</th></tr></thead><tbody>"+markup.join("")+"</tbody></table><p style='font-size:12px;color:#607a72'>Datos autodeclarados, valores aproximados. Accedé al seguimiento privado en <a href='https://efg-nutrition.onrender.com/pilot/'>EFG Nutrition</a>. No reenvíes este informe sin autorización.</p></div>";
    try{
     await transport.sendMail({from:'"EFG Nutrition" <'+sender+'>',to:coach.email,subject,html:body,text:"Informe EFG Nutrition del "+dateEs(day)+"\n\n"+lines.join("\n\n")+"\n\nAbrir: https://efg-nutrition.onrender.com/pilot/"});
     const ok=await db.from("efg_daily_email_deliveries").update({status:"sent",sent_at:new Date().toISOString(),error_message:null}).eq("organization_id",org.id).eq("report_day",day);
     if(ok.error)throw ok.error;
     sent++;
    }catch(e){
     failed++;
     await db.from("efg_daily_email_deliveries").update({status:"failed",error_message:"No se pudo completar el envío SMTP."}).eq("organization_id",org.id).eq("report_day",day);
    }
   }catch(e){failed++;console.error("email_report_org_failed",{org:org.id,error:String(e).slice(0,150)});}
  }
  transport.close();
  return response(200,{sent,skipped,failed,day});
 }catch(e){
  console.error("daily_email_report_failed",String(e).slice(0,150));
  return response(500,{error:"internal"});
 }
});