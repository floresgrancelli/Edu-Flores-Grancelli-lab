// Synthetic UI adapter ONLY, copied to an isolated local preview by the builder.
// Never imported by production. The original app's save callback runs unchanged.
import {createClient as baseClient,bindApp as baseBind,fixture} from './dual-workspace-fullapp-sdk.mjs';
export {fixture};
let app,notice;
const key='ncc-student-day-synthetic-record';
const read=()=>JSON.parse(sessionStorage.getItem(key)||'null');
const announce=text=>{if(notice)notice.textContent=text;};
export function createClient(url){
 if(!['127.0.0.1','localhost'].includes(location.hostname)||new URL(url).origin!==location.origin)throw Error('Local synthetic preview only');
 const sdk=baseClient(url),from=sdk.from;
 sdk.from=table=>{
  if(table!=='efg_daily_logs')return from(table);
  let payload=null;const filters=[];
  const result=()=>{const row=payload||read();return {data:row&&filters.every(([k,v])=>row[k]===v)?structuredClone(row):null,error:null};};
  const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},gte(){return q;},order(){return q;},limit(){return q;},
   upsert(row){if(row.student_id!==app?.state.session?.user?.id)throw Error('Synthetic identity mismatch');payload=structuredClone(row);sessionStorage.setItem(key,JSON.stringify(payload));announce('Guardado ficticio confirmado · '+Object.values(payload.meals).flat().length+' alimentos');return q;},
   single:async()=>result(),maybeSingle:async()=>result(),then(resolve){const r=result();resolve({...r,data:r.data?[r.data]:[]});}};
  return q;
 };return sdk;
}
const slots=['desayuno','media_manana','almuerzo','media_tarde','merienda','cena'];
async function student(mode){
 await fixture.ensureDual();await fixture.loginAs('learner');
 const s=app.state;s.goals[0].id='synthetic-goal';
 if(mode==='partial'||mode==='over')s.diary.meals.desayuno=[{id:'egg',name:'Huevo · dato ficticio',qty:100,unit:'g',k:148,p:12.4,c:.96,f:9.96,fi:0}];
 if(mode==='over')s.diary.meals.almuerzo=[{id:'demo',name:'Día superior a meta · dato ficticio',qty:1,unit:'porción',k:2200,p:150,c:250,f:70,fi:20}];
 if(mode==='restored'){const saved=read();if(saved?.student_id==='learner'&&saved.log_day===app.today())s.diary=saved;}
 if(mode==='no-goal')s.goals=[];
 s.foodPlan=mode==='no-goal'?null:{guided_goal_id:'synthetic-goal',guided_plan:{meals:slots.map((slot,i)=>({slot,label:['Desayuno','Media mañana','Almuerzo','Media tarde','Merienda','Cena'][i],items:[{id:'egg',name:'Huevo · guía ficticia',unit:'g',qty:100,k:1.48,p:.124,c:.0096,f:.0996,fi:0}]}))}};
 await app.render();await app.frame.ready();announce('Alumno ficticio · '+mode+' · sin backend real');
}
export function bindApp(hooks){
 app=hooks;baseBind(hooks);
 const bar=document.createElement('section');bar.id='ncc-student-day-fixture-controls';bar.style.cssText='padding:12px;background:#20251a;color:#eff5da;font:12px system-ui;position:relative;z-index:1';
 const title=document.createElement('strong');title.textContent='ENSAYO · APP COMPLETA · SOLO DATOS FICTICIOS';bar.append(title,document.createElement('br'));
 const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:8px;margin:5px;background:#303b21;color:#f5f3eb;border:1px solid #71834c;border-radius:7px';b.onclick=async()=>{try{await fn();}catch(e){announce('ERROR: '+e.message);console.error(e);}};bar.append(b);};
 for(const [label,mode] of [['Alumno: vacío','empty'],['Alumno: parcial','partial'],['Alumno: exceso','over'],['Alumno: sin meta','no-goal'],['Recuperar registro ficticio','restored']])add(label,()=>student(mode));
 add('Coach: vista sobria',async()=>{await fixture.loginAs('mentor');announce('Coach ficticio · rol original');});
 notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent='Elegí una cuenta ficticia para revisar la candidata.';bar.append(notice);document.body.prepend(bar);
 // Let the original app's asynchronous initial session hydration finish first.
 // A synthetic login must not race the still-pending initial loginView().
 const buttons=bar.querySelectorAll('button');for(const b of buttons)b.disabled=true;
 const ready=()=>{if(!document.querySelector('#app .pilot-login'))return;for(const b of buttons)b.disabled=false;observer.disconnect();};
 const observer=new MutationObserver(ready);observer.observe(document.getElementById('app'),{childList:true,subtree:true});ready();
}
