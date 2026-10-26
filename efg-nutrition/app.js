/* EFG Nutrition - public demonstration. No real accounts or transmission of private data. */
(function(){
"use strict";
var TODAY=new Date().toLocaleDateString("en-CA");
var MEALS=[["desayuno","Desayuno","☀"],["media-manana","Media mañana","🥛"],["almuerzo","Almuerzo","◒"],["media","Media tarde","☕"],["merienda","Merienda","🍎"],["cena","Cena","☾"]];
var FOODS=[
["Huevo entero","Genérico","proteinas",143,12.6,0.7,9.5,0],
["Clara de huevo","Genérico","proteinas",52,10.9,0.7,0.2,0],
["Pechuga de pollo cocida","Genérico","proteinas",165,31,0,3.6,0],
["Carne vacuna magra cocida","Genérico","proteinas",210,29,0,9,0],
["Lomo de cerdo cocido","Genérico","proteinas",196,29,0,8.5,0],
["Atún al natural escurrido","Genérico","proteinas",116,26,0,1,0],
["Yogur natural descremado","Genérico","lacteos",60,5,7,1,0],
["Queso untable común","Genérico promedio","lacteos",250,6,4,23,0],
["Queso untable light","Genérico promedio","lacteos",150,9,5,10,0],
["Queso Port Salut Light","La Serenísima · ficha a verificar","lacteos",217,27,1.7,12,0],
["Leche descremada","Genérico","lacteos",35,3.4,5,0.1,0],
["Arroz blanco cocido","Genérico","hidratos",130,2.7,28,0.3,0.4],
["Fideos secos tradicionales","Genérico","hidratos",350,12,72,1.5,3.2],
["Fideos cocidos","Genérico","hidratos",155,5.8,30.5,0.9,1.8],
["Papa hervida","Genérico","hidratos",87,1.9,20,0.1,1.8],
["Pan integral","Genérico","hidratos",247,13,41,4.2,7],
["Avena seca","Genérico","hidratos",389,16.9,66.3,6.9,10.6],
["Mostachón proteico","Receta EFG · verificar por unidad","hidratos",326,23.2,39.2,9.6,3],
["Aceite de oliva","Genérico","grasas",884,0,0,100,0],
["Palta","Genérico","grasas",160,2,8.5,14.7,6.7],
["Almendras","Genérico","grasas",579,21,21.6,49.9,12.5],
["Banana","Genérico","vegetales",89,1.1,22.8,0.3,2.6],
["Mandarina","Genérico","vegetales",53,0.8,13.3,0.3,1.8],
["Calabaza cocida","Genérico","vegetales",34,1,8,0.1,1],
["Rúcula","Genérico","vegetales",25,2.6,3.7,0.7,1.6],
["Tomate","Genérico","vegetales",18,0.9,3.9,0.2,1.2],
["Proteína en polvo sin marca","Promedio ilustrativo · verificar etiqueta","suplementos",390,75,9,5,0],
["Leche Protein descremada","La Serenísima · etiqueta específica a confirmar","lacteos",42,5.2,4.6,0,0],
["Dulce de membrillo","Genérico estimado","hidratos",270,0.3,67,0.1,0.4],
["Budín proteico casero Edu","Receta propia · estimación por porción de 75 g","hidratos",217.3,15.47,26.13,6.4,3.73],
["Queso untable descremado (capa fina)","Genérico estimado","lacteos",150,9,5,10,0]
].map(function(a,i){return {id:i,n:a[0],b:a[1],group:a[2],k:a[3],p:a[4],c:a[5],f:a[6],fi:a[7]};});

var SPORT_PRODUCTS=[
 {id:"whey",name:"Proteína whey (genérica)",sub:"Scoop de ejemplo; verificar gramos reales y aminograma",kind:"Proteína",unit:"g",serving:30,k:3.90,p:.75,c:.09,f:.05,fi:0,detail:"El contenido proteico depende de la marca. Un scoop no siempre equivale a 30 g."},
 {id:"creatine",name:"Creatina monohidratada",sub:"Registro de cantidad; sin aporte relevante de macros",kind:"Rendimiento",unit:"g",serving:5,k:0,p:0,c:0,f:0,fi:0,detail:"Uso habitual en adultos deportistas: 3–5 g/día cuando está indicado; no requiere postentreno."},
 {id:"magnesium",name:"Magnesio (suplemento)",sub:"Cantidad del preparado en mg; datos de etiqueta necesarios",kind:"Micronutrientes",unit:"mg",serving:200,k:0,p:0,c:0,f:0,fi:0,detail:"Cargar el magnesio elemental declarado en la etiqueta. No inferir indicaciones."},
 {id:"omega3",name:"Omega-3, aceite en cápsulas",sub:"Una cápsula genérica de 1 g de aceite, composición a verificar",kind:"Micronutrientes",unit:"cápsula",serving:1,k:9,p:0,c:0,f:1,fi:0,detail:"9 kcal por cápsula estimadas para 1 g de aceite. EPA y DHA requieren etiqueta."},
 {id:"gel",name:"Gel energético para correr",sub:"Unidad genérica: 25 g de hidratos; verificar fabricante",kind:"Resistencia",unit:"gel",serving:1,k:100,p:0,c:25,f:0,fi:0,detail:"El aporte de hidratos, sodio y cafeína depende de cada gel."},
 {id:"isotonic",name:"Bebida isotónica con azúcar",sub:"Promedio orientativo: 6 g de hidratos / 100 ml",kind:"Hidratación",unit:"ml",serving:500,k:.24,p:0,c:.06,f:0,fi:0,detail:"Para esfuerzos prolongados o calor intenso puede ser útil; verificar etiqueta."},
 {id:"electrolytes",name:"Electrolitos sin azúcar",sub:"El sodio y otros electrolitos dependen de la marca",kind:"Hidratación",unit:"porción",serving:1,k:0,p:0,c:0,f:0,fi:0,detail:"Las necesidades de sodio varían con sudoración, actividad y condiciones."},
 {id:"water",name:"Agua sin gas",sub:"Hidratación habitual",kind:"Hidratación",unit:"ml",serving:300,k:0,p:0,c:0,f:0,fi:0,detail:"Opción habitual para hidratación."},
 {id:"sparkling",name:"Agua gasificada sin azúcar",sub:"Alternativa de hidratación sin calorías",kind:"Hidratación",unit:"ml",serving:300,k:0,p:0,c:0,f:0,fi:0,detail:"Una alternativa al agua sin gas si se tolera bien."},
 {id:"zero",name:"Gaseosa zero",sub:"Sin azúcar; aporte energético aproximado cero",kind:"Hidratación",unit:"ml",serving:350,k:0,p:0,c:0,f:0,fi:0,detail:"Alternativa ocasional; no es nutricionalmente superior al agua."}
];
var SPORT_TIMES=[["media-manana","Media mañana"],["media-tarde","Media tarde"],["post-entreno","Postentreno"],["pre-entreno","Preentreno"],["durante-entreno","Durante entrenamiento"],["desayuno","Desayuno"],["almuerzo","Almuerzo"],["merienda","Merienda"],["cena","Cena"],["otro","Otro momento"]];
function sportEntries(){return state.sports[TODAY]||[];}
function sportSummary(){
 var totals={k:0,p:0,c:0,f:0,fi:0};
 sportEntries().forEach(function(entry){
  var product=SPORT_PRODUCTS.find(function(x){return x.id===entry.id;});
  if(product)Object.keys(totals).forEach(function(key){totals[key]+=product[key]*entry.amount;});
 });
 return totals;
}
function sportPage(){
 var entries=sportEntries(),sums=sportSummary();
 var remainingEnergy=state.goals.k-totals().k;
 var energyAdvice=remainingEnergy<=250?"Con tu balance actual, priorizá bebidas sin aporte energético si solo buscás hidratación.":("Te quedan aproximadamente "+fmt(remainingEnergy)+" kcal en tu objetivo ilustrativo. Elegí bebidas según tu actividad y preferencia.");
 var products=SPORT_PRODUCTS.map(function(x){return '<option value="'+x.id+'">'+esc(x.name)+'</option>';}).join("");
 var times=SPORT_TIMES.map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>';}).join("");
 var recommendation='<div class="advice-item"><span>💧</span><div><b>Para la hidratación habitual</b><p>Agua sin gas o gasificada sin azúcar: ambas pueden hidratar. Elegí según tus preferencias y tolerancia.</p></div></div>'+
 '<div class="advice-item"><span>🥤</span><div><b>¿Bebidas zero?</b><p>Pueden ayudar a reemplazar bebidas azucaradas cuando se busca reducir calorías, pero no son mejores que el agua.</p></div></div>'+
 '<div class="advice-item"><span>🏃</span><div><b>Para entrenamientos largos</b><p>En resistencia prolongada o sudoración alta pueden ser útiles bebidas con hidratos y electrolitos o geles. Se contabilizan sus calorías.</p></div></div>';
 return pageHead("NUTRICIÓN DEPORTIVA","Suplementos e hidratación","Registrá porciones, scoops, geles y bebidas según el momento del día.")+
 '<div class="note" style="margin-bottom:16px">💧 <b>Según tu objetivo diario:</b> '+esc(energyAdvice)+' La recomendación no sustituye la valoración individual.</div>'+
 '<div class="sport-intro"><div><span class="sport-kicker">✦ COMPLEMENTÁ TU REGISTRO</span><h2>Tu entrenamiento también cuenta.</h2><p>Registrá lo que tomás o consumís antes, durante y después de entrenar. Las calorías se suman al resumen diario.</p></div><span class="sport-decor">🏋️</span></div>'+
 '<div class="grid kpi-grid sport-stats"><div class="card"><div class="metric-label">ENERGÍA REGISTRADA</div><div class="metric-value">'+fmt(sums.k)+' <span>kcal</span></div></div><div class="card"><div class="metric-label">PROTEÍNA AÑADIDA</div><div class="metric-value">'+fmt(sums.p,1)+' <span>g</span></div></div><div class="card"><div class="metric-label">HIDRATOS AÑADIDOS</div><div class="metric-value">'+fmt(sums.c,1)+' <span>g</span></div></div></div>'+
 '<div class="two-col"><div class="stack"><section class="card">'+cardHead("Agregar al registro",'<span class="pill">Datos orientativos</span>')+
 '<div class="field"><label>Producto / suplemento</label><select id="sportProduct">'+products+'</select></div>'+
 '<div class="field-row" style="margin-top:14px"><div class="field"><label>Momento del día</label><select id="sportTime">'+times+'</select></div><div class="field"><label>Cantidad <span id="sportUnitLabel">(g)</span></label><input type="number" id="sportAmount" min="0.1" max="2000" step="any" value="30"></div></div>'+
 '<div id="sportProductNote" class="note" style="margin-top:14px"></div><button class="btn block" style="margin-top:14px" data-action="addSport">+ Registrar consumo</button>'+
 '<div class="quick-tip"><span>🔬</span><div><b>Prioridad a los datos reales.</b> El scoop depende de la marca; para aminoácidos, EPA/DHA y minerales necesitaremos la etiqueta del producto. No son recomendaciones de suplementación.</div></div></section>'+
 '<section class="card">'+cardHead("Consumos de hoy",'<span class="pill">'+entries.length+' registros</span>')+
 (entries.length?entries.map(function(e,i){var prod=SPORT_PRODUCTS.find(function(x){return x.id===e.id;});if(!prod)return "";return '<div class="list-row"><div><b>'+esc(prod.name)+'</b><small>'+fmt(e.amount,1)+' '+esc(prod.unit)+' · '+esc((SPORT_TIMES.find(function(x){return x[0]===e.time;})||["","Otro"])[1])+' · '+fmt(prod.k*e.amount)+' kcal</small></div><button class="btn small ghost" data-remove-sport="'+i+'" aria-label="Eliminar registro">Eliminar</button></div>';}).join(""):'<div class="empty">Aún no registraste suplementos o bebidas hoy.</div>')+'</section></div>'+
 '<div class="stack"><section class="card">'+cardHead("¿Qué bebida elegir?")+'<div class="advice-list">'+recommendation+'</div><div class="note" style="margin-top:16px">Consejos generales, no prescripciones. La bebida depende de duración, intensidad, clima, sudoración y objetivo nutricional.</div></section>'+
 '<section class="card">'+cardHead("Evidencia científica")+
 '<div class="list-row"><div><b>Creatina</b><small>Fuerza y ejercicios intensos; cantidad y pertinencia individual</small></div><span class="pill">Evidencia sólida</span></div>'+
 '<div class="list-row"><div><b>Whey protein</b><small>Practicidad para alcanzar las proteínas del plan</small></div><span class="pill">Alimento deportivo</span></div>'+
 '<div class="list-row"><div><b>Geles e isotónicas</b><small>Particularmente útiles en ciertos esfuerzos de resistencia</small></div><span class="pill grey">Según contexto</span></div>'+
 '<div class="list-row"><div><b>Omega-3 y magnesio</b><small>Registrar sin recomendar consumo general indiscriminado</small></div><span class="pill grey">Individualizar</span></div>'+
 '<p class="subtle" style="margin-top:14px">Fuentes: AIS Sports Supplements Framework, NIH ODS y ACSM. Los datos de productos de esta demo son estimaciones, no fichas de marca.</p></section></div></div>';
}
function updateSportProduct(){
 var picker=document.getElementById("sportProduct"),qty=document.getElementById("sportAmount"),note=document.getElementById("sportProductNote"),unit=document.getElementById("sportUnitLabel");
 if(!picker||!qty||!note||!unit)return;
 var product=SPORT_PRODUCTS.find(function(x){return x.id===picker.value;})||SPORT_PRODUCTS[0];
 qty.value=product.serving;
 unit.textContent="("+product.unit+")";
 note.textContent=product.detail+" · "+fmt(product.k*product.serving)+" kcal por porción de ejemplo.";
}


function foodIdByName(name){var f=FOODS.find(function(x){return x.n===name;});return f?f.id:null;}
function eduRoutine(){
 var egg=foodIdByName("Huevo entero"),bread=foodIdByName("Pan integral"),cheese=foodIdByName("Queso Port Salut Light"),quince=foodIdByName("Dulce de membrillo"),milk=foodIdByName("Leche Protein descremada"),cake=foodIdByName("Budín proteico casero Edu");
 var breakfast=[{id:egg,grams:150},{id:bread,grams:38},{id:cheese,grams:30},{id:quince,grams:20},{id:milk,grams:300}];
 var morning=(new Date().getDay()===0||new Date().getDay()===6)?[]:[{id:cake,grams:75}];
 return {breakfast:breakfast,morning:morning,whey:{id:"whey",amount:30,time:"media-manana"}};
}
function installEduDemoRoutine(){
 var demo=eduRoutine();
 state.favorites.desayuno=demo.breakfast.map(function(i){return Object.assign({},i);});
 if(demo.morning.length)state.favorites["media-manana"]=demo.morning.map(function(i){return Object.assign({},i);});
 state.days[TODAY]=state.days[TODAY]||{};
 state.days[TODAY].desayuno=demo.breakfast.map(function(i){return Object.assign({},i);});
 state.days[TODAY]["media-manana"]=demo.morning.map(function(i){return Object.assign({},i);});
 state.sports[TODAY]=(state.sports[TODAY]||[]).filter(function(i){return !(i.id==="whey"&&i.time==="media-manana");});
 state.sports[TODAY].push(demo.whey);
 state.skipped[TODAY]=state.skipped[TODAY]||{};
 state.skipped[TODAY].desayuno=false;state.skipped[TODAY]["media-manana"]=false;
 save();render();toast("Rutina de Edu cargada en esta demo. Podés modificar las cantidades.");
}

var defaultState={goals:{k:2200,p:160,c:230,f:70,fi:30},days:{},skipped:{},favorites:{},weights:[],activity:[],receipts:[],sports:{},settings:{coachAlias:"",efgAlias:""},demoRole:"alumno"};
var state;
try{state=Object.assign({},defaultState,JSON.parse(localStorage.getItem("efg-nutrition-demo-v1")||"{}"));}catch(e){state=JSON.parse(JSON.stringify(defaultState));}
state.goals=Object.assign({},defaultState.goals,state.goals||{});
state.settings=Object.assign({},defaultState.settings,state.settings||{});
["days","skipped","favorites","sports"].forEach(function(k){if(!state[k])state[k]={};});
["weights","activity","receipts"].forEach(function(k){if(!Array.isArray(state[k]))state[k]=[];});
var tab="home",foodQuery="",foodGroup="todos",selectedFood=null,selectedMeal="desayuno",imageObjectUrl=null;
function save(){try{localStorage.setItem("efg-nutrition-demo-v1",JSON.stringify(state));}catch(e){toast("No se pudo guardar. Revisá el almacenamiento del navegador.");}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
function fmt(n,d){return Number(n||0).toLocaleString("es-AR",{maximumFractionDigits:d==null?0:d});}
function avg(f,q){return (f||0)*q/100;}
function current(){return state.days[TODAY]||{};}
function totals(){
 var t={k:0,p:0,c:0,f:0,fi:0};
 Object.keys(current()).forEach(function(meal){
   if((state.skipped[TODAY]||{})[meal])return;
   (current()[meal]||[]).forEach(function(it){
     var fd=FOODS.find(function(x){return x.id===it.id;});
     if(fd)Object.keys(t).forEach(function(k){t[k]+=avg(fd[k],it.grams);});
   });
 });
 var sport=sportSummary();Object.keys(t).forEach(function(k){t[k]+=sport[k];});
 return t;
}
function habitSuggestion(meal){
 var dates=Object.keys(state.days).sort();
 if(dates.length<7)return null;
 var groups={};
 dates.slice(-35).forEach(function(date){
   if(date===TODAY||(state.skipped[date]||{})[meal])return;
   var items=state.days[date]&&state.days[date][meal];
   if(!items||!items.length)return;
   var key=items.map(function(item){return item.id;}).sort(function(a,b){return a-b;}).join(",");
   if(!groups[key])groups[key]={count:0,items:items,date:date};
   groups[key].count++;
   if(date>groups[key].date){groups[key].date=date;groups[key].items=items;}
 });
 var top=Object.values(groups).sort(function(a,b){return b.count-a.count;})[0];
 return top&&top.count>=2?top.items.map(function(item){return {id:item.id,grams:item.grams};}):null;
}
function mealTotal(meal){return (current()[meal]||[]).reduce(function(s,it){var fd=FOODS.find(function(x){return x.id===it.id;});return s+(fd?avg(fd.k,it.grams):0);},0);}
function put(meal,foods){state.days[TODAY]=state.days[TODAY]||{};state.days[TODAY][meal]=foods;save();render();}
function pageHead(ey,title,sub,action){return '<div class="page-heading"><div><div class="eyebrow">'+ey+'</div><h1>'+title+'</h1><p class="subhead">'+sub+'</p></div>'+(action||"")+'</div>';}
function cardHead(title,right){return '<div class="section-head"><h2>'+title+'</h2>'+(right||"")+'</div>';}
function progress(v,target){return '<div class="meter"><div style="width:'+Math.min(100,Math.max(0,v/Math.max(target,1)*100))+'%"></div></div>';}
function statistic(name,key,unit){
 var t=totals(),v=t[key],goal=state.goals[key];
 var glyph={k:"✦",p:"●",c:"◈",f:"◕",fi:"✳"}[key];
 return '<div class="card metric-card metric-'+key+'"><div class="metric-label">'+glyph+' &nbsp;'+name+'</div><div class="metric-value">'+fmt(v)+' <span>/ '+fmt(goal)+' '+unit+'</span></div>'+progress(v,goal)+'<div class="metric-remaining">'+(goal-v>=0?'Te faltan '+fmt(goal-v,1):'Superaste por '+fmt(v-goal,1))+' '+unit+'</div></div>';
}
function toast(msg){var t=document.getElementById("toast");t.textContent=msg;t.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(function(){t.style.display="none";},3500);}
function listMeal(m){
 var mid=m[0],entries=current()[mid]||[],skip=!!((state.skipped[TODAY]||{})[mid]),fav=state.favorites[mid]||habitSuggestion(mid);
 return '<div class="meal"><div class="meal-icon">'+m[2]+'</div><div class="meal-info"><div class="meal-title">'+m[1]+' <span class="badge">'+(skip?'Omitida':entries.length?fmt(mealTotal(mid))+' kcal':'Pendiente')+'</span></div><div class="meal-detail">'+(skip?'Comida opcional':entries.length?entries.map(function(it){return esc((FOODS[it.id]||{}).n)+" "+it.grams+" g";}).join(" · "):fav?'Tenés una comida habitual guardada':'Elegí alimentos y registrá sus gramos')+'</div></div><div class="meal-actions"><label class="switch"><input type="checkbox" data-skip="'+mid+'" '+(skip?'checked':'')+'> Omitir</label></div></div><div style="display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;margin:-1px 0 11px">'+(!skip?'<button class="btn small ghost" data-add="'+mid+'">+ Alimento</button>':'')+(!skip&&fav&&fav.length?'<button class="btn small light" data-usual="'+mid+'">↺ '+(state.favorites[mid]?"Habitual":"Sugerida")+'</button>':'')+(!skip&&entries.length?'<button class="btn small ghost" data-saveusual="'+mid+'">☆ Guardar habitual</button><button class="btn small ghost" data-editmeal="'+mid+'">Editar</button>':'')+'</div>';
}
function home(){
 var t=totals(),r=state.goals;
 var remaining={p:Math.max(0,r.p-t.p),c:Math.max(0,r.c-t.c),f:Math.max(0,r.f-t.f),fi:Math.max(0,r.fi-t.fi)};
 var active=MEALS.filter(function(m){return !((state.skipped[TODAY]||{})[m[0]]);});
 var done=active.filter(function(m){return (current()[m[0]]||[]).length>0;}).length;
 var complete=active.length?Math.round(done/active.length*100):100;
 return '<section class="welcome-hero"><div class="welcome-copy"><div class="welcome-kicker">✦ Tu bienestar, todos los días</div><div class="welcome-title">¡Hola! Hoy es un buen día<br>para <em>cuidarte.</em></div><p>Elegí tus alimentos, cargá los gramos y nosotros hacemos las cuentas. Así de fácil.</p><div class="welcome-actions"><button class="btn" data-action="openFood">+ Registrar alimento</button><button class="btn ghost" data-nav="catalog">Explorar alimentos</button><button class="btn ghost" data-action="fillEdu">🍳 Cargar rutina Edu</button></div></div><div class="welcome-visual"><span class="welcome-plate">🥗</span><span class="welcome-orbit one">✦ A tu ritmo</span><span class="welcome-orbit two">🌿 Equilibrio</span></div></section>'+
 '<div class="grid stats">'+statistic("CALORÍAS","k","kcal")+statistic("PROTEÍNAS","p","g")+statistic("HIDRATOS","c","g")+statistic("GRASAS","f","g")+statistic("FIBRA","fi","g")+'</div>'+
 '<div class="daily-banner"><span class="daily-icon">🎯</span><div style="flex:1"><strong>Tu registro de hoy: '+done+' de '+active.length+' comidas</strong><small>'+(done===0?"Empezá con tu primera comida cuando quieras.":done===active.length?"¡Completaste las comidas que elegiste registrar!":"Vas avanzando. Cada comida suma a tu progreso.")+'</small></div><span class="pill">'+complete+'%</span></div>'+
 '<div class="two-col"><section class="card">'+cardHead("Tus comidas",'<span class="pill">6 momentos opcionales</span>')+MEALS.map(listMeal).join("")+'<div class="quick-tip"><span>💡</span><div><b>Tu rutina, más simple.</b> Guardá tus comidas habituales. Tras siete días de registros, también te sugerimos las que más repetís para que solo cambies lo necesario.</div></div></section><div class="stack"><section class="card highlight-card"><div class="mini-title">✦ TU BALANCE DEL DÍA</div><h2>Un paso más cerca de tu objetivo.</h2><p>Esto te falta según las metas de prueba configuradas para hoy.</p><div class="balance" style="margin-top:17px">Proteínas: '+fmt(remaining.p)+' g · Hidratos: '+fmt(remaining.c)+' g<br>Grasas: '+fmt(remaining.f)+' g · Fibra: '+fmt(remaining.fi)+' g</div><button class="btn" data-action="recommend">Ver mis macros pendientes →</button></section><section class="card">'+cardHead("Tus comidas favoritas",'<span class="pill grey">'+Object.keys(state.favorites).length+' guardadas</span>')+'<p>¿Desayunás casi siempre lo mismo? Repetí tu comida guardada con un toque y ajustá un ingrediente si hoy comiste algo diferente.</p><div class="prize-banner"><span class="prize-icon">⚡</span><div><b>Menos tiempo registrando</b><p>Más tiempo para disfrutar tu día.</p></div></div></section></div></div>';
}
function progressPage(){
 var last=state.weights.slice().sort(function(a,b){return b.date.localeCompare(a.date);})[0],act=state.activity.filter(function(x){return x.date===TODAY;});
 return pageHead("EVALUACIÓN","Tu evolución","Peso semanal, pasos diarios y tiempo de ejercicio.")+
 '<div class="two-col"><div class="stack"><section class="card">'+cardHead("Registrar peso semanal",'<span class="pill">Seguimiento</span>')+'<div class="field-row"><div class="field"><label>Peso (kg)</label><input id="weight" inputmode="decimal" type="number" min="20" max="400" step="0.1" placeholder="Ej. 78,5"></div><div class="field"><label>Fecha</label><input id="weightDate" type="date" value="'+TODAY+'"></div></div><div class="warning" style="margin-top:15px">⚠ IMPORTANTE: Pesarse siempre a la misma hora y en la misma balanza. Preferentemente por la mañana, después de ir al baño y antes del desayuno.</div><button class="btn" style="margin-top:15px" data-action="saveWeight">Guardar peso</button></section><section class="card">'+cardHead("Historial de peso")+(state.weights.length?'<table class="table"><thead><tr><th>Fecha</th><th>Peso</th></tr></thead><tbody>'+state.weights.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(x){return '<tr><td>'+esc(x.date)+'</td><td><b>'+fmt(x.weight,1)+' kg</b></td></tr>';}).join("")+'</tbody></table>':'<div class="empty">Todavía no registraste ningún peso.</div>')+'</section></div><div class="stack"><section class="card">'+cardHead("Actividad física")+'<div class="field"><label>Pasos de hoy</label><input id="steps" type="number" min="0" placeholder="Ej. 8500"></div><div class="field" style="margin-top:12px"><label>Minutos de ejercicio de hoy</label><input id="minutes" type="number" min="0" placeholder="Ej. 60"></div><div class="field" style="margin-top:12px"><label>Tipo de entrenamiento</label><select id="kind"><option>Fuerza</option><option>Cardio</option><option>Caminata</option><option>Descanso</option><option>Otro</option></select></div><button class="btn block" style="margin-top:16px" data-action="saveActivity">Guardar actividad</button></section><section class="card">'+cardHead("Hoy")+(act.length?'<p>Pasos: <b>'+fmt(act[act.length-1].steps)+'</b></p><p>Ejercicio: <b>'+fmt(act[act.length-1].minutes)+' minutos</b></p>':'<p>Sin registros de actividad.</p>')+'<div class="divider"></div><p class="hint">Un día sin datos no significa cero actividad.</p></section></div></div>';
}
function coachCalculatorDefaults(){
 return {sex:"male",age:41,height:174,weight:80,target:77,activity:1.5,goal:"recomp"};
}
function coachData(){
 return Object.assign({},coachCalculatorDefaults(),state.coachCalculator||{});
}
function calculateCoachEstimate(data){
 var w=Number(data.weight),target=Number(data.target),age=Number(data.age),height=Number(data.height),activity=Number(data.activity),sex=data.sex,goal=data.goal;
 if(!Number.isFinite(w)||w<35||w>300||!Number.isFinite(target)||target<35||target>300||!Number.isFinite(age)||age<18||age>90||!Number.isFinite(height)||height<120||height>220||!Number.isFinite(activity)||activity<1.2||activity>1.75)return {error:"Revisá peso, altura, edad y actividad. Este simulador inicial es solo para adultos."};
 if(goal==="loss"&&target>=w)return {error:"Para pérdida de grasa, elegí un peso objetivo menor al actual o usá recomposición."};
 if(goal==="gain"&&target<=w)return {error:"Para ganancia de peso, elegí un objetivo superior al actual o usá recomposición."};
 var rmr=10*w+6.25*height-5*age+(sex==="male"?5:-161);
 var maintenance=Math.round(rmr*activity);
 var mult={loss:.90,recomp:.97,gain:1.07,maint:1}[goal];
 if(!mult)return {error:"Elegí un objetivo nutricional válido."};
 var kcal=Math.round(maintenance*mult/10)*10;
 if(kcal<1400)return {error:"La estimación energética es baja para este simulador. Requiere evaluación individual por un profesional de nutrición."};
 var protein=Math.round(w*({loss:2,recomp:1.9,gain:1.8,maint:1.6}[goal]));
 var fat=Math.round(w*.8);
 var carbs=Math.round((kcal-4*protein-9*fat)/4);
 if(carbs<0)return {error:"La combinación de calorías, proteínas y grasas no es viable. Requiere ajuste individual."};
 var fiber=Math.round(14*kcal/1000);
 var weeks=goal==="recomp"||goal==="maint"?null:Math.ceil(Math.abs(target-w)/(w*(goal==="loss"?.003:.0025)));
 return {rmr:rmr,maintenance:maintenance,kcal:kcal,p:protein,c:carbs,f:fat,fi:fiber,weeks:weeks,goal:goal};
}
function coachInputs(){
 var fields=[
 ["coachAge","Edad (años)","age",18,90],
 ["coachHeight","Altura (cm)","height",120,220],
 ["coachWeight","Peso actual (kg)","weight",35,300],
 ["coachTarget","Peso objetivo (kg)","target",35,300]
 ];
 var d=coachData();
 return '<div class="field-row">'+fields.map(function(f){return '<div class="field"><label for="'+f[0]+'">'+f[1]+'</label><input id="'+f[0]+'" type="number" min="'+f[3]+'" max="'+f[4]+'" step="0.1" inputmode="decimal" value="'+esc(d[f[2]])+'"></div>';}).join("")+'</div>'+
 '<div class="field-row" style="margin-top:13px"><div class="field"><label for="coachSex">Variable fisiológica de la fórmula</label><select id="coachSex"><option value="male" '+(d.sex==="male"?"selected":"")+'>Hombre (ecuación masculina)</option><option value="female" '+(d.sex==="female"?"selected":"")+'>Mujer (ecuación femenina)</option></select></div>'+
 '<div class="field"><label for="coachActivity">Actividad diaria estimada</label><select id="coachActivity">'+[[1.2,"Baja"],[1.35,"Ligera"],[1.5,"Moderada"],[1.7,"Alta"]].map(function(o){return '<option value="'+o[0]+'" '+(Math.abs(d.activity-o[0])<.01?"selected":"")+'>'+o[1]+' · factor '+o[0]+'</option>';}).join("")+'</select></div></div>'+
 '<div class="field" style="margin-top:13px"><label for="coachGoal">Objetivo del programa</label><select id="coachGoal">'+[["loss","Pérdida de grasa"],["recomp","Recomposición corporal"],["gain","Ganancia muscular"],["maint","Mantenimiento"]].map(function(o){return '<option value="'+o[0]+'" '+(d.goal===o[0]?"selected":"")+'>'+o[1]+'</option>';}).join("")+'</select></div>';
}
function coachResultCard(){
 var r=state.coachEstimate;
 if(!r)return '<div class="calculator-welcome"><span>📐</span><h3>Tu cálculo científico aparece acá</h3><p>Ingresá los datos, elegí el objetivo y tocá «Calcular propuesta».</p></div>';
 if(r.error)return '<div class="warning">'+esc(r.error)+'</div>';
 return '<div class="coach-result"><div class="result-caption">PROPUESTA SIN APROBAR</div><div class="result-kcal">'+fmt(r.kcal)+' <small>kcal/día</small></div><p>Estimación de mantenimiento: '+fmt(r.maintenance)+' kcal/día · Metabolismo en reposo: '+fmt(r.rmr)+' kcal/día.</p><div class="result-list">'+[
 ["Proteínas",r.p,"g","#12a88b"],
 ["Hidratos",r.c,"g","#6288da"],
 ["Grasas",r.f,"g","#e9a14f"],
 ["Fibra",r.fi,"g","#9b83d4"]
 ].map(function(row){return '<div><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+row[3]+';margin-right:6px"></span>'+row[0]+'<b>'+fmt(row[1])+' '+row[2]+'</b></div>';}).join("")+'</div>'+
 (r.weeks?'<div class="note" style="margin-top:13px">Cambio gradual de referencia: alrededor de '+fmt(r.weeks)+' semanas, bajo supuestos ideales. <b>No es una predicción de la evolución real.</b></div>':'<div class="note" style="margin-top:13px">La recomposición se evalúa mejor mediante peso, cintura, composición corporal y rendimiento, sin imponer una fecha final.</div>')+
 '<button class="btn block" data-action="applyCoachEstimate" style="margin-top:14px">✓ Aprobar objetivos en esta demo</button><div class="subtle">En la versión con cuentas reales, solo el profesional autorizado podrá aprobarlos.</div></div>';
}
function coachPage(){
 var g=state.goals,amount=state.weights.length;
 return pageHead("EFG NUTRITION PRO","Panel del entrenador","Calculá objetivos iniciales, revisá resultados y seguí la evolución. Esta es una demostración sin alumnos conectados.")+
 '<div class="coach-topbar"><span class="coach-identity">👤 Alumno de demostración</span><span class="pill amber">Sin datos externos</span><span class="coach-identity">🛡️ Rol profesional de prueba</span></div>'+
 '<div class="grid kpi-grid" style="margin-bottom:18px"><div class="card"><div class="metric-label">PLAN NUTRICIONAL ACTUAL</div><div class="metric-value">'+fmt(g.k)+' <span>kcal</span></div><p class="subtle">Valor editable de demostración</p></div><div class="card"><div class="metric-label">REGISTROS DE PESO</div><div class="metric-value">'+amount+'</div><p class="subtle">En este navegador solamente</p></div><div class="card"><div class="metric-label">COACHES Y ALUMNOS REALES</div><div class="metric-value">0</div><p class="subtle">Falta autenticación y base de datos</p></div></div>'+
 '<div class="two-col coach-layout"><section class="card">'+cardHead("Calculadora de nutrición deportiva",'<span class="pill">Mifflin–St Jeor</span>')+
 '<p style="margin-bottom:19px">La fórmula estima necesidades energéticas. La aplicación propone macros según el objetivo, sin reemplazar la valoración profesional.</p>'+
 coachInputs()+
 '<div class="coach-tools"><button class="btn" data-action="calculateCoach">✦ Calcular propuesta</button><span class="hint">Sin modificar el plan del alumno</span></div>'+
 '<div class="note" style="margin-top:15px">El ajuste inicial utiliza un déficit moderado para pérdida de grasa, una aproximación al mantenimiento para recomposición o un superávit pequeño para ganancia muscular. Son parámetros revisables.</div>'+
 '</section><div class="stack"><section class="card">'+cardHead("Resultado estimado",'<span class="pill grey">Para revisión</span>')+coachResultCard()+'</section>'+
 '<section class="card">'+cardHead("Seguimiento inteligente")+
 '<div class="list-row"><div><b>1 · Peso semanal</b><small>Siempre misma hora y misma balanza</small></div><span class="badge">7 días</span></div>'+
 '<div class="list-row"><div><b>2 · Adherencia y fuerza</b><small>Calorías registradas, pasos, entrenamiento y tendencia</small></div><span class="badge">Semanal</span></div>'+
 '<div class="list-row"><div><b>3 · Revisión de calorías</b><small>Proponer ajustes discretos, no saltos diarios</small></div><span class="badge">2–3 semanas</span></div>'+
 '<p class="subtle" style="margin-top:14px">Ejemplo de ajuste futuro: ±100–150 kcal/día con datos suficientes y aprobación profesional; no ocurre automáticamente en esta demo.</p></section></div></div>'+
 '<section class="card" style="margin-top:18px">'+cardHead("Plan aprobado en la demo",'<span class="pill">Editable por el profesional</span>')+'<p style="margin-bottom:16px">Estos valores de prueba gobiernan el tablero de macros del alumno. En producción se asociarán a cada usuario con historial de cambios.</p><div class="coach-target-grid">'+[
 ["gk","Calorías (kcal)",g.k],["gp","Proteínas (g)",g.p],["gc","Hidratos (g)",g.c],["gf","Grasas (g)",g.f],["gfi","Fibra (g)",g.fi]
 ].map(function(x){return '<div class="field"><label for="'+x[0]+'">'+x[1]+'</label><input type="number" min="0" id="'+x[0]+'" value="'+x[2]+'"></div>';}).join("")+'</div>'+
 '<button class="btn" style="margin-top:16px" data-action="saveGoals">Guardar objetivos de prueba</button></section>'+
 '<div class="coach-science"><b>Base científica del simulador</b><p>Gasto en reposo: Mifflin–St Jeor (1990). Distribución proteica orientativa: ISSN (2026) y revisiones sobre entrenamiento de fuerza. El gasto total es una estimación; la evolución real y la situación clínica deben gobernar el seguimiento. Si la ecuación por sexo no representa adecuadamente a una persona, se requiere evaluación individual.</p><div style="margin-top:9px"><a href="https://pubmed.ncbi.nlm.nih.gov/42867412/" target="_blank" rel="noopener noreferrer">Posición ISSN, 2026</a> · <a href="https://www.sciencedirect.com/science/article/pii/S0002916523166986" target="_blank" rel="noopener noreferrer">Mifflin–St Jeor</a></div></div>';
}
function readCoachForm(){
 return {age:Number(document.getElementById("coachAge").value),height:Number(document.getElementById("coachHeight").value),
 weight:Number(document.getElementById("coachWeight").value),target:Number(document.getElementById("coachTarget").value),
 sex:document.getElementById("coachSex").value,activity:Number(document.getElementById("coachActivity").value),goal:document.getElementById("coachGoal").value};
}
function paymentsPage(){
 var list=state.receipts.slice().reverse();
 return pageHead("SUSCRIPCIONES","Pagos y comprobantes","Transferencia bancaria y fotografía del comprobante · prueba local sin envío real.")+
 '<div class="two-col"><section class="card">'+cardHead("Adjuntar comprobante",'<span class="pill amber">Prueba funcional</span>')+'<div class="field"><label>¿Quién está pagando?</label><select id="paymentType"><option value="student">Alumno → su coach</option><option value="coach">Coach → EFG Nutrition</option></select></div><div class="note" id="aliasBox" style="margin:15px 0"><b>Alias del destinatario</b><br><span id="aliasText">Se configura desde este panel</span><div style="margin-top:8px" class="hint">El alias se muestra para transferir. La foto del comprobante no confirma el pago automáticamente.</div></div><div class="field"><label>Importe transferido (ARS)</label><input type="number" min="0" id="paymentAmount" placeholder="Ingresar importe"></div><div class="field" style="margin-top:12px"><label>Foto del comprobante (JPG o PNG)</label><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" id="receiptFile"></div><img id="receiptImage" class="receipt-preview" style="display:none;margin-top:13px" alt="Vista previa del comprobante"/><div class="warning" style="margin-top:15px">DEMO: la imagen se muestra solo como vista previa. Todavía no se envía al coach ni a EFG. No cargues comprobantes reales ni datos bancarios personales.</div><button class="btn block" style="margin-top:15px" data-action="receiptDemo">Registrar solicitud de pago (demo)</button></section><div class="stack"><section class="card">'+cardHead("Alias para cobros")+'<p style="margin-bottom:14px">En producción, el alias de cada coach estará vinculado a su cuenta; el alias EFG se mostrará a los coaches.</p><div class="field"><label>Alias del coach de prueba</label><input id="coachAlias" maxlength="80" placeholder="ALIAS.COACH" value="'+esc(state.settings.coachAlias)+'"></div><div class="field" style="margin-top:11px"><label>Alias EFG (simulación)</label><input id="efgAlias" maxlength="80" placeholder="ALIAS.EFG" value="'+esc(state.settings.efgAlias)+'"></div><button class="btn ghost" style="margin-top:13px" data-action="saveAliases">Guardar alias de prueba</button></section><section class="card">'+cardHead("Comprobantes de prueba")+ (list.length?list.map(function(x){return '<div class="list-row"><div><b>'+esc(x.from)+'</b><small>'+esc(x.date)+' · $'+fmt(x.amount)+'</small></div><span class="pill amber">'+esc(x.status)+'</span></div>';}).join(""):'<div class="empty">Todavía no hay solicitudes.</div>')+'</section></div></div>';
}
function catalogPage(){
 return pageHead("BASE DE ALIMENTOS","Catálogo nutricional","Buscar por nombre, marca o grupo. Datos genéricos orientativos por cada 100 g.")+
 '<div class="card"><div class="field"><label>Buscar alimentos</label><input id="catalogQuery" placeholder="Ej. queso untable, pollo, avena..." value="'+esc(foodQuery)+'"></div><div class="tags" id="catTags" style="margin:16px 0"></div><div id="catResults"></div><div class="note" style="margin-top:16px">La versión definitiva diferenciará fichas verificadas por etiqueta, valores promedio y datos desconocidos. No se asumirá que un micronutriente faltante equivale a cero.</div></div>';
}
function updateCatalog(){
 var tags=document.getElementById("catTags"),result=document.getElementById("catResults");if(!tags||!result)return;
 tags.innerHTML=[["todos","Todos"],["proteinas","Proteínas"],["hidratos","Hidratos"],["grasas","Grasas"],["lacteos","Lácteos"],["vegetales","Frutas y verduras"],["suplementos","Suplementos"]].map(function(x){return '<button class="tag '+(foodGroup===x[0]?"active":"")+'" data-group="'+x[0]+'">'+x[1]+'</button>';}).join("");
 var matches=FOODS.filter(function(x){return (foodGroup==="todos"||x.group===foodGroup)&&(x.n+" "+x.b).toLowerCase().includes(foodQuery.toLowerCase());});
 result.innerHTML='<p class="hint" style="margin-bottom:10px">'+matches.length+' alimentos encontrados</p><div style="overflow:auto"><table class="table"><thead><tr><th>Producto</th><th>Kcal</th><th>Proteínas</th><th>Hidratos</th><th>Grasas</th><th>Fibra</th><th></th></tr></thead><tbody>'+matches.map(function(f){return '<tr><td><b>'+esc(f.n)+'</b><br><small class="muted">'+esc(f.b)+'</small></td><td>'+fmt(f.k)+'</td><td>'+fmt(f.p,1)+'</td><td>'+fmt(f.c,1)+'</td><td>'+fmt(f.f,1)+'</td><td>'+fmt(f.fi,1)+'</td><td><button class="btn small light" data-quickfood="'+f.id+'">Agregar</button></td></tr>';}).join("")+'</tbody></table></div>';
}
function render(){
 document.getElementById("crumbCurrent").textContent={home:"Mi día",progress:"Progreso",coach:"Profesionales",payments:"Pagos",catalog:"Alimentos",sport:"Suplementos"}[tab];
 document.getElementById("navigation").innerHTML=[["home","◫","Mi día"],["catalog","⌕","Alimentos"],["sport","✚","Deporte"],["progress","↗","Mi progreso"],["coach","♧","Profesionales"],["payments","▤","Pagos y alias"]].map(function(x){return '<button class="navitem '+(tab===x[0]?"active":"")+'" data-nav="'+x[0]+'"><span class="nav-icon">'+x[1]+'</span>'+x[2]+'</button>';}).join("");
 document.getElementById("main").innerHTML=({home:home,progress:progressPage,coach:coachPage,payments:paymentsPage,catalog:catalogPage,sport:sportPage}[tab])();
 if(tab==="catalog")updateCatalog();if(tab==="payments")updateAlias();if(tab==="sport")updateSportProduct();
}
function modal(html){document.getElementById("modalRoot").innerHTML='<div class="modal-screen" data-overlay="1"><div class="modal" role="dialog" aria-modal="true">'+html+'</div></div>';}
function closeModal(){document.getElementById("modalRoot").innerHTML="";}
function foodModal(meal){
 selectedMeal=meal||"desayuno";selectedFood=null;foodGroup="todos";foodQuery="";
 modal('<div class="modal-head"><h2>Agregar alimento</h2><button class="icon-btn" data-action="closeModal" aria-label="Cerrar">✕</button></div><div class="field-row"><div class="field"><label>Comida</label><select id="chooseMeal">'+MEALS.map(function(m){return '<option value="'+m[0]+'" '+(selectedMeal===m[0]?'selected':'')+'>'+m[1]+'</option>';}).join("")+'</select></div><div class="field"><label>Buscar alimento o marca</label><input id="foodQuery" placeholder="Ej. queso untable"></div></div><div class="tags" id="foodTags" style="margin-top:15px"></div><div class="food-results" id="foodResults"></div><div id="foodSelected" style="margin-top:12px"></div><div class="modal-footer"><span class="hint">Valores orientativos · g por alimento</span><button class="btn" id="saveFood" disabled data-action="addSelected">Agregar a la comida</button></div>');
 renderFoodResults();
}
function renderFoodResults(){
 var tags=document.getElementById("foodTags"),result=document.getElementById("foodResults");if(!tags||!result)return;
 tags.innerHTML=[["todos","Todos"],["proteinas","Proteínas"],["hidratos","Hidratos"],["grasas","Grasas"],["lacteos","Lácteos"],["vegetales","Vegetales"],["suplementos","Suplementos"]].map(function(g){return '<button class="tag '+(foodGroup===g[0]?"active":"")+'" data-foodgroup="'+g[0]+'">'+g[1]+'</button>';}).join("");
 var found=FOODS.filter(function(f){return (foodGroup==="todos"||f.group===foodGroup)&&(f.n+" "+f.b).toLowerCase().includes(foodQuery.toLowerCase());});
 result.innerHTML=found.length?found.map(function(f){return '<button class="food-option '+(selectedFood===f.id?"active":"")+'" data-food="'+f.id+'"><span><strong>'+esc(f.n)+'</strong><small>'+esc(f.b)+'</small></span><span>'+fmt(f.k)+' kcal / 100 g</span></button>';}).join(""):'<div class="empty">No encontrado. Probá otra búsqueda o un equivalente genérico.</div>';
 var sel=document.getElementById("foodSelected");
 if(selectedFood!==null){var f=FOODS[selectedFood];sel.innerHTML='<div class="field-row"><div class="field"><label>'+esc(f.n)+' · Cantidad (g)</label><input id="foodGrams" type="number" min="1" max="5000" value="100" inputmode="decimal"></div><div class="note"><b>Por 100 g:</b><br>'+fmt(f.p,1)+' g proteína · '+fmt(f.c,1)+' g hidratos · '+fmt(f.f,1)+' g grasa · '+fmt(f.fi,1)+' g fibra</div></div>';document.getElementById("saveFood").disabled=false;}else{sel.innerHTML="";document.getElementById("saveFood").disabled=true;}
}
function editMeal(meal){
 var data=current()[meal]||[],name=MEALS.find(function(x){return x[0]===meal;})[1];
 modal('<div class="modal-head"><h2>Modificar '+name.toLowerCase()+'</h2><button class="icon-btn" data-action="closeModal">✕</button></div>'+(data.length?data.map(function(it,idx){var f=FOODS[it.id];return '<div class="list-row"><div><b>'+esc(f.n)+'</b><small>'+it.grams+' g · '+fmt(avg(f.k,it.grams))+' kcal</small></div><button class="btn small ghost" data-remove="'+meal+':'+idx+'">Eliminar</button></div>';}).join(""):'<div class="empty">Sin alimentos registrados.</div>')+'<div class="modal-footer"><button class="btn ghost" data-action="closeModal">Cerrar</button><button class="btn" data-add="'+meal+'">+ Agregar alimento</button></div>');
}
function recommend(){
 var t=totals(),r=state.goals;
 modal('<div class="modal-head"><h2>¿Qué puedo comer ahora?</h2><button class="icon-btn" data-action="closeModal">✕</button></div><p>Estos son los nutrientes pendientes según el objetivo aprobado. La combinación automática de cantidades llegará en la siguiente etapa; por ahora podés registrar alimentos reales por gramos.</p><div class="grid kpi-grid" style="margin:20px 0">'+[["Proteína",r.p-t.p],["Hidratos",r.c-t.c],["Grasas",r.f-t.f]].map(function(v){return '<div class="card"><div class="metric-label">'+v[0]+'</div><div class="metric-value">'+fmt(Math.max(0,v[1]))+' <span>g</span></div></div>';}).join("")+'</div><button class="btn block" data-action="openFood">Elegir alimentos disponibles</button>');
}
function updateAlias(){var box=document.getElementById("aliasText"),type=document.getElementById("paymentType");if(box&&type){var alias=type.value==="coach"?state.settings.efgAlias:state.settings.coachAlias;box.textContent=alias||"Alias no configurado";}}
function nav(page){tab=page;closeModal();document.querySelector(".sidebar").classList.remove("open");render();window.scrollTo({top:0,behavior:"smooth"});}
document.addEventListener("click",function(e){
 var b=e.target.closest("[data-nav],[data-action],[data-add],[data-saveusual],[data-usual],[data-editmeal],[data-remove],[data-food],[data-foodgroup],[data-group],[data-quickfood],[data-remove-sport]");if(!b)return;
 if(b.dataset.nav){nav(b.dataset.nav);return;}
 if(b.dataset.removeSport!==undefined){var idx=Number(b.dataset.removeSport);if(Number.isInteger(idx)&&idx>=0){state.sports[TODAY]=(state.sports[TODAY]||[]).filter(function(x,i){return i!==idx;});save();render();toast("Registro eliminado.");}return;}
 if(b.dataset.add){foodModal(b.dataset.add);return;}
 if(b.dataset.saveusual){var mid=b.dataset.saveusual;state.favorites[mid]=(current()[mid]||[]).map(function(x){return Object.assign({},x);});save();toast("Comida habitual guardada. Podrás editarla cuando quieras.");render();return;}
 if(b.dataset.usual){var me=b.dataset.usual;put(me,(state.favorites[me]||habitSuggestion(me)||[]).map(function(x){return Object.assign({},x);}));toast("Comida habitual cargada. Podés cambiar cualquier ingrediente.");return;}
 if(b.dataset.editmeal){editMeal(b.dataset.editmeal);return;}
 if(b.dataset.remove){var p=b.dataset.remove.split(":"),arr=(current()[p[0]]||[]).slice();arr.splice(+p[1],1);put(p[0],arr);editMeal(p[0]);return;}
 if(b.dataset.foodgroup){foodGroup=b.dataset.foodgroup;renderFoodResults();return;}
 if(b.dataset.group){foodGroup=b.dataset.group;updateCatalog();return;}
 if(b.dataset.food!==undefined){selectedFood=Number(b.dataset.food);renderFoodResults();return;}
 if(b.dataset.quickfood){foodModal("desayuno");selectedFood=Number(b.dataset.quickfood);renderFoodResults();return;}
 var action=b.dataset.action;if(!action)return;
 if(action==="fillEdu"){installEduDemoRoutine();return;}
 if(action==="addSport"){var prod=SPORT_PRODUCTS.find(function(x){return x.id===document.getElementById("sportProduct").value;});var amount=Number(document.getElementById("sportAmount").value),time=document.getElementById("sportTime").value;if(!prod||!Number.isFinite(amount)||amount<=0||amount>2000){toast("Revisá la cantidad.");return;}state.sports[TODAY]=state.sports[TODAY]||[];state.sports[TODAY].push({id:prod.id,amount:amount,time:time});save();render();toast("Registrado y sumado al balance del día.");return;}
 if(action==="closeModal"){closeModal();return;}
 if(action==="openFood"){foodModal();return;}
 if(action==="recommend"){recommend();return;}
 if(action==="addSelected"){
   var grams=Number(document.getElementById("foodGrams")?.value),sel=document.getElementById("chooseMeal")?.value||selectedMeal;
   if(selectedFood===null||!Number.isFinite(grams)||grams<=0||grams>5000){toast("Ingresá un peso válido en gramos.");return;}
   var a=(current()[sel]||[]).slice();a.push({id:selectedFood,grams:grams});put(sel,a);closeModal();toast("Alimento registrado y macros recalculados.");return;
 }
 if(action==="saveWeight"){var w=Number(document.getElementById("weight").value),d=document.getElementById("weightDate").value;if(!(w>=20&&w<=400&&d)){toast("Ingresá una fecha y peso válidos.");return;}state.weights=state.weights.filter(function(x){return x.date!==d;});state.weights.push({date:d,weight:w});save();render();toast("Peso semanal registrado.");return;}
 if(action==="saveActivity"){var st=Number(document.getElementById("steps").value),mi=Number(document.getElementById("minutes").value),kind=document.getElementById("kind").value;if(!Number.isFinite(st)||!Number.isFinite(mi)||st<0||mi<0||st>100000||mi>1440){toast("Revisá los valores de actividad.");return;}state.activity=state.activity.filter(function(x){return x.date!==TODAY;});state.activity.push({date:TODAY,steps:st,minutes:mi,kind:kind});save();render();toast("Actividad registrada.");return;}
 if(action==="calculateCoach"){state.coachCalculator=readCoachForm();state.coachEstimate=calculateCoachEstimate(state.coachCalculator);save();render();toast(state.coachEstimate.error?"Revisá los datos ingresados.":"Propuesta calculada. Falta aprobarla.");return;}
 if(action==="applyCoachEstimate"){var estimate=state.coachEstimate;if(!estimate||estimate.error){toast("Primero calculá una propuesta válida.");return;}state.goals={k:estimate.kcal,p:estimate.p,c:estimate.c,f:estimate.f,fi:estimate.fi};save();render();toast("Objetivos aprobados en esta demo. Se reflejan en Mi día.");return;}
 if(action==="saveGoals"){var obj={k:+document.getElementById("gk").value,p:+document.getElementById("gp").value,c:+document.getElementById("gc").value,f:+document.getElementById("gf").value,fi:+document.getElementById("gfi").value};if(Object.values(obj).some(function(v){return !Number.isFinite(v)||v<0||v>15000;})){toast("Corregí los objetivos numéricos.");return;}state.goals=obj;save();render();toast("Metas de demostración actualizadas.");return;}
 if(action==="saveAliases"){state.settings.coachAlias=document.getElementById("coachAlias").value.trim();state.settings.efgAlias=document.getElementById("efgAlias").value.trim();save();render();toast("Alias guardados solo en este dispositivo.");return;}
 if(action==="receiptDemo"){var amount=+document.getElementById("paymentAmount").value,type=document.getElementById("paymentType").value;var file=document.getElementById("receiptFile").files[0];if(!(amount>0)||!file){toast("Ingresá importe y seleccioná foto de ejemplo.");return;}state.receipts.push({from:type==="coach"?"Coach → EFG":"Alumno → Coach",amount:amount,date:new Date().toLocaleString("es-AR"),status:"Pendiente (demo)",photoName:file.name});save();render();toast("Solicitud de prueba registrada solo en este dispositivo.");return;}
});
document.addEventListener("change",function(e){
 var el=e.target;
 if(el.dataset.skip){state.skipped[TODAY]=state.skipped[TODAY]||{};state.skipped[TODAY][el.dataset.skip]=el.checked;save();render();}
 if(el.id==="paymentType")updateAlias();
 if(el.id==="sportProduct")updateSportProduct();
 if(el.id==="receiptFile"){var file=el.files&&el.files[0],img=document.getElementById("receiptImage");if(!img)return;if(imageObjectUrl)URL.revokeObjectURL(imageObjectUrl);if(file&&file.type.startsWith("image/")&&file.size<=6000000){imageObjectUrl=URL.createObjectURL(file);img.src=imageObjectUrl;img.style.display="block";}else{img.style.display="none";if(file)toast("Elegí una imagen JPG/PNG/WebP menor a 6 MB.");}}
});
document.addEventListener("input",function(e){
 if(e.target.id==="foodQuery"){foodQuery=e.target.value;renderFoodResults();}
 if(e.target.id==="catalogQuery"){foodQuery=e.target.value;updateCatalog();}
});
document.addEventListener("click",function(e){if(e.target.classList.contains("modal-screen"))closeModal();});
document.getElementById("menuButton").addEventListener("click",function(){document.querySelector(".sidebar").classList.toggle("open");});
render();
})();