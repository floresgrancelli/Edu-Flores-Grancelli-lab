const headline = 'Para realizar actividades al aire libre se usan perfumes con un perfil fresco, cítrico, verde o acuático, porque suelen dar una sensación más liviana cuando hace calor o estás en movimiento.';
const photoNotes = [['Cidra','citron'],['Jazmín','jasmine'],['Madera de teca','teak']];

export function activityAtlasHTML() {
 return '<section class="ncc-activity-atlas" aria-label="Mi Actividad">'+
  '<div class="ncc-activity-trail"><h1 class="sr-only">Mi Actividad</h1>'+
  '<div class="ncc-activity-metrics" aria-label="Actividad de hoy">'+
  '<div><small>Pasos de hoy</small><strong data-atlas-steps>—</strong></div>'+
  '<div><small>Calorías activas</small><strong data-atlas-energy>—</strong></div></div>'+
  '<small class="ncc-activity-source" data-atlas-source>Sin datos sincronizados</small></div>'+
  '<section class="ncc-activity-perfume"><h2>Perfume del día para entrenar</h2>'+
  '<fieldset class="ncc-scent-switch"><legend class="sr-only">Opción de perfume</legend>'+
  '<label><input type="radio" name="activity-scent" value="hombre"><span>Hombre</span></label>'+
  '<label><input type="radio" name="activity-scent" value="mujer" checked><span>Mujer</span></label></fieldset>'+
  '<div class="ncc-scent-male"><h3>Afnan Turathi Blue EDP</h3><p>Bergamota · Mandarina · Maderas</p></div>'+
  '<div class="ncc-scent-female"><h3>Chanel Chance Eau Fraîche EDT</h3>'+
  '<div class="ncc-scent-notes">'+photoNotes.map(([note,key])=>
   '<figure><div class="ncc-scent-photo" data-note="'+key+'" aria-hidden="true"></div><figcaption>'+note+'</figcaption></figure>').join('')+'</div></div>'+
  '<details><summary>Sobre el perfil para entrenar</summary><p>'+headline+'</p></details>'+
  '</section></section>';
}

export async function mountActivityAtlas(root, { db, day, isCurrent, enabled }) {
 const section=root.querySelector('.ncc-activity-atlas');
 if(!section||!enabled)return;
 try{
  const {data,error}=await db.from('efg_daily_device_activity')
   .select('steps,active_kcal,source').eq('activity_day',day).maybeSingle();
  if(error)throw error;
  if(!section.isConnected||!isCurrent())return;
  if(!data)return;
  const format=new Intl.NumberFormat('es-AR',{maximumFractionDigits:0});
  section.querySelector('[data-atlas-steps]').textContent=data.steps==null?'—':format.format(data.steps);
  section.querySelector('[data-atlas-energy]').textContent=data.active_kcal==null?'—':format.format(data.active_kcal)+' kcal';
  section.querySelector('[data-atlas-source]').textContent=data.source==='apple_health'?'Apple Salud · calorías estimadas':'Health Connect · calorías estimadas';
 }catch{
  if(section.isConnected&&isCurrent())section.querySelector('[data-atlas-source]').textContent='No se pudo sincronizar la actividad.';
 }
}
