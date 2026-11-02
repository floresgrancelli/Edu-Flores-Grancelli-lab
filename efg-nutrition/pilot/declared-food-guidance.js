// Overlay only: never edits the shared food catalog or records a diagnosis.
// Pass the CURRENT authorized health readback, not a user-editable food property.
const source='https://www.argentina.gob.ar/salud/celiaquia/alimentacionsingluten';
const glutenStaples=new Set(['bread','bread_white','bread_rye','toast_whole','tortilla_wheat','pasta','pasta_dry','couscous_cooked','bulgur_cooked','barley_cooked','seitan_cooked']);
const freshFruit=new Set(['apple','banana','mandarin','orange','pear','kiwi','grapefruit']);
const priority={neutral:0,green:1,yellow:2,red:3};
const labels={green:'Compatible en su forma simple',yellow:'Revisar antes de sugerir',red:'Generalmente incompatible'};
const icons={green:'🟢',yellow:'🟡',red:'🔴'};
export function applyDeclaredFoodGuidance(base,food,health){
 if(health===undefined)return base; // Existing caller has not enabled the health-data integration.
 const selected=health?.selected,entries=selected&&typeof selected==='object'&&!Array.isArray(selected)?Object.entries(selected):[];
 if(health?.declaration==='none_declared'&&!health.revoked&&health.readable===true&&!entries.length)return {...base,canAutoSuggest:base.color==='neutral'||base.color==='green'};
 let color='neutral';const notes=new Set(),references=new Set();
 const add=(c,msg,url)=>{if(priority[c]>priority[color])color=c;notes.add(msg);if(url)references.add(url);};
 if(health?.declaration!=='reported'||health.readable!==true||health.revoked||!entries.length)add('yellow','No hay una declaración vigente para personalizar la sugerencia.');
 else for(const [condition,status] of entries){
  if(status!=='confirmed'){add('yellow','Hay una condición en estudio o sin confirmar.');continue;}
  if(condition!=='celiac'){add('yellow','Esta restricción necesita una regla específica o revisión del coach.');continue;}
  const simple=food&&!food.brand&&!food.productId&&!food.recipeIngredients&&!food.ingredients;
  if(simple&&glutenStaples.has(food.id))add('red','La preparación común de este alimento contiene un cereal con gluten.',source);
  else if(simple&&freshFruit.has(food.id))add('green','Fruta fresca sin agregados: considerar la preparación y el contacto cruzado.',source);
  else add('yellow','Revisar ingredientes, rótulo y preparación; el nombre de un producto no confirma su aptitud.',source);
 }
 const winner=priority[base.color]>priority[color]?base.color:color;
 // Notes and URLs are fixed constants; never interpolate a recipe name or health response as HTML.
 const detail='<small>'+[...notes].join(' ')+'</small>'+[...references].map(url=>' <a href="'+url+'" target="_blank" rel="noopener noreferrer">Criterio de referencia</a>').join('');
 if(winner===base.color&&base.color!=='neutral')return {...base,details:base.details+detail,verified:false,canAutoSuggest:winner==='green'};
 const badge=base.details?.includes('class="efg-in-plan"')?'<span class="efg-in-plan">Incluido en mi plan</span>':'';
 return {color:winner,symbol:icons[winner],short:labels[winner],details:'<span class="efg-food-compatibility efg-compat-'+winner+'">'+labels[winner]+'</span>'+badge+detail,canRecord:true,verified:false,canAutoSuggest:winner==='green'};
}
