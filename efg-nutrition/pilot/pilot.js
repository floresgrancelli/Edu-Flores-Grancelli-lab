import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
import {FOOD_GROUPS,FOOD_DEFAULTS,MEAL_ORDER,optionsFor,equivalentPortion,makePlan} from "./planner.js";
import {EXTRA_FOODS,FOOD_CATEGORIES,LEGACY_CATEGORIES,FOOD_UNIT_PORTIONS} from "./food-catalog.js";
import {buildNutritionReport,nutritionReportText} from "./daily-report.js";

const SUPABASE_URL="https://cyjvddhimbsfipjfctsl.supabase.co";
const SUPABASE_PUBLISHABLE="sb_publishable_85h68iKEFdxLTWM86Z8svg_a4s349CZ";
const sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const root=document.getElementById("app");
const today=()=>{const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k)?.value||"";return get("year")+"-"+get("month")+"-"+get("day");};
const yesterday=()=>{const d=new Date(today()+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);};
const escapeHTML=(v)=>String(v??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=(v,d=0)=>Number(v||0).toLocaleString("es-AR",{maximumFractionDigits:d});
const mealSlots=[["desayuno","Desayuno","☀️"],["media_manana","Media mañana","🥛"],["almuerzo","Almuerzo","🍽️"],["media_tarde","Media tarde","☕"],["merienda","Merienda","🍌"],["cena","Cena","🌙"]];
const sportTimes=[["pre","Preentrenamiento"],["during","Durante el entrenamiento"],["post","Postentrenamiento"],["morning","Media mañana"],["afternoon","Media tarde"],["other","Otro momento"]];
const foods=[
 {id:"egg",name:"Huevo entero",unit:"g",k:1.43,p:.126,c:.007,f:.095,fi:0,source:"Tabla genérica"},
 {id:"chicken",name:"Pollo cocido sin piel",unit:"g",k:1.65,p:.31,c:0,f:.036,fi:0,source:"Tabla genérica"},
 {id:"beef",name:"Carne vacuna magra cocida",unit:"g",k:2.10,p:.29,c:0,f:.09,fi:0,source:"Promedio"},
 {id:"pork",name:"Lomo de cerdo cocido",unit:"g",k:1.96,p:.29,c:0,f:.085,fi:0,source:"Promedio"},
 {id:"bread",name:"Pan integral",unit:"g",k:2.47,p:.13,c:.41,f:.042,fi:.07,source:"Promedio"},
 {id:"cheese",name:"Port Salut Light",unit:"g",k:2.17,p:.27,c:.017,f:.12,fi:0,source:"Estimación; verificar marca"},
 {id:"milk",name:"Leche Protein descremada",unit:"ml",k:.42,p:.052,c:.046,f:0,fi:0,source:"Estimación; verificar envase"},
 {id:"quince",name:"Dulce de membrillo",unit:"g",k:2.7,p:.003,c:.67,f:.001,fi:.004,source:"Promedio"},
 {id:"cake",name:"Budín proteico casero Edu",unit:"g",k:2.173,p:.1547,c:.2613,f:.064,fi:.0373,source:"Receta estimada"},
 {id:"rice",name:"Arroz blanco cocido",unit:"g",k:1.3,p:.027,c:.28,f:.003,fi:.004,source:"Tabla genérica"},
 {id:"potato",name:"Papa hervida",unit:"g",k:.87,p:.019,c:.201,f:.001,fi:.018,source:"Tabla genérica, peso cocido"},
 {id:"sweetpotato",name:"Batata hervida",unit:"g",k:.76,p:.013,c:.177,f:.001,fi:.025,source:"Tabla genérica, peso cocido"},
 {id:"brownrice",name:"Arroz integral cocido",unit:"g",k:1.23,p:.027,c:.256,f:.01,fi:.018,source:"Tabla genérica, peso cocido"},
 {id:"protein_pasta",name:"Fideos proteicos cocidos (estimación)",unit:"g",k:1.55,p:.12,c:.235,f:.018,fi:.04,source:"Estimación ilustrativa: sustituir según marca y cocción"},
 {id:"tuna",name:"Atún al natural escurrido",unit:"g",k:1.16,p:.26,c:0,f:.01,fi:0,source:"Tabla genérica, escurrido"},
 {id:"avocado",name:"Palta",unit:"g",k:1.60,p:.02,c:.085,f:.147,fi:.067,source:"Tabla genérica"},
 {id:"pasta",name:"Fideos cocidos",unit:"g",k:1.55,p:.058,c:.305,f:.009,fi:.018,source:"Tabla genérica"},
 {id:"oil",name:"Aceite de oliva",unit:"g",k:8.84,p:0,c:0,f:1,fi:0,source:"Tabla genérica"},
 {id:"yogurt",name:"Yogur natural descremado",unit:"g",k:.60,p:.05,c:.07,f:.01,fi:0,source:"Promedio"},
 {id:"banana",name:"Banana",unit:"g",k:.89,p:.011,c:.228,f:.003,fi:.026,source:"Tabla genérica"},
 {id:"mandarin",name:"Mandarina",unit:"g",k:.53,p:.008,c:.133,f:.003,fi:.018,source:"Tabla genérica"},
 {id:"pumpkin",name:"Calabaza cocida",unit:"g",k:.34,p:.01,c:.08,f:.001,fi:.01,source:"Tabla genérica"},
 {id:"rocket",name:"Rúcula",unit:"g",k:.25,p:.026,c:.037,f:.007,fi:.016,source:"Tabla genérica"}
].concat(EXTRA_FOODS);
const BUDIN_RECIPE={
 id:"cake",name:"Budín de avena proteico",portions:5,portionGrams:82.5,
 allowedMeals:["media_manana","media_tarde"],
 ingredients:[
  {label:"1 manzana mediana, sin carozo",foodId:"apple",grams:150},
  {label:"3 huevos medianos (sin cáscara)",foodId:"egg",grams:150},
  {label:"100 g de avena",foodId:"oats_raw",grams:100},
  {label:"30 g de pasas de uva",foodId:"raisins",grams:30},
  {label:"1 scoop de proteína whey (se estima 30 g)",foodId:"whey_powder",grams:30}
 ],
 flavorings:["Polvo de hornear (cantidad habitual)","Extracto de vainilla a gusto","Canela a gusto"]
};
function setBudinNutrition(){
 const budin=foods.find(f=>f.id===BUDIN_RECIPE.id);
 if(!budin)throw new Error("No encontramos el budín proteico.");
 const total={k:0,p:0,c:0,f:0,fi:0};
 for(const ingredient of BUDIN_RECIPE.ingredients){
  const food=foods.find(f=>f.id===ingredient.foodId);
  if(!food)throw new Error("Falta un ingrediente: "+ingredient.foodId);
  for(const nutrient of Object.keys(total))total[nutrient]+=Number(food[nutrient]||0)*ingredient.grams;
 }
 budin.name=BUDIN_RECIPE.name;
 budin.source="Estimación a partir de los ingredientes de la receta EFG. Scoop supuesto: 30 g. Rinde 5 porciones (aprox. 80–85 g cada una).";
 for(const nutrient of Object.keys(total))budin[nutrient]=total[nutrient]/(BUDIN_RECIPE.portions*BUDIN_RECIPE.portionGrams);
 BUDIN_RECIPE.total=total;
}
setBudinNutrition();
const foodAllowedForMeal=(food,meal)=>food?.id!=="cake" || BUDIN_RECIPE.allowedMeals.includes(meal);
function budinRecipeHTML(){
 const cake=foods.find(f=>f.id==="cake"),portion=BUDIN_RECIPE.portionGrams;
 return '<details class="budin-recipe" open><summary>📖 Receta · '+BUDIN_RECIPE.name+'</summary>'+
 '<p>Rinde <b>'+BUDIN_RECIPE.portions+' porciones</b> de <b>80–85 g</b> (referencia: 82,5 g por porción).</p>'+
 '<ul>'+BUDIN_RECIPE.ingredients.map(i=>'<li>'+escapeHTML(i.label)+'</li>').join("")+
 BUDIN_RECIPE.flavorings.map(x=>'<li>'+escapeHTML(x)+'</li>').join("")+'</ul>'+
 '<p><b>Preparación orientativa:</b> integrar todos los ingredientes, colocar en un molde y hornear hasta que el centro esté bien cocido. Distribuir en cinco porciones una vez frío.</p>'+
 '<p><b>Por porción estimada:</b> '+num(cake.k*portion)+' kcal · '+num(cake.p*portion,1)+' g proteínas · '+num(cake.c*portion,1)+' g hidratos · '+num(cake.f*portion,1)+' g grasas.</p>'+
 '<small>La manzana se estima en 150 g comestibles, los huevos en 50 g cada uno y el scoop en 30 g. Polvo de hornear, vainilla y canela no tienen cantidad definida en esta receta y no están incluidos en los macros. El peso cocido y los valores pueden variar.</small></details>';
}
function updateMealRecipe(){
 const holder=document.getElementById("mealRecipeDetail");
 if(!holder)return;
 const choice=document.getElementById("mealEditorFood")?.value;
 holder.innerHTML=choice==="cake"&&BUDIN_RECIPE.allowedMeals.includes(state.activeMeal)?budinRecipeHTML():"";
}
const FOOD_GROUP_MAP=Object.fromEntries(foods.map(f=>[f.id,f.category||LEGACY_CATEGORIES[f.id]||"extra"]));
const groupIdFor=(f)=>FOOD_GROUP_MAP[f.id]||"extra";
const SNACK_FOOD_IDS=new Set(["cake","walnuts","almonds","peanuts","cashews","pistachios","mixed_nuts"]);
const groupedFoodOptions=(items,meal=null)=>{
 const snack=meal==="media_manana"||meal==="media_tarde";
 const suggested=snack?items.filter(f=>SNACK_FOOD_IDS.has(f.id)).sort((a,b)=>a.name.localeCompare(b.name,"es-AR")):[];
 const regular=snack?items.filter(f=>!SNACK_FOOD_IDS.has(f.id)):items;
 return (suggested.length?'<optgroup label="Colaciones sugeridas · budín y frutos secos">'+option(suggested)+'</optgroup>':"")+
 FOOD_CATEGORIES.map(([id,title])=>{const list=regular.filter(f=>groupIdFor(f)===id).sort((a,b)=>a.name.localeCompare(b.name,"es-AR"));return list.length?'<optgroup label="'+escapeHTML(title)+'">'+option(list)+'</optgroup>':"";}).join("");
};
const sports=[
 {id:"whey",name:"Proteína whey (scoop)",unit:"g",defaultQty:30,k:3.86,p:.8333,c:.0667,f:.025,fi:0,source:"Estimado; 25 g proteína por scoop de 30 g"},
 {id:"creatine",name:"Creatina monohidratada",unit:"g",defaultQty:5,k:0,p:0,c:0,f:0,fi:0,source:"Sin aporte energético significativo"},
 {id:"magnesium",name:"Magnesio elemental",unit:"mg",defaultQty:200,k:0,p:0,c:0,f:0,fi:0,source:"Debe comprobarse contenido elemental en etiqueta"},
 {id:"omega3",name:"Omega-3 (aceite en cápsula)",unit:"cápsulas",defaultQty:1,k:9,p:0,c:0,f:1,fi:0,source:"Estimación por cápsula de 1 g de aceite"},
 {id:"gel",name:"Gel energético running",unit:"geles",defaultQty:1,k:100,p:0,c:25,f:0,fi:0,source:"Estimación; verificar etiqueta de gel"},
 {id:"isotonic",name:"Bebida isotónica azucarada",unit:"ml",defaultQty:500,k:.24,p:0,c:.06,f:0,fi:0,source:"Estimación 6 g hidratos/100 ml"},
 {id:"zero",name:"Gaseosa zero",unit:"ml",defaultQty:350,k:0,p:0,c:0,f:0,fi:0,source:"Aprox. cero; verificar etiqueta"},
 {id:"sparkling",name:"Agua gasificada sin azúcar",unit:"ml",defaultQty:300,k:0,p:0,c:0,f:0,fi:0,source:"Sin calorías"},
 {id:"water",name:"Agua",unit:"ml",defaultQty:300,k:0,p:0,c:0,f:0,fi:0,source:"Sin calorías"},
 {id:"electrolytes",name:"Electrolitos sin azúcar",unit:"porciones",defaultQty:1,k:0,p:0,c:0,f:0,fi:0,source:"Sales y sodio por etiqueta"}
];
const mealDefault={desayuno:[],media_manana:[],almuerzo:[],media_tarde:[],merienda:[],cena:[]};
const state={session:null,profile:null,org:null,tab:"home",diary:null,weights:[],activities:[],goals:[],personalTargets:null,roster:[],invitations:[],orgs:[],payments:[],platformAlias:null,selectedStudent:null,coachLogs:[],coachWeights:[],coachActivities:[],coachGoals:[],consent:null,loggingIn:false,loading:false,foodPlan:null,coachFoodPlan:null,plannerMode:"dinner",plannerSelections:{},activeMeal:null,testInvitations:[],macroInputs:null,macroPreview:null,otpEmail:null,reportDate:null,renderedDay:null,daySwitching:null};
const notify=(msg)=>{let e=document.getElementById("pilot-toast");e.textContent=msg;e.style.display="block";clearTimeout(notify.timer);notify.timer=setTimeout(()=>e.style.display="none",4500);};
const fail=(error)=>{console.error(error);notify(error?.message||"Ocurrió un problema. Intentá nuevamente.");};
const values=(items)=>items.reduce((a,it)=>{for(const k of ["k","p","c","f","fi"])a[k]+=(Number(it[k])||0);return a;},{k:0,p:0,c:0,f:0,fi:0});
const dailyTotals=(diary)=>values([...(Object.entries(diary?.meals||{}).filter(([slot])=>!diary?.skipped?.[slot]).flatMap(([,items])=>items||[])),...(diary?.sports||[])]);
const blankDiary=()=>({student_id:state.session.user.id,log_day:today(),meals:structuredClone(mealDefault),sports:[],skipped:{},totals:{}});
const activeDiary=()=>state.diary?.log_day===today()?state.diary:blankDiary();
async function ensureCurrentDay(){
 if(!state.session?.user?.id||!state.profile||!state.renderedDay||state.renderedDay===today())return;
 if(state.daySwitching)return state.daySwitching;
 const nowDay=today(),uid=state.session.user.id;
 state.daySwitching=(async()=>{
  const {data,error}=await sb.from("efg_daily_logs").select("*").eq("student_id",uid).eq("log_day",nowDay).maybeSingle();
  if(error)throw error;
  if(state.session?.user?.id===uid&&today()===nowDay){state.diary=data||null;state.renderedDay=nowDay;state.activeMeal=null;}
 })();
 try{await state.daySwitching;}finally{state.daySwitching=null;}
}
const activeGoal=()=>state.profile?.role==="student"?(state.goals[0]?{k:state.goals[0].kcal,p:state.goals[0].protein_g,c:state.goals[0].carb_g,f:state.goals[0].fat_g,fi:state.goals[0].fiber_g}:null):(state.personalTargets?{k:state.personalTargets.kcal,p:state.personalTargets.protein_g,c:state.personalTargets.carb_g,f:state.personalTargets.fat_g,fi:state.personalTargets.fiber_g}:null);
function formatTime(d){return new Date(d).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"});}
function safePhoneEmail(email){return escapeHTML(email);}
function normItem(p,qty,when){let result={id:p.id,name:p.name,qty:Number(qty),unit:p.unit,source:p.source,when};for(const k of ["k","p","c","f","fi"])result[k]=Math.round((p[k]||0)*qty*100)/100;return result;}
function rootText(title,sub){return '<div class="pilot-top"><div><div class="eyebrow">EFG NUTRITION PRO</div><h1 class="pilot-title">'+title+'</h1><p class="pilot-lead">'+sub+'</p></div><span class="pilot-tag">Acceso privado</span></div>';}
function option(items){return items.map(v=>'<option value="'+escapeHTML(v.id)+'">'+escapeHTML(v.name)+'</option>').join("");}
function roleLabel(){return {admin:"Administrador EFG",coach:"Entrenador",student:"Alumno"}[state.profile?.role]||"";}
function frame(content){
 const role=state.profile.role;
 const menu=[["home","☀","Mi alimentación"],["weight","↗","Progreso"],["sport","✚","Deporte"]];
 if(role==="coach")menu.push(["coach","♧","Mis alumnos"],["reports","▥","Informes"]);
 if(role==="admin"){menu.push(["testCoach","♧","Coach de prueba"],["reports","▥","Informes de prueba"]);menu.push(["admin","♛","Administración"]);}
 menu.push(["payments","▤","Pagos"]);
 root.innerHTML='<div class="pilot-layout"><aside class="pilot-nav"><div class="pilot-logo"><span class="brand-mark">E<span>+</span></span><span>EFG NUTRITION <small style="display:block;color:#96b1a9;font-size:9px;letter-spacing:1px">PRO · PRIVADO</small></span></div>'+
 menu.map(m=>'<button class="navitem '+(state.tab===m[0]?'active':'')+'" data-tab="'+m[0]+'"><span class="nav-icon">'+m[1]+'</span>'+m[2]+'</button>').join("")+
 '<div class="pilot-avatar"><span class="avatar">'+escapeHTML(state.profile.nickname.slice(0,2).toUpperCase())+'</span><div><strong>'+escapeHTML(state.profile.nickname)+'</strong><small>'+roleLabel()+'</small></div></div><button class="pilot-logout" data-act="logout">Salir de mi cuenta</button></aside>'+
 '<main class="pilot-main">'+content+'<div class="pilot-bottom">EFG NUTRITION · Información de uso personal · Los cálculos son orientativos y requieren revisión profesional cuando corresponda.</div></main></div>';
}
function loginView(message=""){
 const verification=!!state.otpEmail;
 const title=verification?"Ingresá el código que recibiste":"Ingresá a tu espacio privado.";
 const details=verification
  ?"Enviamos un código de verificación a <b>"+escapeHTML(state.otpEmail)+"</b>. Copialo acá, sin salir de la aplicación."
  :"Ingresá con el correo que habilitó EFG o tu entrenador. En vez de abrir enlaces, recibirás un código numérico.";
 const form=verification
  ?'<form id="pilot-otp-form"><div class="field"><label for="loginOtp">Código de acceso</label><input type="text" inputmode="numeric" pattern="[0-9]{6,10}" autocomplete="one-time-code" id="loginOtp" required minlength="6" maxlength="10" placeholder="Código numérico" class="pilot-otp-input"></div><button type="submit" class="btn block" '+(state.loggingIn?'disabled':'')+'>'+(state.loggingIn?"Verificando…":"Ingresar con mi código")+'</button></form><div class="pilot-auth-help"><button class="btn small ghost" data-act="loginBack">Cambiar correo</button><button class="btn small light" data-act="resendOtp" '+(state.loggingIn?'disabled':'')+'>Reenviar código</button></div><p class="pilot-footnote">Si recibiste el correo anterior con un enlace de confirmación, también podés abrirlo mientras terminamos la configuración del código numérico.</p>'
  :'<form id="pilot-login-form"><div class="field"><label for="loginEmail">Tu correo electrónico autorizado</label><input type="email" id="loginEmail" required placeholder="tu@email.com" autocomplete="email" maxlength="200"></div><button type="submit" class="btn block" '+(state.loggingIn?'disabled':'')+'>'+(state.loggingIn?"Enviando…":"Enviarme un código")+'</button></form><div class="pilot-footnote">Una vez que ingreses desde este dispositivo, tu sesión se conservará mientras siga vigente. No es necesario pedir un código cada vez.</div>';
 root.innerHTML='<div class="pilot-login"><div class="pilot-login-art"><div class="food-hero">🥗 ✨</div><div class="eyebrow">CIENCIA • HÁBITOS • ENTRENAMIENTO</div><h1>Tu nutrición,<br>tu evolución.</h1><p>Alimentación, macros y seguimiento privado para entrenadores y alumnos autorizados.</p></div><div class="pilot-login-form"><div class="pilot-login-card"><div class="eyebrow">BIENVENIDO A EFG NUTRITION</div><h2>'+title+'</h2><p>'+details+'</p>'+
 (message?'<div class="pilot-alert" style="margin-top:20px">'+escapeHTML(message)+'</div>':'')+
 form+'<p class="pilot-footnote" style="margin-top:22px">🔒 Tu información solo se muestra a usuarios autorizados. Nunca utilizamos tu dirección IP para identificarte.</p></div></div></div>';
}
async function requestOtp(email){
 if(state.loggingIn)return;
 const normalized=String(email||"").trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>200)throw new Error("Ingresá un correo electrónico válido.");
 state.loggingIn=true;
 try{
  const {error}=await sb.auth.signInWithOtp({
   email:normalized,
   options:{shouldCreateUser:true,emailRedirectTo:"https://efg-nutrition.onrender.com/pilot/"}
  });
  if(error)throw error;
  state.otpEmail=normalized;
  state.loggingIn=false;
  loginView("Si tu correo está habilitado, recibirás un código numérico de acceso. Puede tardar unos instantes; revisá Spam si es necesario.");
 }catch(err){
  state.loggingIn=false;
  fail(err);
  loginView(err.message);
 }
}
async function confirmOtp(token){
 const email=state.otpEmail;
 const code=String(token||"").trim();
 if(!email||!/^\d{6,10}$/.test(code))throw new Error("El código debe tener entre 6 y 10 dígitos numéricos.");
 state.loggingIn=true;
 try{
  const {error}=await sb.auth.verifyOtp({email,token:code,type:"email"});
  if(error)throw error;
  state.otpEmail=null;
  state.loggingIn=false;
  await refresh();
 }catch(err){
  state.loggingIn=false;
  fail(err);
  loginView("El código es incorrecto o venció. Revisá el correo o solicitá otro.");
 }
}
function unauthorized(msg){
 root.innerHTML='<div class="pilot-login"><div class="pilot-login-art"><div class="food-hero">🔒 🌿</div><h1>Un espacio privado, con permisos.</h1><p>EFG Nutrition protege los datos personales y nutricionales de cada alumno.</p></div><div class="pilot-login-form"><div class="pilot-login-card"><h2>Cuenta pendiente de habilitación</h2><p>'+escapeHTML(msg||"Este correo aún no fue habilitado.")+'</p><div class="pilot-alert" style="margin:20px 0">Tu entrenador debe crear tu usuario antes de que puedas usar la aplicación. Si sos el administrador, ingresá con el correo habilitado por EFG.</div><button class="btn block" data-act="logout">Cerrar sesión</button></div></div></div>';
}
function macroCard(name,key,t,goal){let target=goal?.[key];let ratio=target?Math.min(100,Math.max(0,t[key]/target*100)):0;return '<div class="card metric-card metric-'+key+'"><div class="metric-label">'+name+'</div><div class="metric-value">'+num(t[key],1)+' <span>'+ (target?'/ '+num(target):'') +' '+(key==='k'?'kcal':'g')+'</span></div>'+ (target?'<div class="meter"><div style="width:'+ratio+'%"></div></div><div class="metric-remaining">'+num(Math.max(0,target-t[key]),1)+' restante</div>':'<div class="metric-remaining" style="margin-top:9px">Sin objetivo asignado</div>')+'</div>';}
function homeView(){
 let d=activeDiary(),tot=dailyTotals(d),goal=activeGoal(),canAuto=state.profile.role==="admin";
 let meals=mealSlots.map(([key,title,emoji])=>{
  let items=(d.meals[key]||[]),omitted=!!d.skipped?.[key];
  const detail=items.length?'<div class="meal-food-list">'+items.map((i,index)=>{
   const portion=i.displayQty?num(i.displayQty,1)+' '+escapeHTML(i.displayUnit)+' (≈'+num(i.qty,1)+' '+escapeHTML(i.unit)+')':num(i.qty,1)+' '+escapeHTML(i.unit);
   return '<div class="meal-food-line"><div class="meal-food-label"><strong>'+escapeHTML(i.name)+'</strong><span>'+portion+' · '+num(i.k,0)+' kcal · P '+num(i.p,1)+' g · HC '+num(i.c,1)+' g · G '+num(i.f,1)+' g</span></div>'+
   '<button type="button" class="meal-remove-item" data-removefood="'+key+':'+index+'" aria-label="Eliminar '+escapeHTML(i.name)+'" title="Quitar solo este alimento">×</button></div>';
  }).join("")+'</div>':'<small class="meal-food-empty">Todavía no hay alimentos registrados.</small>';
  return '<div class="pilot-record meal-day-section"><div class="between"><strong>'+emoji+' '+title+'</strong><span class="pilot-pill">'+(omitted?'Omitida':num(values(items).k)+' kcal')+'</span></div>'+
  detail+'<div class="meal-actions"><label class="pilot-switch"><input type="checkbox" data-skipmeal="'+key+'" '+(omitted?'checked':'')+'> Omitir</label><button class="btn small light" data-setmeal="'+key+'">+ Añadir alimento</button>'+(items.length?'<button class="btn small ghost" data-clearm="'+key+'">Vaciar comida</button>':'')+'</div></div>';
 }).join("");
const cons=state.consent,showConsent=state.profile.role==="student";
 const consentPanel=showConsent?'<section class="pilot-consent" style="margin-bottom:20px"><h3>🔒 Privacidad y seguimiento</h3><p class="pilot-hint" style="margin-bottom:12px">Solo tu entrenador asignado podrá consultar tus comidas, peso, actividad y suplementos si autorizás compartirlos. Podés revocar el permiso cuando quieras.</p>'+
 '<label><input id="consentToggle" type="checkbox" '+(cons?.accepted?'checked':'')+'> Autorizo a mi entrenador a consultar mis registros nutricionales y de actividad para el seguimiento del plan.</label>'+

 '<button class="btn small" style="margin-top:13px" data-act="saveConsent">Guardar mi decisión</button>'+
 '<small style="display:block;margin-top:9px;color:#77958a">Seguimiento: '+(cons?.accepted?'Autorizado':'Solo visible para vos')+'. Informes disponibles en la app del entrenador.'+'</small></section>':'';
 const closePanel=showConsent?'<div class="nutrition-day-close"><h3>Informe de mi día</h3><p class="pilot-hint">'+
 (d.skipped?._closed?'Marcaste este día como terminado. Si modificás una comida se vuelve a considerar parcial.':'Cuando termines de registrar tus comidas, cerrá el día para que tu entrenador distinga el informe completo del parcial.')+
 '</p><button class="btn small light" data-act="toggleDayClosed" '+(!Object.values(d.meals||{}).some(x=>x?.length)&&!d.sports?.length?'disabled':'')+'>'+
 (d.skipped?._closed?'Reabrir registro':'Terminé de registrar mi día')+'</button></div>':'';
 const goalForm=state.profile.role!=="student"?'<section class="card" style="margin-top:17px"><h2>Mis objetivos personales</h2><p class="pilot-hint">Para uso personal de Edu o de un entrenador. No modifica los planes de los alumnos.</p><div class="pilot-form"><div class="field-row">'+[
 ["selfK","Calorías",goal?.k||2200],["selfP","Proteínas",goal?.p||160],["selfC","Hidratos",goal?.c||230],["selfF","Grasas",goal?.f||70],["selfFi","Fibra",goal?.fi||30]
 ].map(x=>'<div class="field"><label>'+x[1]+'</label><input type="number" min="0" id="'+x[0]+'" value="'+x[2]+'"></div>').join("")+'</div><button class="btn" data-act="setSelfGoals">Guardar mis objetivos</button></div></section>':'';
  return rootText("Mi alimentación","Tus registros se guardan en tu cuenta privada. Solo vos y, si lo autorizás, tu coach podrán consultarlos.")+
 '<section class="pilot-hero"><div class="eyebrow">🌿 HOY · '+today().split("-").reverse().join("/")+'</div><h1>Un día a la vez, un hábito a la vez.</h1><p>Registrá gramos reales, suplementos y bebidas. Tus macros se calculan al instante.</p><div class="pilot-toolbar" style="margin-top:15px">'+(canAuto?'<button class="btn" data-act="loadEdu">🍳 Cargar desayuno y media mañana de Edu</button>':'')+'<button class="btn small light" data-scrollplan="true">✨ Resolver lo que me falta</button><span class="pilot-pill">'+roleLabel()+'</span></div></section>'+
 (!goal?'<div class="pilot-alert">Aún no hay un objetivo nutricional aprobado para esta cuenta. Los registros funcionan, pero no mostraremos metas inventadas.</div>':'')+
 '<div class="pilot-kpis">'+macroCard("CALORÍAS","k",tot,goal)+macroCard("PROTEÍNAS","p",tot,goal)+macroCard("HIDRATOS","c",tot,goal)+macroCard("GRASAS","f",tot,goal)+'</div>'+
 consentPanel+'<div class="pilot-two"><div class="card">'+ '<div class="section-head"><h2>Mis comidas de hoy</h2><span class="pilot-pill">'+num(tot.fi,1)+' g fibra</span></div>'+meals+closePanel+'</div><div class="pilot-stack"><div class="card"><h2>Balance restante</h2>'+(goal?["p","c","f","fi"].map(k=>'<div class="pilot-macro"><span>'+({p:"Proteínas",c:"Hidratos",f:"Grasas",fi:"Fibra"}[k])+'</span><b>'+num(Math.max(0,goal[k]-tot[k]),1)+' g</b></div>').join(""):'<div class="pilot-plan-empty">El entrenador todavía no configuró las metas.</div>')+'<p class="pilot-hint" style="margin-top:16px">Los registros son autodeclarados. No representan una valoración médica ni reemplazan la consulta con un profesional matriculado cuando corresponda.</p></div></div></div>'+plannerCard()+'<div id="mealDialogContainer"></div>'+goalForm;
}

function allowedFoods(){return state.profile?.role==="student"?(state.foodPlan?.approved_food_ids?.length?state.foodPlan.approved_food_ids:FOOD_DEFAULTS):foods.map(f=>f.id);}
function plannerCard(){
 const goal=activeGoal(),d=activeDiary(),tot=dailyTotals(d),mode=state.plannerMode;
 const plan=makePlan({foods,approved:allowedFoods(),diary:d,goals:goal,totals:tot,dinnerOnly:mode==="dinner",selections:state.plannerSelections});
 let out='<section class="card planner-panel" id="planSuggestionCard"><div class="eyebrow">TU PLAN FLEXIBLE</div><h2>✨ Resolver lo que me falta</h2>'+
 '<p class="pilot-hint">Según lo que comiste de verdad, elegí cómo continuar. Sugerimos cantidades; vos decidís y registrás lo que pesaste.</p>'+
 '<div class="planner-mode"><button class="'+(mode==="both"?"on":"")+'" data-planmode="both">Merienda + cena</button><button class="'+(mode==="dinner"?"on":"")+'" data-planmode="dinner">Solo cena</button></div>';
 if(!goal)return out+'<div class="pilot-alert">Para calcular porciones necesitamos un objetivo nutricional definido. '+(state.profile.role==="student"?"Tu entrenador debe aprobarlo.":"Completá tus objetivos personales más abajo.")+'</div></section>';
 const left=plan.remaining||{};
 out+='<div class="planner-remaining"><b>Te falta para el objetivo del día</b><span>'+num(left.k)+' kcal · P '+num(left.p,1)+' g · HC '+num(left.c,1)+' g · G '+num(left.f,1)+' g</span></div>';
 if(!plan.ready)return out+'<div class="pilot-alert">'+escapeHTML(plan.reason)+'</div></section>';
 if(state.profile.role==="student"&&!state.foodPlan?.approved_food_ids?.length)out+='<p class="pilot-hint">Alimentos genéricos de ejemplo; tu coach podrá elegir tu lista permitida.</p>';
 for(const meal of plan.meals){
  const title=mealSlots.find(m=>m[0]===meal.slot)?.[1]||meal.slot;
  out+='<div class="planner-meal"><div class="between"><h3>'+escapeHTML(title)+'</h3><span class="pilot-pill">'+num(meal.estimate.k)+' kcal sugeridas</span></div>';
  for(const row of meal.rows){
   const key=meal.slot+"|"+row.category, alternatives=optionsFor(foods,allowedFoods(),row.category).filter(f=>f.id!==row.food.id);
   const chosen=alternatives.find(f=>f.id===state.plannerSelections["alt:"+key])||alternatives[0];
   const equivalent=chosen?equivalentPortion(row.food,row.grams,chosen,row.category):null;
   const label={protein:"Proteínas",carbs:"Hidratos",vegetable:"Vegetales",fat:"Grasas"}[row.category];
   const opts=optionsFor(foods,allowedFoods(),row.category).map(f=>'<option value="'+escapeHTML(f.id)+'" '+(f.id===row.food.id?'selected':'')+'>'+escapeHTML(f.name)+'</option>').join("");
   out+='<div class="planner-item"><label>'+label+' · opción A</label><select data-planselect="'+escapeHTML(key)+'">'+opts+'</select>'+
   '<div class="planner-qty"><div>Te recomendamos <b>'+num(row.grams)+' '+escapeHTML(row.unit)+'</b></div><label>¿Cuánto pesaste?<input type="number" min="1" max="3000" id="planQty_'+escapeHTML(key)+'" value="'+Math.round(row.grams)+'"></label><button class="btn small" data-planadd="'+escapeHTML(key)+'">Registrar</button></div>';
   if(chosen&&equivalent)out+='<div class="planner-option-b"><label>Alternativa B</label><select data-planalt="'+escapeHTML(key)+'">'+alternatives.map(f=>'<option value="'+escapeHTML(f.id)+'" '+(f.id===chosen.id?'selected':'')+'>'+escapeHTML(f.name)+'</option>').join("")+'</select><button class="btn small ghost" data-usealternative="'+escapeHTML(key)+'">Elegir B</button><small>≈ '+num(equivalent.grams)+' '+escapeHTML(chosen.unit)+' para igualar '+({protein:"proteínas",carbs:"hidratos",fat:"grasas",vegetable:"calorías"}[row.category])+'. No iguala todos los macros.</small></div>';
   out+='</div>';
  }
  out+='<p class="pilot-hint">Total sugerido: P '+num(meal.estimate.p,1)+' g · HC '+num(meal.estimate.c,1)+' g · G '+num(meal.estimate.f,1)+' g</p></div>';
 }
 const after=plan.projectedLeft;
 out+='<div class="planner-left"><b>Si comés estas porciones, aún quedarían aprox.:</b><p>'+num(after.k)+' kcal · P '+num(after.p,1)+' g · HC '+num(after.c,1)+' g · G '+num(after.f,1)+' g</p><small>No intentamos recuperar todo con una cena enorme. Son cantidades orientativas con topes y se recalculan después de cada registro.</small></div>'+
 '<p class="pilot-hint">Solo se registra lo que realmente pesaste. Estas recomendaciones no sustituyen el plan de tu profesional.</p></section>';
 return out;
}
function parsePlannerKey(key){const parts=String(key).split("|");return parts.length===2&&MEAL_ORDER.includes(parts[0])&&FOOD_GROUPS[parts[1]]?[parts[0],parts[1]]:null;}
async function addPlannedFood(key){
 const pair=parsePlannerKey(key);if(!pair)throw new Error("Opción no válida.");
 const [slot,category]=pair, grams=Number(document.getElementById("planQty_"+key)?.value);
 if(!Number.isFinite(grams)||grams<=0||grams>3000)throw new Error("Ingresá el peso real.");
 const plan=makePlan({foods,approved:allowedFoods(),diary:activeDiary(),goals:activeGoal(),totals:dailyTotals(activeDiary()),dinnerOnly:state.plannerMode==="dinner",selections:state.plannerSelections});
 const meal=plan.meals?.find(m=>m.slot===slot),row=meal?.rows.find(r=>r.category===category);
 if(!row)throw new Error("La sugerencia ya cambió. Volvé a elegir una opción.");
 const d=activeDiary();d.meals[slot] ||= [];d.skipped[slot]=false;
 d.meals[slot].push(normItem(row.food,grams,slot));
 await saveDiary();notify("Registraste "+num(grams)+" g de "+row.food.name+". Recalculamos lo que falta.");
}
function openMealDialog(slot){
 const meal=mealSlots.find(m=>m[0]===slot);if(!meal)return;
 const allowed=allowedFoods().map(id=>foods.find(x=>x.id===id)).filter(Boolean).filter(f=>foodAllowedForMeal(f,slot));
 state.activeMeal=slot;
 document.getElementById("mealDialogContainer").innerHTML='<div class="meal-backdrop" role="presentation"><div class="meal-popup" role="dialog" aria-modal="true" aria-labelledby="meal-popup-title">'+
 '<div class="between"><h2 id="meal-popup-title">'+meal[2]+' Añadir a '+meal[1]+'</h2><button class="btn small ghost" data-act="closeMeal">✕</button></div><p class="pilot-hint">Podés registrar gramos, mililitros o, cuando corresponda, unidades aproximadas.</p>'+
 '<div class="pilot-form"><div class="field"><label for="mealFoodSearch">Buscar alimento</label><input type="search" id="mealFoodSearch" placeholder="Ej.: manzana, huevo, arroz…" autocomplete="off"></div>'+
 '<div class="field"><label>Alimento</label><select id="mealEditorFood">'+groupedFoodOptions(allowed,slot)+'</select></div>'+
 '<div class="field" id="mealEntryModeWrap"><label for="mealEntryMode">¿Cómo querés registrarlo?</label><select id="mealEntryMode"><option value="weight">Peso (g o ml)</option><option value="units">Por unidades</option></select></div>'+
 '<div class="field"><label id="mealEditorQtyLabel" for="mealEditorQty">Cantidad (g o ml)</label><input id="mealEditorQty" type="number" min=".1" max="5000" step="any" value="100"></div>'+
 '<div id="mealRecipeDetail"></div><div class="note" id="mealEditorHint"></div><button class="btn block" data-act="saveSelectedMeal">Registrar y recalcular</button></div></div></div>';
 updateMealEntryMode(true);
}
function filterMealFoods(){
 const selector=document.getElementById("mealEditorFood"),search=document.getElementById("mealFoodSearch");
 if(!selector||!search)return;
 const term=search.value.trim().toLocaleLowerCase("es-AR");
 const previous=selector.value;
 const filtered=allowedFoods().map(id=>foods.find(f=>f.id===id)).filter(Boolean).filter(f=>foodAllowedForMeal(f,state.activeMeal)).filter(f=>f.name.toLocaleLowerCase("es-AR").includes(term));
 selector.innerHTML=groupedFoodOptions(filtered,state.activeMeal);
 if(filtered.some(f=>f.id===previous))selector.value=previous;
 updateMealEntryMode(true);
}
function updateMealEntryMode(foodChanged=false){
 const id=document.getElementById("mealEditorFood")?.value;
 const f=foods.find(x=>x.id===id);
 const portion=f?FOOD_UNIT_PORTIONS[f.id]:null;
 const mode=document.getElementById("mealEntryMode"),wrap=document.getElementById("mealEntryModeWrap"),qty=document.getElementById("mealEditorQty"),label=document.getElementById("mealEditorQtyLabel");
 if(!mode||!qty||!label||!wrap)return;
 wrap.style.display=portion?"":"none";
 if(foodChanged){mode.value=portion?"units":"weight";qty.value=portion?(f.id==="egg"?2:1):100;}
 if(!portion)mode.value="weight";
 const counting=!!portion&&mode.value==="units";
 label.textContent=counting?"Cantidad ("+portion.label+(portion.grams?" · estimación":"")+")":"Cantidad ("+(f?.unit||"g")+")";
 qty.step=counting?"1":"any";
 qty.min=counting?"1":"0.1";
 if(counting&&!Number.isInteger(Number(qty.value)))qty.value=1;
 updateMealRecipe();
 updateMealDialogHint();
}
function measureMealEntry(){
 const id=document.getElementById("mealEditorFood")?.value;
 const f=foods.find(x=>x.id===id);
 const qty=Number(document.getElementById("mealEditorQty")?.value);
 const portion=f?FOOD_UNIT_PORTIONS[f.id]:null;
 const useUnits=!!portion&&document.getElementById("mealEntryMode")?.value==="units";
 const grams=useUnits?qty*portion.grams:qty;
 return {f,qty,grams,useUnits,portion};
}
function updateMealDialogHint(){
 const hint=document.getElementById("mealEditorHint");
 if(!hint)return;
 const {f,qty,grams,useUnits,portion}=measureMealEntry();
 if(!f||!Number.isFinite(grams)||grams<=0){hint.textContent="Elegí un alimento y una cantidad válida.";return;}
 hint.textContent=(useUnits?num(qty)+" "+portion.label+(qty===1?"":"s")+" ≈ "+num(grams,1)+" g. ":"")+
 num(f.k*grams)+" kcal y "+num(f.p*grams,1)+" g de proteína · "+f.source+
 (useUnits?". Porción estimada: puede variar por tamaño. Si cocinás con aceite, registralo aparte.":"");
}
async function saveSelectedMeal(){
 const slot=state.activeMeal;
 const {f,qty,grams,useUnits,portion}=measureMealEntry();
 if(!slot||!f||!foodAllowedForMeal(f,slot)||!allowedFoods().includes(f.id)||!Number.isFinite(grams)||grams<=0||grams>5000||(useUnits&&(!Number.isInteger(qty)||qty>100)))throw new Error("Verificá el alimento y su cantidad.");
 const d=activeDiary();d.meals[slot] ||= [];
 const entry=normItem(f,grams,slot);
 if(useUnits){entry.displayQty=qty;entry.displayUnit=portion.label;entry.unitEstimate=true;}
 d.meals[slot].push(entry);d.skipped[slot]=false;d.skipped._closed=false;state.activeMeal=null;
 await saveDiary();notify("Alimento agregado, balance actualizado.");
}
function coachFoodChoices(p,consent){
 if(!consent?.accepted)return "";
 const selected=new Set(state.coachFoodPlan?.approved_food_ids?.length?state.coachFoodPlan.approved_food_ids:FOOD_DEFAULTS);
 const sections=FOOD_CATEGORIES.map(([id,title],index)=>{
  const items=foods.filter(f=>groupIdFor(f)===id).sort((a,b)=>a.name.localeCompare(b.name,"es-AR"));
  if(!items.length)return "";
  return '<details class="coach-food-group" data-foodgroup="'+id+'" '+(index===0?'open':'')+'><summary><span>'+escapeHTML(title)+'</span><small>'+items.length+' opciones</small></summary>'+
  '<div class="coach-food-bulk"><button type="button" class="btn small light" data-foodbulk="'+id+'" data-foodchecked="yes">Marcar categoría</button><button type="button" class="btn small ghost" data-foodbulk="'+id+'" data-foodchecked="no">Desmarcar</button></div>'+
  '<div class="coach-food-choices">'+items.map(f=>'<label data-foodname="'+escapeHTML(f.name.toLocaleLowerCase("es-AR"))+'"><input type="checkbox" data-coachfood="'+escapeHTML(f.id)+'" '+(selected.has(f.id)?'checked':'')+'> '+escapeHTML(f.name)+'</label>').join("")+'</div></details>';
 }).join("");
 return '<div class="divider"></div><h3>Alimentos permitidos para planificar</h3>'+
 '<p class="pilot-hint">Elegí lo que verá este alumno al registrar comidas y planificar porciones. Referencias genéricas; los alimentos de marca requieren comprobar la etiqueta.</p>'+
 '<div class="food-library-tools"><label for="coachFoodSearch">Buscar alimentos</label><input type="search" id="coachFoodSearch" placeholder="Buscar entre '+foods.length+' alimentos…" autocomplete="off"><p id="coachFoodCount" class="pilot-hint">'+selected.size+' alimentos seleccionados de '+foods.length+'</p></div>'+
 sections+'<button class="btn block" data-act="saveCoachFoodPlan" style="margin-top:13px">Guardar alimentos del alumno</button>';
}
function filterCoachFoodLibrary(){
 const input=document.getElementById("coachFoodSearch");
 if(!input)return;
 const term=input.value.trim().toLocaleLowerCase("es-AR");
 for(const group of root.querySelectorAll(".coach-food-group")){
  let visible=0;
  for(const label of group.querySelectorAll("label[data-foodname]")){
   const match=label.dataset.foodname.includes(term);
   label.style.display=match?"":"none";
   if(match)visible++;
  }
  group.style.display=visible?"":"none";
  if(term&&visible)group.open=true;
 }
 updateCoachFoodCount();
}
function updateCoachFoodCount(){
 const e=document.getElementById("coachFoodCount");
 if(e)e.textContent=root.querySelectorAll('input[data-coachfood]:checked').length+" alimentos seleccionados de "+foods.length;
}
async function saveCoachFoods(){
 if(!(state.profile.role==="coach"||(state.profile.role==="admin"&&state.org?.is_test))||!state.selectedStudent||!state.consent?.accepted)throw new Error("El alumno tiene que autorizarte primero.");
 const ids=[...root.querySelectorAll("input[data-coachfood]:checked")].map(x=>x.dataset.coachfood).filter(id=>foods.some(f=>f.id===id));
 if(!ids.length)throw new Error("Seleccioná por lo menos un alimento.");
 const row={student_id:state.selectedStudent,coach_id:state.session.user.id,approved_food_ids:ids,updated_at:new Date().toISOString()};
 const {error}=await sb.from("efg_food_plans").upsert(row,{onConflict:"student_id"});if(error)throw error;
 state.coachFoodPlan=row;await render();notify("Lista alimentaria guardada para este alumno.");
}

function sportView(){
 let d=activeDiary(),entries=d.sports||[];
 return rootText("Suplementos e hidratación","Proteína whey, creatina, magnesio, omega-3, geles, isotónicas y bebidas.")+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card"><h2>Registrar suplemento o bebida</h2><div class="pilot-form"><div class="field"><label>Producto</label><select id="sportItem">'+option(sports)+'</select></div><div class="field-row"><div class="field"><label>Momento</label><select id="sportTime">'+sportTimes.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("")+'</select></div><div class="field"><label id="sportQtyLabel">Cantidad</label><input id="sportQty" type="number" min=".1" max="3000" step="any" value="30"></div></div><div class="note" id="sportInfo">Consultar etiqueta.</div><button class="btn block" data-act="addSport">Registrar consumo</button></div></div>'+
 '<div class="card"><h2>Consumos de hoy</h2>'+(entries.length?entries.map((x,i)=>'<div class="pilot-record"><div class="between"><div><strong>'+escapeHTML(x.name)+'</strong><small>'+num(x.qty,1)+' '+escapeHTML(x.unit)+' · '+escapeHTML(x.when||"")+'</small></div><span class="pilot-pill">'+num(x.k)+' kcal</span></div><button class="btn small ghost" style="margin-top:8px" data-removesport="'+i+'">Eliminar</button></div>').join(""):'<div class="empty">No registraste suplementos ni bebidas.</div>')+'</div></div>'+
 '<div class="pilot-stack"><div class="card"><h2>¿Qué conviene tomar?</h2><div class="pilot-notice"><strong>💧 Agua o agua gasificada</strong><small>Ambas hidratan; elegí según tolerancia y preferencia.</small></div><div class="pilot-notice" style="margin-top:10px"><strong>🥤 Bebidas zero</strong><small>Pueden sustituir bebidas azucaradas cuando se busca reducir calorías, pero no son superiores al agua.</small></div><div class="pilot-notice" style="margin-top:10px"><strong>🏃 Geles e isotónicas</strong><small>Más relevantes en entrenamientos prolongados o con necesidades específicas de hidratos y electrolitos.</small></div><p class="pilot-hint" style="margin-top:15px">El scoop no equivale siempre a 30 g. Omega-3 y magnesio necesitan datos reales de etiqueta y pertinencia individual.</p></div></div></div>';
}
function weightDateLabel(w){
 const date=/^\d{4}-\d{2}-\d{2}$/.test(w?.measured_on||"")?w.measured_on.split("-").reverse().join("/"):"Fecha desconocida";
 const hour=w?.measured_time?String(w.measured_time).slice(0,5):null;
 return date+(hour?" · "+hour+" h":" · horario no registrado");
}
function normalizedWeights(items){
 return (items||[]).filter(w=>/^\d{4}-\d{2}-\d{2}$/.test(w?.measured_on||"")&&Number.isFinite(Number(w.kg))&&Number(w.kg)>0)
 .slice().sort((a,b)=>a.measured_on.localeCompare(b.measured_on));
}
function weightTrendChart(items){
 const weights=normalizedWeights(items);
 if(!weights.length)return '<div class="empty">Sin pesajes todavía. El gráfico aparecerá cuando el alumno registre su peso.</div>';
 const first=weights[0],last=weights[weights.length-1],previous=weights[weights.length-2];
 const delta=(a,b)=>a===null||b===null?'—':(a-b>0?'+':'')+num(a-b,1)+' kg';
 const vals=weights.map(w=>Number(w.kg));
 const lo=Math.min(...vals),hi=Math.max(...vals);
 const pad=Math.max(.5,(hi-lo)*.2),min=Math.max(0,lo-pad),max=hi+pad,span=Math.max(.1,max-min);
 const W=700,H=235,marginL=49,marginR=24,top=24,bottom=46;
 const xp=i=>marginL+(weights.length===1?(W-marginL-marginR)/2:i*(W-marginL-marginR)/(weights.length-1));
 const yp=kg=>top+(max-kg)/span*(H-top-bottom);
 const grid=Array.from({length:5},(_,i)=>{const v=min+(max-min)*i/4,y=yp(v);return '<line class="weight-chart-grid" x1="'+marginL+'" y1="'+y.toFixed(1)+'" x2="'+(W-marginR)+'" y2="'+y.toFixed(1)+'"></line><text class="weight-chart-axis" x="'+(marginL-7)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+num(v,1)+'</text>';}).join('');
 const points=weights.map((w,i)=>xp(i).toFixed(1)+','+yp(Number(w.kg)).toFixed(1)).join(' ');
 const circles=weights.map((w,i)=>'<circle class="weight-chart-point" cx="'+xp(i).toFixed(1)+'" cy="'+yp(Number(w.kg)).toFixed(1)+'" r="5"><title>'+escapeHTML(weightDateLabel(w)+' · '+num(w.kg,1)+' kg')+'</title></circle>').join('');
 const xLabels=weights.map((w,i)=>{if(weights.length>8&&i!==0&&i!==weights.length-1&&i%Math.ceil(weights.length/6)!==0)return '';return '<text class="weight-chart-axis" x="'+xp(i).toFixed(1)+'" y="'+(H-13)+'" text-anchor="middle">'+escapeHTML(w.measured_on.slice(8)+'/'+w.measured_on.slice(5,7))+'</text>';}).join('');
 return '<div class="weight-trend"><div class="weight-summary"><div><small>Primer pesaje</small><strong>'+num(first.kg,1)+' kg</strong><span>'+escapeHTML(weightDateLabel(first))+'</span></div><div><small>Último pesaje</small><strong>'+num(last.kg,1)+' kg</strong><span>'+escapeHTML(weightDateLabel(last))+'</span></div><div><small>Variación total</small><strong>'+delta(Number(last.kg),weights.length>1?Number(first.kg):null)+'</strong><span>Desde el anterior: '+delta(Number(last.kg),previous?Number(previous.kg):null)+'</span></div></div><div class="weight-chart-scroll"><svg class="weight-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfico de '+weights.length+' pesajes, desde '+num(first.kg,1)+' hasta '+num(last.kg,1)+' kilos">'+grid+(weights.length>1?'<polyline class="weight-chart-line" points="'+points+'"></polyline>':'')+circles+xLabels+'</svg></div><p class="pilot-hint">Cada punto es un pesaje real. Los días sin registro no se cuentan ni interpolan. Las variaciones aisladas pueden reflejar cambios de agua corporal.</p></div>';
}
const argentinaTime=()=>new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
function progressView(){
 const weights=normalizedWeights(state.weights).reverse();
 const last=weights[0];
 const daysSinceLast=last?Math.round((Date.parse(today()+"T12:00:00Z")-Date.parse(last.measured_on+"T12:00:00Z"))/86400000):null;
 const note=last?'<p class="pilot-hint">Último control: '+escapeHTML(weightDateLabel(last))+' · '+num(last.kg,1)+' kg. '+(daysSinceLast<7?'Para una comparación semanal, podés hacer el siguiente control en '+Math.max(1,7-daysSinceLast)+' día(s).':'Podés registrar tu próximo control semanal.')+'</p>':'<p class="pilot-hint">Comenzá registrando tu primer pesaje con fecha y hora.</p>';
 return rootText("Mi progreso","Seguimiento del peso corporal, actividad y evolución semanal.")+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card"><h2>Peso corporal semanal</h2>'+
 '<div class="warning" style="margin-top:15px">⚖️ Sugerimos un pesaje por semana, idealmente el mismo día y a la misma hora, después de ir al baño, antes del desayuno, con la misma balanza y ropa similar. Podés registrar controles adicionales si hace falta.</div>'+note+
 '<div class="pilot-form"><div class="field-row"><div class="field"><label for="weightDay">Fecha del pesaje</label><input id="weightDay" type="date" value="'+today()+'" max="'+today()+'" required></div>'+
 '<div class="field"><label for="weightTime">Hora del pesaje</label><input id="weightTime" type="time" value="'+argentinaTime()+'" required></div></div>'+
 '<div class="field"><label for="weightKg">Peso corporal (kg)</label><input id="weightKg" type="number" min="20" max="400" step=".1" placeholder="Ej.: 78.5" inputmode="decimal" required></div>'+
 '<button class="btn" data-act="saveWeight">Guardar pesaje</button><p class="pilot-hint">Se toma la fecha y hora local de Argentina. Si corregís un registro del mismo día, se actualiza en vez de duplicarse.</p></div></div>'+
 '<div class="card"><h2>Historial de pesajes</h2>'+(weights.length?'<div class="pilot-table-wrap"><table class="pilot-table"><thead><tr><th>Fecha y hora</th><th>Peso</th></tr></thead><tbody>'+
 weights.map(w=>'<tr><td>'+escapeHTML(weightDateLabel(w))+'</td><td><b>'+num(w.kg,1)+' kg</b></td></tr>').join("")+'</tbody></table></div>':'<div class="empty">Todavía no registraste tu peso.</div>')+'</div></div>'+
 '<div class="pilot-stack"><div class="card"><h2>Mi evolución del peso</h2>'+weightTrendChart(state.weights)+'</div>'+
 '<div class="card"><h2>Movimiento de hoy</h2><div class="pilot-form"><div class="field"><label>Pasos</label><input id="activitySteps" type="number" min="0" max="100000" placeholder="Ej. 8000"></div>'+
 '<div class="field"><label>Minutos de ejercicio</label><input id="activityMinutes" type="number" min="0" max="1440" placeholder="Ej. 60"></div>'+
 '<div class="field"><label>Tipo</label><select id="activityKind"><option>Entrenamiento de fuerza</option><option>Running</option><option>Cardio</option><option>Caminata</option><option>Otro</option></select></div>'+
 '<button class="btn" data-act="saveActivity">Guardar actividad</button></div></div>'+
 '<div class="card"><h2>Últimos registros</h2>'+(state.activities.length?state.activities.slice(0,5).map(a=>'<div class="pilot-record"><strong>'+escapeHTML(a.activity_day)+'</strong><small>'+num(a.steps)+' pasos · '+num(a.exercise_minutes)+' minutos · '+escapeHTML(a.kind)+'</small></div>').join(""):'<div class="empty">Aún no hay actividad registrada.</div>')+'</div></div></div>';
}

function macroEstimate(age,height,weight,activity,sex,goal){
 if(!(age>=18&&age<=90&&height>=120&&height<=220&&weight>=35&&weight<=300&&activity>=1.2&&activity<=1.75))throw new Error("Completá edad, altura, peso y actividad de un adulto.");
 const rmr=10*weight+6.25*height-5*age+(sex==="male"?5:-161);
 const maintenance=Math.round(rmr*activity);
 const coef={fat_loss:.90,recomp:1,muscle_gain:1.07}[goal];
 const kcal=Math.round(maintenance*coef/10)*10;
 const protein=Math.round(weight*(goal==="fat_loss"?2:1.8));
 const fat=Math.round(weight*.8);
 const carbs=Math.round((kcal-protein*4-fat*9)/4);
 if(kcal<1400||carbs<0)throw new Error("El resultado requiere valoración individual.");
 return {goal,kcal,protein,carbs,fat,fiber:Math.round(kcal*.014),maintenance,rmr};
}
function macroPlayground(){
 const i=state.macroInputs||{sex:"male",age:30,height:170,weight:75,activity:1.5};
 const fields=[["previewAge","Edad",i.age,18,90],["previewHeight","Altura (cm)",i.height,120,220],["previewWeight","Peso (kg)",i.weight,35,300]];
 const form='<div class="pilot-form"><div class="field-row">'+fields.map(q=>'<div class="field"><label>'+q[1]+'</label><input type="number" id="'+q[0]+'" min="'+q[3]+'" max="'+q[4]+'" step=".1" value="'+q[2]+'"></div>').join("")+'</div>'+
 '<div class="field-row"><div class="field"><label>Ecuación</label><select id="previewSex"><option value="male" '+(i.sex==="male"?"selected":"")+'>Hombre</option><option value="female" '+(i.sex==="female"?"selected":"")+'>Mujer</option></select></div>'+
 '<div class="field"><label>Actividad</label><select id="previewActivity">'+[[1.2,"Baja"],[1.35,"Ligera"],[1.5,"Moderada"],[1.7,"Alta"]].map(a=>'<option value="'+a[0]+'" '+(Math.abs(i.activity-a[0])<.01?"selected":"")+'>'+a[1]+'</option>').join("")+'</select></div></div>'+
 '<button class="btn" data-act="previewMacros">Calcular los 3 objetivos</button></div>';
 let cards="";
 if(state.macroPreview){
  cards='<div class="macro-preview-grid">'+state.macroPreview.map(result=>'<div class="macro-preview"><b>'+({fat_loss:"Descenso de grasa",recomp:"Recomposición corporal",muscle_gain:"Aumento muscular"}[result.goal])+'</b><div class="macro-preview-kcal">'+num(result.kcal)+' kcal/día</div><small>Proteínas: '+num(result.protein)+' g<br>Hidratos: '+num(result.carbs)+' g<br>Grasas: '+num(result.fat)+' g<br>Fibra: '+num(result.fiber)+' g</small></div>').join("")+'</div>'+
   '<p class="pilot-hint">Mantenimiento estimado: '+num(state.macroPreview[0].maintenance)+' kcal. Esta simulación no cambia el plan de ningún alumno.</p>';
 }
 return '<section class="card" style="margin-bottom:18px"><div class="section-head"><h2>📐 Calculadora de macros</h2><span class="pilot-pill">Tres objetivos</span></div><p class="pilot-hint">Probala incluso sin alumnos. Compará descenso de grasa, recomposición y aumento muscular. Para asignar un plan real, primero abrí la ficha de un alumno que haya autorizado el seguimiento.</p>'+form+cards+'</section>';
}
function coachView(){
 const org=state.org;
 const isTest=state.profile.role==="admin"&&!!org?.is_test;
 const roster=state.roster||[];
 const current=state.selectedStudent&&roster.find(p=>p.user_id===state.selectedStudent);
 const pending=(isTest?state.testInvitations:state.invitations).filter(i=>i.role==="student"&&!i.claimed_by&&!i.revoked_at);
 const seats=org?.seat_limit||0,activeRoster=roster.filter(p=>p.active),used=activeRoster.length+pending.length;
 return rootText(isTest?"Coach de prueba":"Panel del entrenador",isTest?"Tu espacio de prueba con alumnos autorizados y calculadora de planes.":"Administrá tus alumnos y revisá sus registros autorizados.")+
 (isTest?'<div class="pilot-notice" style="margin-bottom:18px"><strong>🧪 Laboratorio de EFG — 5 cupos gratuitos de prueba</strong><small>Conservás tu cuenta de administrador. Solo ves datos de alumnos vinculados a este espacio que hayan dado consentimiento. No se solicitan pagos.</small></div>':'')+
 macroPlayground()+
 '<div class="pilot-kpis"><div class="card"><div class="metric-label">ALUMNOS VINCULADOS</div><div class="metric-value">'+activeRoster.length+'</div></div><div class="card"><div class="metric-label">CUPO '+(isTest?'DE PRUEBA':'CONTRATADO')+'</div><div class="metric-value">'+seats+'</div></div><div class="card"><div class="metric-label">INVITACIONES PENDIENTES</div><div class="metric-value">'+pending.length+'</div></div><div class="card"><div class="metric-label">CUPOS LIBRES</div><div class="metric-value">'+Math.max(0,seats-used)+'</div></div></div>'+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card"><h2>Mis alumnos</h2>'+
 (roster.length?roster.map(p=>'<div class="pilot-record"><div class="between"><div><strong>'+escapeHTML(p.nickname)+'</strong><small>'+safePhoneEmail(p.email)+' · '+(p.active?'Activo':'Baja temporal')+'</small></div><div class="pilot-toolbar">'+(p.active?'<button class="btn small light" data-student="'+p.user_id+'">Ver seguimiento</button>':'')+'<button class="btn small ghost" data-studentstatus="'+p.user_id+'">'+(p.active?'Dar de baja':'Reactivar')+'</button></div></div></div>').join(""):'<div class="empty">Aún no hay alumnos. Podés probar la calculadora y después invitar a alguien.</div>')+
 (pending.length?'<div class="divider"></div><h3>Invitaciones pendientes de ingreso</h3>'+pending.map(i=>'<div class="pilot-record"><strong>'+escapeHTML(i.nickname)+'</strong><small>'+safePhoneEmail(i.email)+'</small><button class="btn small ghost" style="margin-top:8px" data-deleteinvite="'+i.id+'">Eliminar correo</button></div>').join(""):'')+'</div>'+
 '<div class="card"><h2>Habilitar un alumno'+(isTest?' de prueba':'')+'</h2><p class="pilot-hint">Elegí un usuario y correo reales. Después compartí el mismo enlace privado de EFG Nutrition con esa persona.</p>'+
 '<div class="pilot-form"><div class="field"><label>Nombre o usuario del alumno</label><input id="studentName" maxlength="70" placeholder="AlumnoPrueba01"></div><div class="field"><label>Correo electrónico del alumno</label><input id="studentEmail" type="email" placeholder="alumno@email.com"></div>'+
 '<button class="btn block" data-act="inviteStudent" '+(used>=seats?'disabled':'')+'>Habilitar alumno</button><button class="btn light" data-act="copyStudentLink">Copiar enlace para enviar</button></div><p class="pilot-hint">El alumno recibirá el código o enlace de ingreso en su propio correo y deberá autorizarte a consultar sus registros.</p></div>'+
 (isTest?'<div class="pilot-notice"><strong>Sin pagos en modo prueba</strong><small>Estos cupos no se facturan. Tu administración comercial continúa en la pestaña Administración.</small></div>':
 '<div class="card"><h2>Alias para pagos de alumnos</h2><p class="pilot-hint">'+(org?.payment_alias?'Actual: '+escapeHTML(org.payment_alias):'Todavía no configuraste tu alias bancario.')+'</p><div class="pilot-form"><div class="field"><label>Alias bancario</label><input id="coachAlias" value="'+escapeHTML(org?.payment_alias||"")+'" maxlength="100"></div><button class="btn" data-act="coachAlias">Guardar alias</button></div></div>')+
 '</div><div class="pilot-stack"><div id="studentFollowPanel" class="coach-selected-student">'+(current?studentDetailView(current,state.consent):'<div class="card"><h2>Seguimiento de un alumno</h2><div class="empty">Seleccioná un alumno que haya confirmado su cuenta y autorizado el acceso. Ahí podrás calcular sus objetivos de descenso, recomposición o aumento muscular y revisar los registros.</div></div>')+'</div></div></div>';
}
function coachTrendChart(days,key,label,unit,goalValue=null){
 const logs=[...(days||[])].filter(d=>d.hasData && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && Number.isFinite(Number(d[key]))).sort((a,b)=>a.date.localeCompare(b.date)).slice(-14);
 if(!logs.length)return '<div class="nutrition-trend"><h4>'+escapeHTML(label)+'</h4><div class="empty">No hay registros para graficar.</div></div>';
 const values=logs.map(d=>Number(d[key]));
 const lo=Math.min(...values),hi=Math.max(...values),span=Math.max(key==="k"?120:8,hi-lo);
 const pad=Math.max(key==="k"?35:3,span*.18);
 const min=Math.max(0,lo-pad),max=hi+pad;
 const goal=Number(goalValue),validGoal=goalValue!==null&&goalValue!==undefined&&Number.isFinite(goal)&&goal>0;
 const showGoal=validGoal&&goal>=min&&goal<=max;
 const W=660,H=228,L=47,R=19,T=22,B=45;
 const dayUtc=d=>Date.parse(d+"T12:00:00Z")/86400000;
 const firstDay=dayUtc(logs[0].date),lastDay=dayUtc(logs[logs.length-1].date);
 const range=Math.max(1,lastDay-firstDay);
 const xp=d=>L+(dayUtc(d.date)-firstDay)/range*(W-L-R);
 const yp=n=>T+(max-n)/(max-min)*(H-T-B);
 const yTicks=Array.from({length:5},(_,i)=>min+(max-min)*i/4);
 const grid=yTicks.map(v=>'<line class="nutrition-line-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+yp(v).toFixed(2)+'" y2="'+yp(v).toFixed(2)+'"/><text class="nutrition-line-axis" x="'+(L-7)+'" y="'+(yp(v)+4).toFixed(2)+'" text-anchor="end">'+num(v,key==="k"?0:1)+'</text>').join("");
 const lines=logs.slice(1).map((d,i)=>{const prev=logs[i],gap=dayUtc(d.date)-dayUtc(prev.date);
   return gap===1?'<line class="nutrition-line-segment kind-'+key+'" x1="'+xp(prev).toFixed(2)+'" y1="'+yp(Number(prev[key])).toFixed(2)+'" x2="'+xp(d).toFixed(2)+'" y2="'+yp(Number(d[key])).toFixed(2)+'"/>':'';
 }).join("");
 const targetLine=showGoal?'<line class="nutrition-line-goal" x1="'+L+'" x2="'+(W-R)+'" y1="'+yp(goal).toFixed(2)+'" y2="'+yp(goal).toFixed(2)+'"><title>Objetivo: '+num(goal,key==="k"?0:1)+' '+unit+'</title></line>':'';
 const circles=logs.map(d=>'<circle class="nutrition-line-point '+(d.closed?'closed':'partial')+' kind-'+key+'" cx="'+xp(d).toFixed(2)+'" cy="'+yp(Number(d[key])).toFixed(2)+'" r="5"><title>'+escapeHTML(d.date.split("-").reverse().join("/")+' · '+num(Number(d[key]),1)+' '+unit+' · '+(d.closed?'Día cerrado':'Registro parcial'))+'</title></circle>').join("");
 const every=Math.max(1,Math.ceil(logs.length/6));
 const xLabels=logs.map((d,i)=>(i!==0&&i!==logs.length-1&&i%every!==0)?'':'<text class="nutrition-line-axis" x="'+xp(d).toFixed(2)+'" y="'+(H-12)+'" text-anchor="middle">'+escapeHTML(d.date.slice(8)+"/"+d.date.slice(5,7))+'</text>').join("");
 return '<div class="nutrition-trend"><div class="nutrition-trend-heading"><h4>'+escapeHTML(label)+'</h4><span>'+num(values[values.length-1],key==="k"?0:1)+' '+unit+' · último registro</span></div>'+
 '<div class="nutrition-line-scroll"><svg class="nutrition-line-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Evolución diaria de '+escapeHTML(label)+' de '+logs.length+' días con registros">'+grid+targetLine+lines+circles+xLabels+'</svg></div>'+
 '<p class="pilot-hint">● Punto lleno: día cerrado · ○ Punto vacío: día parcial.'+
 (validGoal?(showGoal?' Línea punteada: objetivo '+num(goal,key==="k"?0:1)+' '+unit+'.':' Objetivo: '+num(goal,key==="k"?0:1)+' '+unit+' (fuera de la escala).'):'')+
 ' Escala ajustada para ver cambios pequeños; no se unen días faltantes.</p></div>';
}
function coachReportsView(){
 if(!(state.profile?.role==="coach"||(state.profile?.role==="admin"&&state.org?.is_test)))return rootText("Informes","Disponible solo para coaches autorizados.");
 const roster=(state.roster||[]).filter(p=>p.active);
 const p=roster.find(p=>p.user_id===state.selectedStudent);
 let out=rootText("Informes diarios","Consultá automáticamente el día anterior y la evolución de tus alumnos, sin correos.");
 if(!roster.length)return out+'<section class="card"><div class="empty">No hay alumnos activos.</div></section>';
 out+='<section class="card"><h2>Seleccionar alumno</h2><div class="coach-report-students">'+roster.map(r=>'<button class="btn '+(p?.user_id===r.user_id?'':'light')+'" data-reportstudent="'+r.user_id+'">'+escapeHTML(r.nickname)+'</button>').join("")+'</div></section>';
 if(!p)return out+'<section class="card"><p class="pilot-hint">Seleccioná un alumno para consultar sus reportes.</p></section>';
 if(!state.consent?.accepted)return out+'<section class="card"><h2>'+escapeHTML(p.nickname)+'</h2><div class="pilot-alert">Este alumno no autorizó el seguimiento de sus registros.</div></section>';
 const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),state.coachGoals[0]||null);
 const prev=report.days.find(d=>d.date===yesterday());
 const status=!prev||!prev.hasData?'Sin registros':prev.closed?'Cerrado':'Parcial';
 out+='<section class="card"><h2>Informe de ayer · '+yesterday().split("-").reverse().join("/")+'</h2><div class="pilot-notice"><strong>'+escapeHTML(status)+'</strong><small>'+(prev?.hasData?num(prev.k)+' kcal · Proteínas '+num(prev.p,1)+' g · HC '+num(prev.c,1)+' g · Grasas '+num(prev.f,1)+' g':'Sin consumos registrados; no se considera cero calorías')+'</small></div><p class="pilot-hint">El informe utiliza lo guardado hasta este momento. Un día puede quedar parcial si el alumno no lo cerró.</p></section>';
 out+='<section class="card"><h2>📈 Evolución nutricional</h2><p class="pilot-hint">Últimos 14 días disponibles, sin completar con ceros los días faltantes.</p><div class="nutrition-trend-grid">'+coachTrendChart(report.days,"k","Calorías","kcal",state.coachGoals[0]?.kcal)+coachTrendChart(report.days,"p","Proteínas","g",state.coachGoals[0]?.protein_g)+coachTrendChart(report.days,"c","Carbohidratos","g",state.coachGoals[0]?.carb_g)+coachTrendChart(report.days,"f","Grasas","g",state.coachGoals[0]?.fat_g)+'</div></section>';
 out+='<section class="card"><h2>⚖️ Evolución del peso corporal</h2><p class="pilot-hint">Cada registro incluye su fecha y hora. Para comparar, se recomienda un pesaje semanal en condiciones similares.</p>'+weightTrendChart(state.coachWeights)+'</section>';
 out+='<section class="card">'+coachDailyReport(p)+'</section>';
 return out;
}
function coachDailyReport(p){
 const latest=state.coachGoals[0]||null;
 const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),latest);
 const selected=report.days.find(x=>x.date===state.reportDate)||report.days.find(x=>x.date===yesterday())||report.today||report.days[0]||null;
 const dateLabel=(d)=>d.split("-").reverse().join("/");
 let out='<section class="nutrition-daily-report" id="coachDailyReport"><div class="section-head"><h3>📊 Informe nutricional diario</h3><button type="button" class="btn small light" data-act="refreshCoachReport">Actualizar</button></div>'+
 '<p class="pilot-hint">Se actualiza con los registros guardados y se consulta únicamente dentro de la app.</p>';
 if(!report.daysRecorded)return out+'<div class="empty">Sin consumos registrados. El informe aparecerá cuando el alumno cargue su primera comida.</div></section>';
 const haveClosed=report.daysClosed>0;
 out+='<div class="nutrition-report-kpis">'+
 '<div><small>Promedio de días registrados</small><strong>'+num(report.average.k)+' kcal</strong><span>'+report.daysRecorded+' día(s) con consumo</span></div>'+
 '<div><small>Días cerrados</small><strong>'+report.daysClosed+'</strong><span>De '+report.daysRecorded+' días registrados</span></div>'+
 '<div><small>Promedio de días cerrados</small><strong>'+(haveClosed?num(report.finishedAverage.k)+' kcal':'—')+'</strong><span>'+(haveClosed?'Cierres confirmados':'Aún sin días cerrados')+'</span></div></div>'+
 '<p class="pilot-hint">Los días sin registros no se cuentan como cero. Los días parciales pueden cambiar. El cierre lo declara el alumno.</p>'+
 '<div class="field" style="margin:12px 0"><label for="coachReportDate">Elegí la fecha del informe</label><select id="coachReportDate">'+report.days.map(d=>'<option value="'+escapeHTML(d.date)+'" '+(d.date===selected?.date?'selected':'')+'>'+dateLabel(d.date)+' · '+(d.closed?'Cerrado':'Parcial')+'</option>').join("")+'</select></div>';
 if(selected){
  const diff=latest?.kcal?Math.round(selected.k-latest.kcal):null;
  out+='<div class="nutrition-day-sheet"><div class="between"><h4>'+dateLabel(selected.date)+'</h4><span class="pilot-pill">'+(selected.closed?'Día cerrado':'Registro parcial')+'</span></div>'+
   '<div class="nutrition-day-energy"><strong>'+num(selected.k)+' kcal</strong>'+(latest?.kcal?'<small>Objetivo actual '+num(latest.kcal)+' kcal · '+(diff>=0?'+':'')+num(diff)+' kcal</small>':'<small>Sin objetivo aprobado</small>')+'</div>'+
   '<div class="nutrition-macro-grid"><span>P <b>'+num(selected.p,1)+' g</b></span><span>HC <b>'+num(selected.c,1)+' g</b></span><span>G <b>'+num(selected.f,1)+' g</b></span><span>Fibra <b>'+num(selected.fi,1)+' g</b></span></div>'+
   '<div class="nutrition-meal-table">'+selected.meals.filter(m=>m.foods>0&&!m.omitted).map(m=>'<div><span>'+escapeHTML(m.label)+'</span><b>'+num(m.kcal)+' kcal</b></div>').join("")+'</div>'+
   '<small>'+selected.mealCount+' comidas registradas'+(selected.sportCount?' · '+selected.sportCount+' suplementos o bebidas':'')+'. '+(selected.closed?'Marcado como terminado por el alumno.':'Puede faltar carga de alimentos.')+'</small></div>'+
   '<button class="btn light" data-act="copyDailyReport" style="margin-top:12px">Copiar informe del día</button>';
 }
 out+='<h4 style="margin-top:18px">Historial de hasta 14 días</h4>'+
 '<div class="pilot-table-wrap"><table class="pilot-table"><thead><tr><th>Día</th><th>Kcal</th><th>Proteínas</th><th>Estado</th></tr></thead><tbody>'+
 report.days.map(d=>'<tr><td>'+dateLabel(d.date)+'</td><td>'+(d.hasData?num(d.k):'—')+'</td><td>'+(d.hasData?num(d.p,1)+' g':'—')+'</td><td>'+(d.closed?'Cerrado':d.hasData?'Parcial':'Sin comidas')+'</td></tr>').join("")+'</tbody></table></div></section>';
 return out;
}
function studentDetailView(p,consent){
 if(!consent?.accepted)return '<section class="card"><h2>'+escapeHTML(p.nickname)+'</h2><div class="pilot-alert" style="margin-top:13px">El alumno todavía no autorizó compartir su información nutricional. No es posible consultar sus registros ni asignar objetivos hasta que consienta.</div></section>';
 const latest=state.coachGoals[0];
 return '<section class="card"><h2>'+escapeHTML(p.nickname)+'</h2><span class="pilot-pill">Consentimiento activo</span><div class="divider"></div>'+coachDailyReport(p)+
 '<div class="divider"></div><h3>Variación del peso corporal</h3>'+weightTrendChart(state.coachWeights)+
 '<h4 style="margin:15px 0 8px">Pesajes recientes</h4>'+(state.coachWeights.length?state.coachWeights.slice(0,5).map(w=>'<div class="pilot-macro"><span>'+escapeHTML(weightDateLabel(w))+'</span><b>'+num(w.kg,1)+' kg</b></div>').join(""):'<p class="pilot-hint">Sin pesajes aún.</p>')+
 '<div class="divider"></div><h3>Plan nutricional</h3>'+(latest?'<div class="pilot-notice" style="margin-top:10px"><strong>'+num(latest.kcal)+' kcal/día</strong><small>P '+latest.protein_g+' g · HC '+latest.carb_g+' g · G '+latest.fat_g+' g · Fibra '+latest.fiber_g+' g</small></div>':'<p class="pilot-hint">Sin plan aprobado.</p>')+
 coachFoodChoices(p,consent)+'<div class="divider"></div><h3>Calculadora de objetivos</h3><p class="pilot-hint">Estimación de Mifflin–St Jeor para adultos. Propuesta inicial revisable según entrenamiento y evolución.</p>'+
 '<div class="pilot-form"><div class="field-row"><div class="field"><label>Sexo de ecuación</label><select id="targetSex"><option value="male">Hombre</option><option value="female">Mujer</option></select></div><div class="field"><label>Objetivo</label><select id="targetGoal"><option value="fat_loss">Pérdida de grasa</option><option value="recomp">Recomposición</option><option value="muscle_gain">Ganancia muscular</option></select></div></div><div class="field-row"><div class="field"><label>Edad</label><input type="number" min="18" max="90" value="30" id="targetAge"></div><div class="field"><label>Altura (cm)</label><input type="number" min="120" max="220" value="170" id="targetHeight"></div></div><div class="field-row"><div class="field"><label>Peso (kg)</label><input type="number" min="35" max="300" value="'+(state.coachWeights[0]?.kg||75)+'" id="targetWeight"></div><div class="field"><label>Actividad estimada</label><select id="targetActivity"><option value="1.2">Baja</option><option value="1.35">Ligera</option><option value="1.5" selected>Moderada</option><option value="1.7">Alta</option></select></div></div><button class="btn block" data-act="calculateGoal">Calcular propuesta</button></div><div id="goalPreview" class="pilot-notice" style="margin-top:15px">Los resultados aparecerán aquí.</div><button class="btn block" data-act="approveGoal" id="approveGoalButton" disabled style="margin-top:10px">Aprobar y enviar al alumno</button></section>';
}
function adminView(){
 const orgs=state.orgs;
 return rootText("Administración EFG","Gestioná los entrenadores, sus cupos y las licencias, sin consultar datos nutricionales privados de sus alumnos.")+
 '<div class="pilot-kpis"><div class="card"><div class="metric-label">ENTRENADORES</div><div class="metric-value">'+orgs.length+'</div></div><div class="card"><div class="metric-label">LICENCIAS ACTIVAS</div><div class="metric-value">'+orgs.filter(o=>['active','trial','grace'].includes(o.status)).length+'</div></div><div class="card"><div class="metric-label">CUPO CONTRATADO TOTAL</div><div class="metric-value">'+orgs.reduce((n,o)=>n+o.seat_limit,0)+'</div></div><div class="card"><div class="metric-label">ALUMNOS VISIBLES POR EFG</div><div class="metric-value">0</div><p class="subtle">Privacidad por diseño</p></div></div>'+
 '<div class="pilot-two"><div class="pilot-stack"><div class="card"><h2>Entrenadores habilitados</h2>'+(orgs.length?orgs.map(org=>'<div class="pilot-record"><div class="between"><div><strong>'+escapeHTML(org.name)+'</strong><small>'+num(org.seat_limit)+' cupos · '+escapeHTML(org.status)+' · '+(org.coach_id?'Acceso activado':'Pendiente de registro')+'</small></div><div class="pilot-toolbar"><button class="btn small light" data-seats="'+org.id+'">Modificar cupos</button><button class="btn small ghost" data-orgstatus="'+org.id+'">'+(org.status==="suspended"?"Reactivar":"Suspender")+'</button></div></div></div>').join(""):'<div class="empty">Todavía no se habilitaron entrenadores.</div>')+'</div><div class="card"><h2>Invitaciones de coaches</h2>'+ (state.invitations.length?state.invitations.filter(i=>i.role==="coach").map(i=>'<div class="pilot-record"><strong>'+escapeHTML(i.nickname)+'</strong><small>'+safePhoneEmail(i.email)+' · '+(i.claimed_by?'Activado':'Pendiente')+'</small>'+(!i.claimed_by&&!i.revoked_at?'<button class="btn small ghost" data-revokeinvite="'+i.id+'" style="margin-top:8px">Cancelar invitación</button>':'')+'</div>').join(""):'<p class="pilot-hint">Sin invitaciones comerciales.</p>')+'</div></div>'+
 '<div class="pilot-stack"><div class="card"><h2>Habilitar nuevo coach</h2><p class="pilot-hint">El entrenador recibirá una cuenta profesional al iniciar sesión con el correo que autorices. Vos definís sus cupos.</p><div class="pilot-form"><div class="field"><label>Nombre / usuario profesional</label><input id="newCoachName" placeholder="Ej. CoachCarla" maxlength="70"></div><div class="field"><label>Correo electrónico</label><input id="newCoachEmail" type="email" placeholder="coach@email.com"></div><div class="field"><label>Cupo contratado de alumnos</label><input id="newCoachSeats" type="number" min="1" max="10000" value="5"></div><button class="btn block" data-act="inviteCoach">Habilitar entrenador</button></div></div><div class="card"><h2>Alias de EFG Nutrition</h2><p class="pilot-hint">Lo verán exclusivamente los entrenadores para abonar sus licencias.</p><div class="pilot-form"><div class="field"><label>Alias de cobro</label><input id="platformAlias" value="'+escapeHTML(state.platformAlias||"")+'" maxlength="100" placeholder="EFG.NUTRITION"></div><button class="btn" data-act="savePlatformAlias">Guardar alias</button></div></div><div class="card"><h2>Mi cuenta personal</h2><p class="pilot-hint">Como propietario podés usar también tu diario nutricional, pero no ver los diarios de otros entrenadores.</p><button class="btn light" data-tab="home">Abrir mi alimentación</button></div></div></div>';
}
function paymentsView(){
 let role=state.profile.role,org=state.org;
 let kind=role==="student"?"student_coach":role==="coach"?"coach_efg":null;
 let alias=kind==="student_coach"?org?.payment_alias:kind==="coach_efg"?state.platformAlias:null;
 return rootText("Pagos y comprobantes","Transferí al alias indicado, adjuntá la foto y el destinatario revisará la acreditación.")+
 '<div class="pilot-two"><div class="pilot-stack">'+ (kind?'<div class="card"><h2>Enviar comprobante</h2><div class="pilot-notice" style="margin-top:16px"><strong>Alias del destinatario: '+escapeHTML(alias||"Todavía no configurado")+'</strong><small>'+(kind==="student_coach"?"Tu entrenador es quien recibe y verifica el pago.":"EFG Nutrition recibe y verifica la suscripción profesional.")+'</small></div><div class="pilot-form"><div class="field"><label>Importe transferido (ARS)</label><input id="payAmount" type="number" min="1" step=".01" placeholder="Importe"></div><div class="field"><label>Mes / período del pago</label><input id="payPeriod" type="month" value="'+today().slice(0,7)+'"></div><div class="field"><label>Foto del comprobante (máximo 5 MB)</label><input id="payFile" type="file" accept="image/jpeg,image/png,image/webp"></div><button class="btn block" data-act="sendProof" '+(!alias?'disabled':'')+'>Enviar comprobante al destinatario</button></div><div class="note" style="margin-top:13px">Enviar una foto NO confirma la transferencia. La acreditación debe revisarse en la cuenta bancaria antes de aprobar el pago.</div></div>':'<div class="card"><h2>Superadministración</h2><p>Recibirás las notificaciones de pago de tus entrenadores cuando configures el alias de EFG.</p></div>')+'</div>'+
 '<div class="pilot-stack"><div class="card"><h2>Historial de transferencias</h2>'+(state.payments.length?state.payments.map(p=>'<div class="pilot-record"><div class="between"><div><strong>'+num(p.amount_ars,2)+' ARS · '+escapeHTML(p.period_label)+'</strong><small>'+escapeHTML(p.payment_kind==="student_coach"?"Alumno → Entrenador":"Coach → EFG")+' · '+formatTime(p.created_at)+'</small></div><span class="pilot-pill '+(p.status==="pending"?"pending":p.status==="rejected"?"no":"")+'">'+escapeHTML({pending:"Pendiente",approved:"Aprobado",rejected:"Rechazado"}[p.status]||p.status)+'</span></div><div class="pilot-toolbar" style="margin-top:9px"><button class="btn small ghost" data-proof="'+p.receipt_path+'">Ver comprobante</button>'+(p.recipient_id===state.session.user.id&&p.status==="pending"?'<button class="btn small light" data-approve="'+p.id+'">Aprobar transferencia</button><button class="btn small ghost" data-reject="'+p.id+'">Rechazar</button>':'')+'</div></div>').join(""):'<div class="empty">Todavía no hay comprobantes.</div>')+'</div></div></div>';
}
async function render(){
 if(!state.profile)return loginView();
 await ensureCurrentDay();
 state.renderedDay=today();
 let page={home:homeView,weight:progressView,sport:sportView,coach:coachView,testCoach:state.profile.role==="admin"?coachView:homeView,reports:coachReportsView,admin:adminView,payments:paymentsView}[state.tab]||homeView;
 frame(page());
 if(state.tab==="home"){}
 if(state.tab==="sport")updateSportHint();
}
function updateFoodHint(){
 const id=document.getElementById("mealFood")?.value||foods[0].id;
 let f=foods.find(x=>x.id===id)||foods[0],hint=document.getElementById("mealHint");
 if(hint)hint.textContent=num(f.k*100)+" kcal y "+num(f.p*100,1)+" g proteínas por 100 "+f.unit+". "+f.source;
}
function updateSportHint(){
 const id=document.getElementById("sportItem")?.value||sports[0].id;
 let f=sports.find(x=>x.id===id)||sports[0],hint=document.getElementById("sportInfo"),qty=document.getElementById("sportQty"),label=document.getElementById("sportQtyLabel");
 if(qty)qty.value=f.defaultQty;
 if(label)label.textContent="Cantidad ("+f.unit+")";
 if(hint)hint.textContent=f.source+". Porción de ejemplo: "+num(f.defaultQty)+" "+f.unit+", "+num(f.k*f.defaultQty)+" kcal.";
}
function calculateGoal(){
 const get=(id)=>document.getElementById(id).value;
 const weight=+get("targetWeight"),height=+get("targetHeight"),age=+get("targetAge"),activity=+get("targetActivity"),sex=get("targetSex"),goal=get("targetGoal");
 if(!(weight>=35&&weight<=300&&height>=120&&height<=220&&age>=18&&age<=90&&activity>=1.2&&activity<=1.75))throw new Error("Datos fuera del rango permitido para adultos.");
 const rmr=10*weight+6.25*height-5*age+(sex==="male"?5:-161);
 const tdee=Math.round(rmr*activity);
 const kcal=Math.round(tdee*({fat_loss:.9,recomp:1,muscle_gain:1.07}[goal])/10)*10;
 const p=Math.round(weight*(goal==="fat_loss"?2:1.8)),f=Math.round(weight*.8),c=Math.round((kcal-4*p-9*f)/4),fi=Math.round(kcal*.014);
 if(kcal<1400||c<0)throw new Error("Estimación insuficiente; necesita revisión individual.");
 state.pendingGoal={student_id:state.selectedStudent,goal_type:goal,kcal,protein_g:p,carb_g:c,fat_g:f,fiber_g:fi};
 let e=document.getElementById("goalPreview");e.innerHTML='<strong>'+num(kcal)+' kcal/día</strong><small>Proteína '+p+' g · Hidratos '+c+' g · Grasas '+f+' g · Fibra '+fi+' g</small><small>Metabolismo estimado '+num(rmr)+' kcal, mantenimiento aproximado '+num(tdee)+' kcal. No es una medición.</small>';
 document.getElementById("approveGoalButton").disabled=false;
}
async function saveDiary(){
 const d=activeDiary();
 if(d.log_day!==today())throw new Error("Empezó un nuevo día. Volvé a registrar el alimento en la fecha actual.");
 d.totals=dailyTotals(d);d.student_id=state.session.user.id;
 const {data,error}=await sb.from("efg_daily_logs").upsert({student_id:d.student_id,log_day:d.log_day,meals:d.meals,sports:d.sports,skipped:d.skipped,totals:d.totals,updated_at:new Date().toISOString()},{onConflict:"student_id,log_day"}).select().single();
 if(error)throw error;
 state.diary=data;
 await render();
}
async function loadPersonalData(){
 const id=state.session.user.id;
 const results=await Promise.all([
 sb.from("efg_daily_logs").select("*").eq("student_id",id).eq("log_day",today()).maybeSingle(),
 sb.from("efg_weights").select("*").eq("student_id",id).order("measured_on",{ascending:false}).limit(40),
 sb.from("efg_activities").select("*").eq("student_id",id).order("activity_day",{ascending:false}).limit(20),
 sb.from("efg_goals").select("*").eq("student_id",id).order("approved_at",{ascending:false}).limit(1),
 sb.from("efg_personal_targets").select("*").eq("user_id",id).maybeSingle(),
 sb.from("efg_food_plans").select("*").eq("student_id",id).maybeSingle()
 ]);
 const error=results.find(x=>x.error)?.error;
 if(error)throw error;
 state.diary=results[0].data||null;state.renderedDay=today();state.weights=results[1].data||[];state.activities=results[2].data||[];state.goals=results[3].data||[];state.personalTargets=results[4].data||null;state.foodPlan=results[5].data||null;
}
async function loadOrgAndPayments(){
 const id=state.session.user.id,role=state.profile.role;
 let orgResult;
 if(role==="coach")orgResult=await sb.from("efg_organizations").select("*").eq("coach_id",id).maybeSingle();
 if(role==="admin")orgResult=await sb.from("efg_organizations").select("*").eq("coach_id",id).eq("is_test",true).maybeSingle();
 if(role==="student")orgResult=await sb.from("efg_organizations").select("*").eq("id",state.profile.organization_id).maybeSingle();
 if(orgResult?.error)throw orgResult.error;
 state.org=orgResult?.data||null;
 const [pay,bill]=await Promise.all([sb.from("efg_payments").select("*").order("created_at",{ascending:false}).limit(70),sb.from("efg_billing_settings").select("alias").eq("id",1).maybeSingle()]);
 if(pay.error)throw pay.error;
 if(bill.error)throw bill.error;
 state.payments=pay.data||[];state.platformAlias=bill.data?.alias||null;
}
async function loadRoleData(){
 const role=state.profile.role;
 if(role==="admin"){
  const [o,inv]=await Promise.all([sb.from("efg_organizations").select("*").order("created_at",{ascending:false}),sb.from("efg_invitations").select("*").eq("role","coach").order("created_at",{ascending:false})]);
  if(o.error||inv.error)throw o.error||inv.error;
  state.orgs=(o.data||[]).filter(o=>!o.is_test);state.invitations=inv.data||[];
  if(state.org?.is_test){
   const [students,pending]=await Promise.all([sb.from("efg_profiles").select("*").eq("organization_id",state.org.id).eq("role","student"),sb.from("efg_invitations").select("*").eq("organization_id",state.org.id).eq("role","student")]);
   if(students.error||pending.error)throw students.error||pending.error;
   state.roster=students.data||[];state.testInvitations=pending.data||[];
   if(state.selectedStudent&&state.roster.some(p=>p.user_id===state.selectedStudent))await loadStudentDetail(state.selectedStudent);
  }
 }
 if(role==="coach"){
  const org=state.org;
  if(!org)throw new Error("Tu espacio de entrenador todavía no está listo.");
  const [r,inv]=await Promise.all([sb.from("efg_profiles").select("*").eq("organization_id",org.id).eq("role","student"),sb.from("efg_invitations").select("*").eq("organization_id",org.id).eq("role","student")]);
  if(r.error||inv.error)throw r.error||inv.error;
  state.roster=r.data||[];state.invitations=inv.data||[];
  if(state.selectedStudent&&state.roster.some(p=>p.user_id===state.selectedStudent))await loadStudentDetail(state.selectedStudent);
 }
 if(role==="student"){
  const c=await sb.from("efg_consents").select("*").eq("student_id",state.session.user.id).maybeSingle();
  if(c.error)throw c.error;
  state.consent=c.data||null;
 }
}
async function loadStudentDetail(studentId){
 if(!state.roster.some(p=>p.user_id===studentId&&p.active))throw new Error("Alumno no autorizado.");
 state.selectedStudent=studentId;
 const c=await sb.from("efg_consents").select("*").eq("student_id",studentId).maybeSingle();
 if(c.error)throw c.error;
 state.consent=c.data;
 state.coachFoodPlan=null;
 if(!c.data?.accepted){state.coachLogs=[];state.coachWeights=[];state.coachGoals=[];state.coachActivities=[];return;}
 const results=await Promise.all([
 sb.from("efg_daily_logs").select("*").eq("student_id",studentId).order("log_day",{ascending:false}).limit(14),
 sb.from("efg_weights").select("*").eq("student_id",studentId).order("measured_on",{ascending:false}).limit(20),
 sb.from("efg_activities").select("*").eq("student_id",studentId).order("activity_day",{ascending:false}).limit(15),
 sb.from("efg_goals").select("*").eq("student_id",studentId).order("approved_at",{ascending:false}).limit(1),
 sb.from("efg_food_plans").select("*").eq("student_id",studentId).maybeSingle()
 ]);
 const err=results.find(x=>x.error)?.error;if(err)throw err;
 state.coachLogs=results[0].data||[];state.coachWeights=results[1].data||[];state.coachActivities=results[2].data||[];state.coachGoals=results[3].data||[];state.coachFoodPlan=results[4].data||null;
}
async function refresh(){
 if(state.loading)return;
 state.loading=true;
 try{
  const result=await sb.auth.getUser();
  if(result.error||!result.data.user){state.profile=null;return loginView();}
  const id=result.data.user.id;
  if(state.session?.user?.id!==id){state.selectedStudent=null;state.tab="home";}
  state.session={user:result.data.user};
  let claim=await sb.rpc("efg_claim_invitation");
  if(claim.error){state.profile=null;return unauthorized(claim.error.message);}
  let p=await sb.from("efg_profiles").select("*").eq("user_id",id).single();
  if(p.error)throw p.error;
  state.profile=p.data;
  if(!state.profile.active){state.profile=null;return unauthorized("Tu cuenta está inactiva. Contactá al administrador correspondiente.");}
  await Promise.all([loadPersonalData(),loadOrgAndPayments()]);
  await loadRoleData();
  await render();
 }catch(e){fail(e);root.innerHTML='<div class="pilot-loader"><h2>Hubo un problema de conexión.</h2><button class="btn" data-act="retry">Reintentar</button><p>'+escapeHTML(e.message)+'</p></div>';}
 finally{state.loading=false;}
}
async function saveWeight(){
 const kg=Number(document.getElementById("weightKg")?.value),day=document.getElementById("weightDay")?.value,time=document.getElementById("weightTime")?.value;
 if(!(kg>=20&&kg<=400&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))throw new Error("Ingresá fecha, hora y peso válidos.");
 if(day>today())throw new Error("No se puede guardar un pesaje con fecha futura.");
 const parsed=new Date(day+"T12:00:00Z");
 if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==day)throw new Error("La fecha de pesaje no es válida.");
 const {error}=await sb.from("efg_weights").upsert({student_id:state.session.user.id,measured_on:day,measured_time:time,kg},{onConflict:"student_id,measured_on"});
 if(error)throw error;
 await loadPersonalData();await render();notify("Pesaje guardado con fecha y hora.");
}
async function saveActivity(){
 const steps=Number(document.getElementById("activitySteps").value),mins=Number(document.getElementById("activityMinutes").value),kind=document.getElementById("activityKind").value;
 if(!Number.isFinite(steps)||!Number.isFinite(mins)||steps<0||steps>100000||mins<0||mins>1440)throw new Error("Revisá los valores de pasos y ejercicio.");
 const {error}=await sb.from("efg_activities").upsert({student_id:state.session.user.id,activity_day:today(),steps,exercise_minutes:mins,kind},{onConflict:"student_id,activity_day"});
 if(error)throw error;notify("Actividad registrada.");await loadPersonalData();await render();
}
async function saveEduRoutine(){
 if(state.profile.role!=="admin")throw new Error("Esa rutina pertenece a la cuenta personal de Edu.");
 let d=activeDiary();
 if((d.meals.desayuno||[]).length||(d.meals.media_manana||[]).length)throw new Error("Ya existen comidas registradas. Editalas individualmente para evitar duplicarlas.");
 let get=(id,qty,when)=>normItem(foods.find(f=>f.id===id),qty,when);
 d.meals.desayuno=[get("egg",150,"desayuno"),get("bread",38,"desayuno"),get("cheese",30,"desayuno"),get("quince",20,"desayuno"),get("milk",300,"desayuno")];
 d.meals.media_manana=[{...get("cake",82.5,"media_manana"),displayQty:1,displayUnit:"porción de budín",unitEstimate:true}];
 d.sports.push(normItem(sports.find(f=>f.id==="whey"),30,"Media mañana"));
 await saveDiary();notify("Desayuno y media mañana cargados. Revisá las cantidades estimadas.");
}
async function savePersonalTargets(){
 let n=id=>{const input=document.getElementById(id);return input.value.trim()===''?NaN:Number(input.value);};
 let vals={user_id:state.session.user.id,kcal:n("selfK"),protein_g:n("selfP"),carb_g:n("selfC"),fat_g:n("selfF"),fiber_g:n("selfFi"),updated_at:new Date().toISOString()};
 if(!Number.isFinite(vals.kcal)||vals.kcal<1200||vals.kcal>10000||Object.values(vals).slice(2,6).some(v=>!Number.isFinite(v)||v<0))throw new Error("Objetivos personales fuera de rango.");
 let {error}=await sb.from("efg_personal_targets").upsert(vals,{onConflict:"user_id"});
 if(error)throw error;state.personalTargets=vals;notify("Tus objetivos personales se actualizaron.");await render();
}
async function sendProof(){
 let input=document.getElementById("payFile"),file=input.files[0],amount=Number(document.getElementById("payAmount").value),period=document.getElementById("payPeriod").value;
 let kind=state.profile.role==="student"?"student_coach":"coach_efg";
 if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5242880)throw new Error("Elegí una foto JPG, PNG o WebP menor a 5 MB.");
 if(!Number.isFinite(amount)||amount<=0||amount>10000000||!/^\d{4}-\d{2}$/.test(period))throw new Error("Revisá importe y período.");
 const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
 const name=state.session.user.id+"/"+crypto.randomUUID()+"."+ext;
 let upload=await sb.storage.from("efg-receipts").upload(name,file,{upsert:false,contentType:file.type});
 if(upload.error)throw upload.error;
 let payment=await sb.rpc("efg_submit_payment",{p_kind:kind,p_amount_ars:amount,p_period:period,p_receipt_path:name});
 if(payment.error)throw payment.error;
 await loadOrgAndPayments();await render();notify("Comprobante registrado. El destinatario deberá verificar la transferencia.");
}
async function onePaymentAction(id,status){
 const p=state.payments.find(x=>x.id===id);
 if(!p||p.recipient_id!==state.session.user.id||p.status!=="pending")throw new Error("No tenés permiso para esta operación.");
 const answer=window.confirm(status==="approved"?"¿Verificaste que el dinero está acreditado en tu cuenta bancaria?":"¿Rechazar este comprobante?");
 if(!answer)return;
 let r=await sb.rpc("efg_confirm_payment",{p_payment:id,p_status:status});if(r.error)throw r.error;
 await loadOrgAndPayments();await render();notify("Estado del comprobante actualizado.");
}
async function showProof(path){
 const payment=state.payments.find(p=>p.receipt_path===path);
 if(!payment)throw new Error("No se encontró el comprobante autorizado.");
 let r=await sb.storage.from("efg-receipts").createSignedUrl(path,60);
 if(r.error)throw r.error;
 window.open(r.data.signedUrl,"_blank","noopener,noreferrer");
}
async function mainClick(event){
 let el=event.target.closest("button");if(!el)return;
 if(state.renderedDay&&state.renderedDay!==today()){await ensureCurrentDay();await render();notify("Nuevo día: lo anterior sigue guardado en tu historial.");return;}
 if(el.dataset.tab){
  state.tab=el.dataset.tab;
  if(state.tab==="reports"&&!state.selectedStudent){
   const student=(state.roster||[]).find(p=>p.active);
   if(student)await loadStudentDetail(student.user_id);
  }
  return render();
}
 if(el.dataset.studentstatus){
 const student=state.roster.find(x=>x.user_id===el.dataset.studentstatus);
 if(!student)throw new Error("Ese alumno no pertenece a tus cupos.");
 const next=!student.active;
 if(!window.confirm(next
  ?"¿Reactivar a "+student.nickname+"? Volverá a ocupar un cupo y tendrá que autorizar de nuevo el seguimiento."
  :"¿Dar de baja a "+student.nickname+"? Liberará su cupo y se revocará el permiso del coach. Sus registros NO se borrarán."))return;
 const {error}=await sb.rpc("efg_set_student_active",{p_student:student.user_id,p_active:next});
 if(error)throw error;
 if(state.selectedStudent===student.user_id){state.selectedStudent=null;state.consent=null;state.coachLogs=[];state.coachGoals=[];state.coachWeights=[];state.coachActivities=[];state.coachFoodPlan=null;}
 await loadRoleData();await render();notify(next?"Alumno reactivado, pendiente de nuevo consentimiento.":"Alumno dado de baja y cupo recuperado; datos conservados.");return;
}
if(el.dataset.deleteinvite){
 const invs=state.profile.role==="admin"&&state.tab==="admin"?state.invitations:(state.profile.role==="admin"&&state.org?.is_test?state.testInvitations:state.invitations);
 const inv=invs.find(x=>x.id===el.dataset.deleteinvite);
 if(!inv||inv.claimed_by)throw new Error("El correo ya fue utilizado o no existe.");
 if(!window.confirm("¿Eliminar el correo "+inv.email+" de las invitaciones? Es definitivo y libera el cupo."))return;
 const {error}=await sb.rpc("efg_delete_pending_invitation",{p_invitation:inv.id});
 if(error)throw error;
 await loadRoleData();await render();notify("Correo eliminado de las invitaciones pendientes.");return;
}
if(el.dataset.reportstudent){
 const p=(state.roster||[]).find(p=>p.user_id===el.dataset.reportstudent&&p.active);
 if(!p)throw new Error("No tenés permiso para consultar este alumno.");
 state.reportDate=null;await loadStudentDetail(p.user_id);await render();
 document.getElementById("coachDailyReport")?.scrollIntoView?.({behavior:"smooth",block:"start"});return;
}
if(el.dataset.student){
 state.reportDate=null;
 await loadStudentDetail(el.dataset.student);
 await render();
 document.getElementById("studentFollowPanel")?.scrollIntoView?.({behavior:"smooth",block:"start"});
 notify("Ficha de "+(state.roster.find(p=>p.user_id===el.dataset.student)?.nickname||"alumno")+" abierta.");
 return;
}
if(el.dataset.foodbulk){
 const group=root.querySelector('.coach-food-group[data-foodgroup="'+el.dataset.foodbulk+'"]');
 if(!group)return;
 const checked=el.dataset.foodchecked==="yes";
 group.querySelectorAll('input[data-coachfood]').forEach(x=>x.checked=checked);
 updateCoachFoodCount();return;
}
 if(el.dataset.scrollplan){document.getElementById("planSuggestionCard")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
 if(el.dataset.setmeal){openMealDialog(el.dataset.setmeal);return;}
 if(el.dataset.planmode){state.plannerMode=el.dataset.planmode==="both"?"both":"dinner";return render();}
 if(el.dataset.planadd){return addPlannedFood(el.dataset.planadd);}
 if(el.dataset.usealternative){const key=el.dataset.usealternative,chosen=state.plannerSelections["alt:"+key];if(!chosen)throw new Error("Elegí una alternativa.");state.plannerSelections[key]=chosen;delete state.plannerSelections["alt:"+key];return render();}
 if(el.dataset.removefood){
  const [slot,indexValue]=el.dataset.removefood.split(":");
  const index=Number(indexValue),d=activeDiary();
  if(!mealSlots.some(m=>m[0]===slot)||!Number.isInteger(index)||index<0||index>=(d.meals?.[slot]?.length||0))throw new Error("No encontramos ese alimento.");
  d.meals[slot].splice(index,1);d.skipped=d.skipped||{};d.skipped._closed=false;
  await saveDiary();notify("Alimento eliminado. Los macros se actualizaron.");return;
 }
 if(el.dataset.clearm){let d=activeDiary();d.meals[el.dataset.clearm]=[];d.skipped=d.skipped||{};d.skipped._closed=false;return saveDiary();}
 if(el.dataset.removesport!==undefined){let d=activeDiary();d.sports.splice(Number(el.dataset.removesport),1);d.skipped=d.skipped||{};d.skipped._closed=false;return saveDiary();}
 if(el.dataset.approve)return onePaymentAction(el.dataset.approve,"approved");
 if(el.dataset.reject)return onePaymentAction(el.dataset.reject,"rejected");
 if(el.dataset.proof)return showProof(el.dataset.proof);
 if(el.dataset.orgstatus){const org=state.orgs.find(x=>x.id===el.dataset.orgstatus);if(!org)throw new Error("Organización no encontrada.");const next=org.status==="suspended"?"active":"suspended";if(!window.confirm(next==="suspended"?"¿Suspender la cuenta de este coach? No podrá consultar alumnos ni incorporar nuevos.":"¿Reactivar esta cuenta profesional?"))return;const {error}=await sb.rpc("efg_update_subscription",{p_org:org.id,p_status:next});if(error)throw error;await loadRoleData();await render();notify("Estado de licencia actualizado.");return;}
 if(el.dataset.revokeinvite){if(!window.confirm("¿Cancelar esta invitación pendiente?"))return;const {error}=await sb.rpc(state.profile.role==="admin"&&state.org?.is_test?"efg_revoke_test_invitation":"efg_revoke_invitation",{p_invitation:el.dataset.revokeinvite});if(error)throw error;await loadRoleData();await render();notify("Invitación cancelada; el cupo quedó disponible.");return;}
 if(el.dataset.seats){let org=state.orgs.find(x=>x.id===el.dataset.seats);let value=window.prompt("Nuevo cupo contratado:",String(org?.seat_limit||5));if(value===null)return;let count=Number(value);if(!Number.isInteger(count)||count<1||count>10000)throw new Error("Cupo inválido.");let {error}=await sb.rpc("efg_set_seats",{p_org:el.dataset.seats,p_seats:count});if(error)throw error;await loadRoleData();await render();notify("Cupo actualizado.");return;}
 const action=el.dataset.act;if(!action)return;
 if(action==="logout"){await sb.auth.signOut();state.session=null;state.profile=null;state.tab="home";state.otpEmail=null;return loginView();}
 if(action==="loginBack"){state.otpEmail=null;return loginView();}
 if(action==="resendOtp"){return requestOtp(state.otpEmail);}
 if(action==="retry")return refresh();
 if(action==="toggleDayClosed"){
  if(state.profile.role!=="student")throw new Error("Solo el alumno puede finalizar su registro.");
  const diary=activeDiary();
  if(!Object.values(diary.meals||{}).some(x=>x?.length)&&!diary.sports?.length)throw new Error("Registrá primero lo consumido.");
  diary.skipped=diary.skipped||{};
  diary.skipped._closed=!diary.skipped._closed;
  const closed=diary.skipped._closed;
  await saveDiary();
  notify(closed?"Día cerrado. Tu entrenador verá que finalizaste el registro.":"Registro reabierto para corregir datos.");
  return;
 }
 if(action==="refreshCoachReport"){
  if(!state.selectedStudent||!state.consent?.accepted)throw new Error("Seleccioná un alumno que haya autorizado el seguimiento.");
  await loadStudentDetail(state.selectedStudent);
  await render();
  document.getElementById("coachDailyReport")?.scrollIntoView?.({behavior:"smooth",block:"start"});
  notify("Informe actualizado con los consumos registrados.");
  return;
 }
 if(action==="copyDailyReport"){
  const p=state.roster.find(x=>x.user_id===state.selectedStudent);
  if(!p||!state.consent?.accepted)throw new Error("Acceso no autorizado.");
  const report=buildNutritionReport(state.coachLogs,mealSlots,dailyTotals,today(),state.coachGoals[0]||null);
  const content=nutritionReportText(report,p.nickname,state.reportDate||report.today?.date||report.days[0]?.date);
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(content);notify("Informe del día copiado.");}
  else window.prompt("Copiá el informe:",content);
  return;
 }
 if(action==="closeMeal"){document.getElementById("mealDialogContainer").innerHTML="";state.activeMeal=null;return;}
 if(action==="saveSelectedMeal"){return saveSelectedMeal();}
 if(action==="addSport"){let id=document.getElementById("sportItem").value,qty=Number(document.getElementById("sportQty").value),when=document.getElementById("sportTime").value,product=sports.find(x=>x.id===id);if(!Number.isFinite(qty)||qty<=0||qty>3000)throw new Error("Cantidad inválida.");let d=activeDiary();d.sports.push(normItem(product,qty,when));d.skipped=d.skipped||{};d.skipped._closed=false;await saveDiary();notify("Consumo registrado.");return;}
 if(action==="saveConsent"){
 const accepted=!!document.getElementById("consentToggle")?.checked;

 const {data,error}=await sb.from("efg_consents").update({
  accepted,email_report_opt_in:false,updated_at:new Date().toISOString()
 }).eq("student_id",state.session.user.id).select().single();
 if(error)throw error;
 state.consent=data;await render();
 notify(!accepted?"Permisos revocados.":"Seguimiento autorizado dentro de EFG Nutrition.");
 return;
}
 if(action==="saveWeight")return saveWeight();
 if(action==="saveActivity")return saveActivity();
 if(action==="loadEdu")return saveEduRoutine();
 if(action==="inviteCoach"){const email=document.getElementById("newCoachEmail").value.trim(),name=document.getElementById("newCoachName").value.trim(),seats=Number(document.getElementById("newCoachSeats").value);let r=await sb.rpc("efg_invite_coach",{p_email:email,p_name:name,p_seats:seats});if(r.error)throw r.error;await loadRoleData();await render();notify("Coach habilitado. Compartí su correo y dirección de acceso.");return;}
 if(action==="inviteStudent"){const email=document.getElementById("studentEmail").value.trim(),name=document.getElementById("studentName").value.trim();let r=await sb.rpc(state.profile.role==="admin"&&state.org?.is_test?"efg_invite_test_student":"efg_invite_student",{p_email:email,p_name:name});if(r.error)throw r.error;await loadRoleData();await render();notify("Alumno habilitado en los cupos de este coach.");return;}
 if(action==="coachAlias"){let alias=document.getElementById("coachAlias").value.trim();let r=await sb.rpc("efg_set_coach_alias",{p_alias:alias});if(r.error)throw r.error;await loadOrgAndPayments();await render();notify("Alias de cobro guardado.");return;}
 if(action==="savePlatformAlias"){let alias=document.getElementById("platformAlias").value.trim();let r=await sb.rpc("efg_set_platform_alias",{p_alias:alias});if(r.error)throw r.error;await loadOrgAndPayments();await render();notify("Alias EFG actualizado.");return;}
 if(action==="previewMacros"){const n=id=>Number(document.getElementById(id).value);const input={age:n("previewAge"),height:n("previewHeight"),weight:n("previewWeight"),activity:n("previewActivity"),sex:document.getElementById("previewSex").value};state.macroPreview=["fat_loss","recomp","muscle_gain"].map(goal=>macroEstimate(input.age,input.height,input.weight,input.activity,input.sex,goal));state.macroInputs=input;await render();notify("Tres propuestas calculadas sin modificar planes reales.");return;}
 if(action==="copyStudentLink"){const link="https://efg-nutrition.onrender.com/pilot/";if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(link);notify("Enlace copiado; compartilo con el alumno habilitado.");}else{window.prompt("Copiá el enlace para tu alumno:",link);}return;}
 if(action==="calculateGoal")return calculateGoal();
 if(action==="saveCoachFoodPlan"){return saveCoachFoods();}
 if(action==="approveGoal"){if(!state.pendingGoal||state.pendingGoal.student_id!==state.selectedStudent)throw new Error("Calculá primero una propuesta.");let {error}=await sb.from("efg_goals").insert({...state.pendingGoal,approved_by:state.session.user.id,start_on:today()});if(error)throw error;await loadStudentDetail(state.selectedStudent);await render();notify("Plan aprobado y disponible para el alumno.");return;}
 if(action==="sendProof")return sendProof();
 if(action==="setSelfGoals"){return savePersonalTargets();}
}
async function updateAtDayChange(){
 if(!state.profile||!state.session||!state.renderedDay||state.renderedDay===today())return;
 await ensureCurrentDay();
 await render();
 notify("Nuevo día: empezamos en cero, sin borrar tus registros anteriores.");
}
root.addEventListener("click",e=>{mainClick(e).catch(fail);});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateAtDayChange().catch(fail);});
window.addEventListener("focus",()=>updateAtDayChange().catch(fail));
setInterval(()=>updateAtDayChange().catch(fail),10000);
root.addEventListener("change",e=>{if(state.renderedDay&&state.renderedDay!==today()){updateAtDayChange().catch(fail);return;}if(e.target.id==="coachReportDate"){state.reportDate=e.target.value;render();document.getElementById("coachDailyReport")?.scrollIntoView?.({behavior:"smooth",block:"start"});return;}if(e.target.dataset.coachfood)updateCoachFoodCount();if(e.target.id==="sportItem")updateSportHint();if(e.target.id==="mealEditorFood")updateMealEntryMode(true);if(e.target.id==="mealEntryMode")updateMealEntryMode(false);if(e.target.dataset.planselect){state.plannerSelections[e.target.dataset.planselect]=e.target.value;render();}if(e.target.dataset.planalt){state.plannerSelections["alt_"+e.target.dataset.planalt]=e.target.value;render();}if(e.target.dataset.skipmeal){const d=activeDiary();d.skipped=d.skipped||{};d.skipped[e.target.dataset.skipmeal]=e.target.checked;d.skipped._closed=false;saveDiary().catch(fail);}});
root.addEventListener("input",e=>{if(e.target.id==="coachFoodSearch")filterCoachFoodLibrary();if(e.target.id==="mealFoodSearch")filterMealFoods();if(e.target.id==="mealEditorQty")updateMealDialogHint();});
root.addEventListener("submit",e=>{
 if(e.target.id==="pilot-login-form"){
  e.preventDefault();
  if(state.loggingIn)return;
  const email=e.target.querySelector("#loginEmail")?.value;
  requestOtp(email).catch(fail);
 }else if(e.target.id==="pilot-otp-form"){
  e.preventDefault();
  if(state.loggingIn)return;
  const token=e.target.querySelector("#loginOtp")?.value;
  confirmOtp(token).catch(fail);
 }
});
(async function init(){
 const {data,error}=await sb.auth.getSession();
 if(error)fail(error);
 if(data?.session)await refresh();else loginView();
 sb.auth.onAuthStateChange((event,session)=>{
  if(event==="SIGNED_IN"&&!state.loading)queueMicrotask(()=>refresh());
  if(event==="SIGNED_OUT"){state.session=null;state.profile=null;loginView();}
 });
})();
