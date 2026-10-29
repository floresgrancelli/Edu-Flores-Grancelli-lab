// EFG Nutrition Pro · view-only preview of saved meals.
// Uses the exact stored items and per-item nutritional snapshots; never writes a diary.
const safeNumber=value=>typeof value==="number"&&Number.isFinite(value);
const fmt=(v,d=1)=>Number(v).toLocaleString("es-AR",{maximumFractionDigits:d});
export function habitualShortLabel(habitual){
 const name=String(habitual?.name||"Comida habitual").trim();
 const items=Array.isArray(habitual?.items)?habitual.items:[];
 const names=items.slice(0,2).map(x=>String(x?.name||"Alimento").trim()).filter(Boolean);
 const summary=names.join(", ")+(items.length>2?" +"+(items.length-2):"");
 return name+(summary?" · "+summary:"");
}
export function habitualPreviewHTML(habitual,escapeHTML){
 if(!habitual||!Array.isArray(habitual.items)||!habitual.items.length)
  return '<div class="efg-habitual-preview efg-habitual-preview-empty" role="status">Elegí un habitual para ver sus alimentos y cantidades antes de registrarlo.</div>';
 const esc=value=>escapeHTML(String(value??""));
 const items=habitual.items;
 const macros=["k","p","c","f"];
 const complete=items.every(item=>macros.every(key=>safeNumber(item?.[key])));
 const totals=complete?Object.fromEntries(macros.map(key=>[key,items.reduce((n,item)=>n+item[key],0)])):null;
 const lines=items.map(item=>{
  const name=esc(item?.name||"Alimento sin nombre");
  const amount=safeNumber(item?.qty)&&item.qty>0?fmt(item.qty,1):"Cantidad no disponible";
  const unit=String(item?.unit||"g").trim();
  return '<li><span class="efg-habitual-food-name">'+name+'</span><span class="efg-habitual-food-qty">'+esc(amount+(amount==="Cantidad no disponible"?"":" "+unit))+'</span></li>';
 }).join("");
 const metrics=totals?
  '<p class="efg-habitual-preview-macros">'+fmt(totals.k,0)+' kcal · P '+fmt(totals.p)+' g · HC '+fmt(totals.c)+' g · G '+fmt(totals.f)+' g</p>':
  '<p class="efg-habitual-preview-macros">Macros no disponibles para todos los alimentos guardados.</p>';
 return '<section class="efg-habitual-preview" role="region" aria-label="Contenido del habitual seleccionado">'+
  '<div class="efg-habitual-preview-heading"><strong>'+esc(habitual.name||"Comida habitual")+'</strong><span>'+items.length+' alimento'+(items.length===1?"":"s")+'</span></div>'+
  '<ul class="efg-habitual-preview-foods">'+lines+'</ul>'+
  metrics+'<p class="efg-habitual-preview-note">Vista previa. Estos alimentos no se agregarán hasta tocar «Registrar habitual».</p></section>';
}
