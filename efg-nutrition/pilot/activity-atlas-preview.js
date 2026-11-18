const headline = 'Para realizar actividades al aire libre se usan perfumes con un perfil fresco, cítrico, verde o acuático, porque suelen dar una sensación más liviana cuando hace calor o estás en movimiento.';
const catalogURL = new URL('../activity-perfume/catalog.seed.json?v=468ef689',import.meta.url);
const rotationURL = new URL('../activity-perfume/rotation.mjs?v=468ef689',import.meta.url);
const photoNotes = new Map([['Cidra','citron'],['Jazmín','jasmine'],['Madera de teca','teak']]);
const workoutPhotos = new Map([
 ['Pomelo','grapefruit'],['Menta','mint'],['Cedro','cedar'],
 ['Bergamota','bergamot'],['Bambú','bamboo'],['Cuero','leather'],
 ['Loto','lotus'],['Jengibre','ginger'],['Verbena','verbena'],
]);
const noteImages = new Map([
 ['Manzana','guide/apple-r1.webp'],
 ['Lima','food-specific/identity-r3/lime_raw-r1.webp'],
 ['Guayaba','food-specific/identity-r3/guava_raw-r1.webp'],
]);
// Tile order matches the checked contact sheets. Related varieties share a representative image.
const atlasSheets = [
 [
  ["Limón","Limón blanco","Limón italiano","Limón primofiore","Limón siciliano"],
  ["Mandarina","Mandarina italiana"],
  ["Pera","Acorde de jugo de pera"],
  ["Ananá"],
  ["Lavanda"],
  ["Magnolia","Magnolia china"],
  ["Peonía"],
  ["Muguet"],
  ["Frambuesa"],
  ["Granada"],
  ["Coco"],
  ["Maracuyá"],
  ["Enebro","Bayas de enebro"],
  ["Romero"],
  ["Pachulí"],
  ["Vetiver"],
 ],
 [
  ["Yuzu"],
  ["Neroli","Neroli de Vallauris"],
  ["Naranja sanguina"],
  ["Quinoto"],
  ["Té verde"],
  ["Mango verde"],
  ["Lichi"],
  ["Ciruela"],
  ["Gardenia"],
  ["Frangipani"],
  ["Fresia"],
  ["Pétalos de violeta"],
  ["Mimosa"],
  ["Pimienta rosa"],
  ["Sándalo","Sándalo australiano","Sándalo de Nueva Caledonia"],
  ["Ruibarbo"],
 ],
 [
  ["Carambola"],
  ["Membrillo"],
  ["Manzana Granny Smith"],
  ["Higuera"],
  ["Jacinto azul"],
  ["Iris"],
  ["Azucena blanca","Lirios blancos"],
  ["Nenúfar"],
  ["Adelfa"],
  ["Pitosporo"],
  ["Lantana"],
  ["Lentisco verde"],
  ["Elemí"],
  ["Madera de guayaco"],
  ["Bálsamo de abeto"],
  ["Madera flotante"],
 ],
 [
  ["Acorde marino"],
  ["Acorde acuático"],
  ["Sal marina"],
  ["Almizcle","Almizcle blanco","Almizcles blancos"],
  ["Ozono"],
  ["Flor de manzano"],
  ["Ambroxán"],
  [],
  ["Cítricos","Cítricos frescos"],
  ["Sorbete de pera"],
  ["Manzana helada"],
  ["Frutilla silvestre"],
  ["Mandarina verde"],
  ["Sicómoro"],
  ["Fresia púrpura"],
  ["Maderas","Maderas cálidas"],
 ],
 [
  ["Acorde de cedro e iris"],
  ["Jazmín sambac"],
  ["Jazmín grandiflorum"],
  ["Hojas de cedro"],
 ],
];
const atlasNotes = new Map(atlasSheets.flatMap((sheet,index) =>
 sheet.flatMap((notes,slot) => notes.map(note => [note,{sheet:index+1,slot}])),
));
const representativeNotes = new Map(Object.entries({
 "Bergamota de Calabria": "Bergamota",
 "Cidra de Diamante": "Cidra",
 "Cedro de Virginia": "Cedro",
 "Trío de cedros": "Cedro",
 "Menta piperita": "Menta",
 "Hierbabuena": "Menta",
 "Acorde de loto": "Loto",
 "Pomelo rosado": "Pomelo"
}));
const stages = [['salida','Salida'],['corazon','Corazón'],['fondo','Fondo'],['destacadas','Notas destacadas']];
let catalogRequest;

function loadPerfumeCatalog() {
 catalogRequest ??= Promise.all([
  import(rotationURL.href),
  fetch(catalogURL).then(response => {
   if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
   return response.json();
  }),
 ]).catch(error => {
  catalogRequest = undefined;
  throw error;
 });
 return catalogRequest;
}

function perfumeNote(note) {
 const figure = document.createElement('figure');
 const caption = document.createElement('figcaption');
 caption.textContent = note;

 const imageNote = representativeNotes.get(note) ?? note;
 const tile = atlasNotes.get(imageNote);
 if (photoNotes.has(imageNote) || workoutPhotos.has(imageNote) || tile) {
  const photo = document.createElement('div');
  photo.className = 'ncc-scent-photo';
  if (tile) {
   photo.dataset.noteSheet = tile.sheet;
   photo.dataset.noteSlot = tile.slot;
  } else if (workoutPhotos.has(imageNote)) {
   photo.dataset.workoutNote = workoutPhotos.get(imageNote);
  } else {
   photo.dataset.note = photoNotes.get(imageNote);
  }
  photo.setAttribute('aria-hidden','true');
  figure.append(photo);
 } else if (noteImages.has(note)) {
  const photo = document.createElement('img');
  photo.className = 'ncc-scent-photo';
  photo.src = new URL('./assets/' + noteImages.get(note),import.meta.url).href;
  photo.alt = '';
  photo.loading = 'lazy';
  photo.addEventListener('error', () => photo.remove(), {once:true});
  figure.append(photo);
 }

 figure.append(caption);
 return figure;
}

function renderPerfume(panel, item) {
 const title = document.createElement('h3');
 title.textContent = item.name;
 const notes = document.createElement('div');
 notes.className = 'ncc-scent-notes';
 notes.append(...item.highlights.map(perfumeNote));

 const details = document.createElement('details');
 const summary = document.createElement('summary');
 summary.textContent = 'Ver todas las notas';
 details.append(summary);
 for (const [key,label] of stages) {
  if (!item.notes[key]?.length) continue;
  const row = document.createElement('p');
  const heading = document.createElement('strong');
  heading.textContent = label;
  row.append(heading, ' · ' + item.notes[key].join(', '));
  details.append(row);
 }
 panel.replaceChildren(title,notes,details);
}

async function mountPerfumes(section,isCurrent) {
 const status = section.querySelector('[data-atlas-perfume-status]');
 try {
  const [{workoutPerfumesForDay},catalog] = await loadPerfumeCatalog();
  if (!section.isConnected || !isCurrent()) return;
  const perfumes = workoutPerfumesForDay(catalog);
  if (!perfumes) throw new Error('Catálogo incompleto.');
  renderPerfume(section.querySelector('.ncc-scent-male'),perfumes.hombre);
  renderPerfume(section.querySelector('.ncc-scent-female'),perfumes.mujer);
  status.hidden = true;
 } catch {
  if (section.isConnected && isCurrent()) status.textContent = 'El perfume del día no está disponible por el momento.';
 }
}

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
  '<p data-atlas-perfume-status role="status">Cargando el perfume del día…</p>'+
  '<details><summary>Sobre el perfil para entrenar</summary><p>'+headline+'</p></details>'+
  '<div class="ncc-scent-male"></div><div class="ncc-scent-female"></div>'+
  '</section></section>';
}

export async function mountActivityAtlas(root, { db, day, isCurrent, enabled }) {
 const section=root.querySelector('.ncc-activity-atlas');
 if(!section)return;
 void mountPerfumes(section,isCurrent);
 if(!enabled)return;
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
