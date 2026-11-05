// P26M — eight owner-reference educational pages plus ninth watercolor serotonin closing page. OFF until authorized.
// OFF until a user-scoped, audited server receipt and physical QA are ready.
import {renderNutritionScienceView} from "./nutrition-science.js?v=ncc-pilot-3a40474052be-guide-return-r6";
import {renderScienceWellbeingPanel} from "./science-wellbeing.js?v=ncc-pilot-3a40474052be-guide-return-r6";
export const SCIENCE_WELCOME_ENABLED=true;
export const SCIENCE_WELCOME_VERSION="con_ciencia_2026_r1";
// The owner montage, rather than the separate science-library HTML, defines
// the exact order of the first eight introductory images.
export const SCIENCE_STEPS=Object.freeze([
 "Portada: Nutrición Con-Ciencia","¿Qué son las calorías?","Los macronutrientes",
 "La proteína y el entrenamiento","¿Qué pasa si consumo más?",
 "El mito de los hidratos de carbono","Cómo se combinan en tu día","Conclusiones",
 "Serotonina · cierre"
]);
const section=(html,cls,tag="section")=>{
 const match=html.match(new RegExp('<'+tag+'\\b[^>]*class="'+cls+'(?:\\s[^"]*)?"[^>]*>[\\s\\S]*?<\\/'+tag+'>'));
 if(!match)throw Error("Falta bloque científico: "+cls);
 return match[0];
};
const meals=[
 '<section class="ns-meals" aria-labelledby="ns-platos">',
 '<span class="ns-eyebrow">06 · LLEVEMOS LA CIENCIA AL PLATO</span>',
 '<h2 id="ns-platos">Cómo combinar tus alimentos en el día</h2>',
 '<p>Ejemplos ilustrativos: las porciones dependen de tu objetivo y del plan revisado por tu coach.</p>',
 '<div class="ns-meal-grid">',
 '<article class="ns-meal"><span class="ns-meal-art" aria-hidden="true">🥣🍓</span><h3>Desayuno</h3><p><b>Proteína:</b> yogur o huevos.<br><b>Hidratos:</b> avena y fruta.<br><b>Grasas:</b> frutos secos.</p></article>',
 '<article class="ns-meal"><span class="ns-meal-art" aria-hidden="true">🍗🥦</span><h3>Almuerzo</h3><p><b>Proteína:</b> pollo o tofu.<br><b>Hidratos:</b> arroz.<br><b>Grasas:</b> aceite de oliva.</p></article>',
 '<article class="ns-meal"><span class="ns-meal-art" aria-hidden="true">🥑🍞</span><h3>Merienda</h3><p><b>Proteína:</b> huevo o alternativa vegetal.<br><b>Hidratos:</b> pan integral y fruta.<br><b>Grasas:</b> palta.</p></article>',
 '<article class="ns-meal"><span class="ns-meal-art" aria-hidden="true">🐟🥔</span><h3>Cena</h3><p><b>Proteína:</b> pescado o legumbres.<br><b>Hidratos:</b> papa.<br><b>Grasas:</b> aceite de oliva.</p></article>',
 '</div><p class="ns-meal-caution">Si tenés alergias, celiaquía u otra condición, las elecciones deben adaptarse individualmente.</p></section>'
].join("");
const conclusions=[
 '<section class="ns-conclusions" aria-labelledby="ns-final">',
 '<span class="ns-eyebrow">07 · LO MÁS IMPORTANTE</span><h2 id="ns-final">Conclusiones para recordar</h2>',
 '<div class="ns-conclusion-list">',
 '<article><span aria-hidden="true">⚡</span><div><strong>Las calorías son energía.</strong><p>El balance influye en el peso; la calidad nutricional también importa.</p></div></article>',
 '<article><span aria-hidden="true">💪</span><div><strong>La proteína acompaña al entrenamiento.</strong><p>Junto con fuerza, recuperación y alimentación suficiente ayuda a mantener y desarrollar músculo.</p></div></article>',
 '<article><span aria-hidden="true">🌾</span><div><strong>Los hidratos no son enemigos.</strong><p>Son una fuente de energía; elegí calidad, fibra y cantidades adecuadas.</p></div></article>',
 '<article><span aria-hidden="true">🥑</span><div><strong>Las grasas son esenciales.</strong><p>Priorizá fuentes insaturadas, sin eliminarlas por miedo a sus calorías.</p></div></article>',
 '<article><span aria-hidden="true">🧠</span><div><strong>La combinación y la constancia importan.</strong><p>Aprender a elegir vale más que prohibir alimentos.</p></div></article>',
 '</div><p class="ns-final-motto">Conocimiento hoy. Mejores decisiones mañana.</p></section>'
].join("");
export function sciencePanels(){
 const page=renderNutritionScienceView();
 const macro=page.match(/<section aria-labelledby="ns-tres">[\s\S]*?<\/section>/)?.[0];
 if(!macro)throw Error("Falta la sección aprobada de macronutrientes");
 return [
  section(page,"ns-hero","header"),section(page,"ns-intro"),macro,
  section(page,"ns-protein-focus"),section(page,"ns-balance"),
  section(page,"ns-myth"),meals,conclusions,renderScienceWellbeingPanel()
 ];
}
export function renderScienceVerticalView(){
 const page=renderNutritionScienceView();
 return '<div class="ns-science ns-science-library" aria-label="Nutrición Con-Ciencia · página vertical">'+
 sciencePanels().map((p,i)=>'<div class="ns-library-panel" data-science-step="'+(i+1)+'">'+p+'</div>').join("")+
 section(page,"ns-faq")+section(page,"ns-sources")+'</div>';
}
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ownerReferenceTitles=SCIENCE_STEPS.slice(0,8);
const ownerReferenceDescriptions=Object.freeze([
 "Portada: Nutrición Con-Ciencia. Entendé tu cuerpo, entrená mejor, comé con sentido y viví con más energía.",
 "Las calorías aportan energía para pensar, respirar, entrenar y recuperarte. Importan el balance y la calidad.",
 "Proteínas, hidratos y grasas cumplen funciones diferentes y necesarias en la alimentación.",
 "La proteína ayuda a desarrollar y mantener masa muscular junto con el entrenamiento y la recuperación.",
 "Comer proteínas, grasas o hidratos en exceso tiene consecuencias distintas. No se trata de prohibir grupos.",
 "Los hidratos no son enemigos: importan su calidad, las cantidades y las necesidades personales.",
 "Ejemplos de desayuno, almuerzo, merienda y cena combinan proteínas, hidratos, grasas y vegetales.",
 "Conclusiones: las calorías son energía, los tres macronutrientes importan y el balance es personal."
]);

export function renderScienceWelcomeStep(index,{busy=false,error=""}={}){
 // Crucially, the eight owner images never render the alternative HTML science
 // cards, even temporarily when CSS is stale or unavailable in an installed PWA.
 const total=SCIENCE_STEPS.length;
 if(!Number.isInteger(index)||index<0||index>=total)throw RangeError("Paso inválido");
 const step=index+1,last=step===total;
 const locked=busy?' disabled aria-busy="true"':'';
 const dots=SCIENCE_STEPS.map((_,i)=>'<i class="'+(i===index?'is-current':'')+'"></i>').join("");
 // The eight exact illustrations are CSS crops of ONE pinned 4x2 JPEG;
 // there are no substitute pictures. The ninth uses the serotonin panel.
 const slide=index<8?
  '<figure class="ns-owner-reference" aria-label="'+esc(ownerReferenceTitles[index])+'">'+
   '<span class="ns-owner-reference-art ns-owner-reference-art-'+step+'" aria-hidden="true"></span>'+
   '<figcaption class="ns-owner-reference-transcript">'+esc(ownerReferenceDescriptions[index])+'</figcaption></figure>'
  :renderScienceWellbeingPanel();
 return '<div class="ns-welcome-shell" role="main" aria-label="Presentación de Nutrición Con-Ciencia">'+
 '<header class="ns-welcome-header"><img src="./assets/serotonina-acuarela.avif" alt="" width="47" height="34">'+
 '<strong>Nutrición Con-Ciencia</strong><span aria-live="polite">'+step+' de '+total+'</span></header>'+
 '<div class="ns-welcome-progress" aria-hidden="true">'+dots+'</div>'+
 '<div class="ns-science ns-welcome-slide" data-science-step="'+step+'">'+slide+'</div>'+
 (error?'<p class="ns-welcome-error" role="alert">'+esc(error)+'</p>':'')+
 '<nav class="ns-welcome-actions" aria-label="Avanzar por los conceptos">'+
 (index?'<button type="button" data-act="sciencePrev" class="ns-back"'+locked+'>Anterior</button>':'<span></span>')+
 '<button type="button" data-act="'+(last?'scienceFinish':'scienceNext')+'" class="ns-next"'+locked+'>'+
 (busy?'Guardando…':last?'Comenzar':'Siguiente')+'</button></nav></div>';
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identity=({profile,userId})=>{
 if(!UUID.test(userId||"")||profile?.user_id!==userId||
    profile?.active!==true||!["student","coach"].includes(profile.role))
  throw Error("No pudimos validar tu cuenta para la presentación educativa.");
};
// Identity must be checked around asynchronous read/write operations: a stale
// PWA request for account A must not update the welcome screen for account B.
async function verifyScienceSession(sb,userId){
 if(typeof sb?.auth?.getUser!=="function")
  throw Error("No pudimos verificar tu sesión para la presentación educativa.");
 let response;
 try{response=await sb.auth.getUser();}
 catch{throw Error("No pudimos verificar tu sesión para la presentación educativa.");}
 if(response?.error||response?.data?.user?.id!==userId)
  throw Error("La sesión cambió durante la bienvenida educativa. Volvé a ingresar.");
}
export async function readScienceWelcomeStatus(sb,{profile,userId}={}){
 identity({profile,userId});
 await verifyScienceSession(sb,userId);
 if(typeof sb?.from!=="function")throw Error("Servicio de bienvenida no disponible.");
 const r=await sb.from("efg_science_intro_receipts").select("user_id,version,seen_at")
  .eq("user_id",userId).eq("version",SCIENCE_WELCOME_VERSION).maybeSingle();
 await verifyScienceSession(sb,userId);
 if(r.error)throw Error("No pudimos comprobar la bienvenida; podés continuar usando tu cuenta.");
 if(r.data&&(r.data.user_id!==userId||r.data.version!==SCIENCE_WELCOME_VERSION||
   typeof r.data.seen_at!=="string"||!Number.isFinite(Date.parse(r.data.seen_at))))
  throw Error("El comprobante de bienvenida no corresponde a tu cuenta.");
 return {pending:!r.data,version:SCIENCE_WELCOME_VERSION};
}
export async function acknowledgeScienceWelcome(sb,{profile,userId,action,explicitClick=false}={}){
 identity({profile,userId});
 if(!["completed","skipped"].includes(action)||explicitClick!==true||typeof sb?.rpc!=="function")
  throw Error("La bienvenida requiere una acción explícita.");
 await verifyScienceSession(sb,userId);
 const r=await sb.rpc("efg_ack_science_intro",{p_version:SCIENCE_WELCOME_VERSION,p_action:action});
 await verifyScienceSession(sb,userId);
 if(r.error||r.data!==true)throw Error("El servidor no confirmó el registro de la bienvenida.");
 const status=await readScienceWelcomeStatus(sb,{profile,userId});
 if(status.pending)throw Error("El servidor no confirmó todavía tu bienvenida.");
 return status;
}
