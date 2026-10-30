// PRO-60 / D-36 — 72 editorial microtips, Argentine-local calendar.
// No health profiling, scores, invented nutrients, or medical "green" claims.
// Unlicensed image scraping is not used. Photos are confirmed Unsplash License
// assets; credit and source are exposed in the UI. Image hosts receive requests
// only when the card is displayed; fallback text remains available.
const photos=[
 {
  "key": "gnocchi",
  "src": "https://images.unsplash.com/photo-1745871136691-8fb229223fc8?auto=format&fit=crop&w=960&q=75",
  "page": "https://unsplash.com/photos/gnocchi-with-sauce-and-fresh-basil-served-on-a-plate-_ESn6muFTPU",
  "by": "Leandro Rossi",
  "alt": "Plato de ñoquis con salsa y albahaca fresca"
 },
 {
  "key": "breakfast",
  "src": "https://images.unsplash.com/photo-1497888329096-51c27beff665?auto=format&fit=crop&w=960&q=75",
  "page": "https://unsplash.com/photos/two-bowls-of-oatmeal-with-fruits-W9OKrxBqiZA",
  "by": "Brooke Lark",
  "alt": "Avena en bowls con frutas frescas"
 },
 {
  "key": "vegetables",
  "src": "https://images.unsplash.com/photo-1600335895229-6e75511892c8?auto=format&fit=crop&w=960&q=75",
  "page": "https://unsplash.com/photos/green-and-purple-vegetable-salad-2RrBE90w0T8",
  "by": "Luisa Brimble",
  "alt": "Ensalada con vegetales coloridos y diferentes texturas"
 },
 {
  "key": "plate",
  "src": "https://images.unsplash.com/photo-1771074168450-11e3f8b7aa53?auto=format&fit=crop&w=960&q=75",
  "page": "https://unsplash.com/photos/a-colorful-bowl-of-rice-chickpeas-and-salad-emy9Rhhn2PI",
  "by": "Sumit Bhatia",
  "alt": "Plato con arroz, garbanzos y vegetales"
 },
 {
  "key": "water",
  "src": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=960&q=75",
  "page": "https://unsplash.com/photos/clear-glass-cup-filled-with-water-and-lemon-gtDYwUIr9Vg",
  "by": "Melissa Walker Horn",
  "alt": "Vaso con agua, hielo y cítricos"
 },
 {
  "key": "nuts",
  "src": "https://images.unsplash.com/photo-1717002997856-8f68e644fbd2?auto=format&fit=crop&w=960&q=75",
  "page": "https://unsplash.com/photos/a-close-up-of-nuts-in-a-bowl-oWr5Tw2UWik",
  "by": "Haberdoedas II",
  "alt": "Frutos secos en un bowl"
 },
 {
  "key": "oatmeal",
  "src": "https://images.unsplash.com/photo-1702648982253-8b851013e81f?auto=format&fit=crop&w=960&q=75",
  "page": "https://unsplash.com/photos/a-bowl-of-oatmeal-with-fruit-and-nuts-RF4uFHkCQ0s",
  "by": "Victoria V",
  "alt": "Bowl de avena con fruta y frutos secos"
 }
];
const gnocchiPhotos=[
 {src:"https://images.unsplash.com/photo-1745871136691-8fb229223fc8?auto=format&fit=crop&w=960&q=75",page:"https://unsplash.com/photos/gnocchi-with-sauce-and-fresh-basil-served-on-a-plate-_ESn6muFTPU",by:"Leandro Rossi",alt:"Ñoquis con salsa y albahaca"},
 {src:"https://images.unsplash.com/photo-1698688332650-8724293b2ad8?auto=format&fit=crop&w=960&q=75",page:"https://unsplash.com/photos/a-white-plate-topped-with-pasta-and-sauce-Etsdv1OFgEo",by:"Laura Peruchi",alt:"Plato de ñoquis servido con salsa"},
 {src:"https://images.unsplash.com/photo-1774828893338-50fd6c5f3062?auto=format&fit=crop&w=960&q=75",page:"https://unsplash.com/photos/gnocchi-with-meat-sauce-red-wine-and-parmesan-cheese-R_-17QeZi6U",by:"Arthur P.",alt:"Ñoquis servidos con salsa roja y queso"}
];
const themes=[
 [
  "Desayunos sin apuro",
  "breakfast",
  [
   [
    "Desayuno que te gusta",
    "Elegí una combinación que disfrutes y que puedas repetir sin complicarte."
   ],
   [
    "Avena con personalidad",
    "Probá avena cocida con fruta; las cantidades son las que acuerdes en tu plan."
   ],
   [
    "Huevos de distintas maneras",
    "Hervidos, revueltos o en tortilla: variá la preparación según lo que tengas."
   ],
   [
    "Fruta en la mañana",
    "Una fruta de estación suma color y practicidad a tu desayuno."
   ],
   [
    "Desayuno listo desde anoche",
    "Dejá los ingredientes medidos y la taza preparada para una mañana más tranquila."
   ],
   [
    "Un desayuno, varias opciones",
    "Guardá tus combinaciones favoritas para elegir la que prefieras cada día."
   ],
   [
    "Tostadas con ideas",
    "Probá acompañamientos diferentes, salados o dulces, respetando tus necesidades."
   ],
   [
    "La rutina también puede variar",
    "No existe un único desayuno perfecto: buscá variedad y comodidad."
   ]
  ]
 ],
 [
  "Colores en el plato",
  "vegetables",
  [
   [
    "Verduras de estación",
    "Elegir productos de temporada puede ayudarte a variar sabores y preparaciones."
   ],
   [
    "Una textura diferente",
    "Al horno, al vapor o crudas: una misma verdura cambia mucho según cómo la prepares."
   ],
   [
    "Probá otro color",
    "Combinar vegetales de colores distintos aporta variedad al plato."
   ],
   [
    "Rúcula y compañía",
    "Probá sumar hojas a un plato tibio justo antes de servirlo."
   ],
   [
    "Vegetales al horno",
    "Cortá porciones parecidas para facilitar una cocción uniforme."
   ],
   [
    "Preparación simple",
    "Lavá y guardá verduras de forma segura para ahorrar pasos al cocinar."
   ],
   [
    "Ensalada con más sabor",
    "Hierbas, cítricos y aderezos que te gusten pueden darle otro perfil al plato."
   ],
   [
    "La verdura que sí disfrutás",
    "Empezá por la que te gusta y explorá otras formas de preparar las demás."
   ]
  ]
 ],
 [
  "Hidratación cotidiana",
  "water",
  [
   [
    "Agua a mano",
    "Una botella accesible puede recordarte tomar agua a lo largo del día."
   ],
   [
    "Agua con sabor natural",
    "Probá agua con rodajas de cítricos o menta, si te agrada."
   ],
   [
    "Tomar agua con las comidas",
    "Acompañar la comida con agua puede ser una costumbre cómoda."
   ],
   [
    "Después de moverte",
    "Tené agua disponible al terminar tu actividad; las necesidades varían según persona y clima."
   ],
   [
    "Infusiones a tu gusto",
    "Mate, té o café pueden formar parte de tu rutina; cuidá tus necesidades individuales."
   ],
   [
    "Elegí tu vaso favorito",
    "A veces un hábito resulta más sencillo cuando el objeto está a la vista."
   ],
   [
    "Cuando hace calor",
    "Observá tu sed y las condiciones del día; ajustá tu hidratación a tus necesidades."
   ],
   [
    "Una pausa para hidratarte",
    "Asociá una pausa habitual con tomar agua, sin imponer horarios rígidos."
   ]
  ]
 ],
 [
  "Legumbres y cereales",
  "plate",
  [
   [
    "Garbanzos para variar",
    "Probá garbanzos en ensalada, salteados o en una preparación casera."
   ],
   [
    "Arroz y vegetales",
    "Un bowl con arroz y verduras permite combinar sabores sin recetas complicadas."
   ],
   [
    "Lentejas para otro día",
    "Cociná una tanda y conservá porciones según normas de refrigeración."
   ],
   [
    "Texturas en un mismo plato",
    "Combiná ingredientes crujientes y suaves para que el almuerzo resulte más interesante."
   ],
   [
    "Una base, varios platos",
    "Con un cereal cocido podés armar distintas comidas durante la semana."
   ],
   [
    "Porotos con sabor",
    "Probá hierbas, tomate o especias en la preparación que más te guste."
   ],
   [
    "Polenta de otra forma",
    "La polenta puede acompañarse de verduras y una fuente de proteína."
   ],
   [
    "Un plato que se adapta",
    "Ajustá ingredientes y porciones al objetivo que definiste con tu coach."
   ]
  ]
 ],
 [
  "Organización realista",
  "oatmeal",
  [
   [
    "Tu cocina, tus horarios",
    "Elegí dos preparaciones simples que resuelvan días ocupados."
   ],
   [
    "Lista corta, semana más fácil",
    "Antes de comprar, revisá lo que ya tenés en casa."
   ],
   [
    "Cocinar una vez, usar dos",
    "Una preparación bien conservada puede servir para más de una comida."
   ],
   [
    "Lo práctico también cuenta",
    "Tener opciones sencillas a mano evita depender siempre de una receta compleja."
   ],
   [
    "Elegí una receta conocida",
    "Modificar una sola guarnición puede dar variedad sin empezar de cero."
   ],
   [
    "Organizá por momentos",
    "Pensá qué comida necesitás resolver primero según tu rutina."
   ],
   [
    "No todo tiene que ser casero",
    "Podés combinar alimentos preparados y frescos según tus preferencias."
   ],
   [
    "Cuidá la conservación",
    "Refrigerá pronto los alimentos cocidos y seguí las recomendaciones de inocuidad."
   ]
  ]
 ],
 [
  "Frutos secos y semillas",
  "nuts",
  [
   [
    "Una textura crocante",
    "Los frutos secos pueden sumar textura a un yogur o una ensalada."
   ],
   [
    "Semillas de distintas formas",
    "Probá semillas incorporadas a preparaciones si son adecuadas para vos."
   ],
   [
    "Porciones claras",
    "Si registrás frutos secos, pesalos para reflejar mejor la cantidad consumida."
   ],
   [
    "Un snack simple",
    "Elegí colaciones que te gusten y se adapten a tu alimentación."
   ],
   [
    "Frutos secos en recetas",
    "Probá picarlos sobre un plato, si no tenés alergias o restricciones."
   ],
   [
    "Elegí el que preferís",
    "Nueces, almendras y otros frutos secos tienen sabores y perfiles diferentes."
   ],
   [
    "Leer el paquete",
    "Comprobá ingredientes y alérgenos de las mezclas comerciales."
   ],
   [
    "Textura y sabor",
    "Una pequeña cantidad de semillas puede cambiar la experiencia de una preparación."
   ]
  ]
 ],
 [
  "Lectura de etiquetas",
  "plate",
  [
   [
    "Leé la porción de referencia",
    "Los valores del envase corresponden a la cantidad declarada: comparala con lo que comés."
   ],
   [
    "Ingredientes primero",
    "Mirá la lista real del producto antes de sacar conclusiones por su nombre."
   ],
   [
    "Alergias: verificá siempre",
    "Si tenés una alergia, revisá rótulo y advertencias; un tip no acredita seguridad."
   ],
   [
    "Productos parecidos, distintos",
    "Dos marcas pueden informar porciones y nutrientes diferentes."
   ],
   [
    "Mirar la fecha",
    "Antes de usar un alimento revisá su conservación y su fecha aplicable."
   ],
   [
    "Comparaciones justas",
    "Para comparar etiquetas, fijate si los datos están expresados por 100 g o por porción."
   ],
   [
    "Los números tienen contexto",
    "El valor calórico no determina por sí solo si un alimento es adecuado para vos."
   ],
   [
    "Guardá la fuente",
    "Cuando registres un producto, usá su etiqueta verificable y no un número supuesto."
   ]
  ]
 ],
 [
  "Placer y comidas compartidas",
  "gnocchi",
  [
   [
    "Comer también es disfrutar",
    "Una comida elegida por gusto puede convivir con una alimentación organizada."
   ],
   [
    "El encuentro importa",
    "Compartir la mesa también forma parte de tu vida cotidiana."
   ],
   [
    "Tradiciones que se disfrutan",
    "Las recetas familiares pueden adaptarse a distintas preferencias sin perder su historia."
   ],
   [
    "Salsas a elección",
    "La salsa cambia el plato; registrala por separado si querés estimar nutrientes."
   ],
   [
    "Sin compensaciones",
    "Una comida diferente no exige castigos ni restricciones al día siguiente."
   ],
   [
    "Preparar en compañía",
    "Cocinar con alguien puede convertir una receta simple en un buen momento."
   ],
   [
    "Probá una variante",
    "Elegí otra hierba, textura o salsa para disfrutar una comida conocida."
   ],
   [
    "Tu comida favorita tiene lugar",
    "Organizá tus elecciones sin clasificar los alimentos como premio o culpa."
   ]
  ]
 ],
 [
  "Proteínas en platos reales",
  "plate",
  [
   [
    "Proteínas con variedad",
    "Alterná entre fuentes que disfrutes y se adapten a tu plan."
   ],
   [
    "La preparación cambia",
    "Al horno, a la plancha o en guiso: podés variar sin cambiar todos los ingredientes."
   ],
   [
    "Un bowl completo",
    "Combiná los componentes del plato según la guía acordada con tu coach."
   ],
   [
    "Legumbres como alternativa",
    "Las legumbres pueden integrar comidas con proteína de origen vegetal."
   ],
   [
    "Cantidades con contexto",
    "Los gramos de un ingrediente no equivalen directamente a gramos de proteína."
   ],
   [
    "Sumá sabor con hierbas",
    "Hierbas y especias pueden ayudarte a variar una preparación cotidiana."
   ],
   [
    "Una guía no es un registro",
    "Ver una comida propuesta no significa que ya la hayas consumido."
   ],
   [
    "Crudo y cocido",
    "Al pesar alimentos, especificá si registraste peso crudo o cocido."
   ]
  ]
 ]
];
const gnocchi=[
 [
  "¡Hoy es 29, día de ñoquis!",
  "Una tradición argentina para disfrutar: ñoquis con salsa de tomate y albahaca. La salsa se registra aparte si calculás nutrientes."
 ],
 [
  "Los ñoquis del 29, a tu estilo",
  "Podés elegir ñoquis de papa con una salsa casera. El plato no necesita etiquetas de culpa ni compensaciones."
 ],
 [
  "¡Se festeja con ñoquis!",
  "Elegí una salsa que te guste y disfrutá la tradición. Las porciones y macros dependen de la receta concreta."
 ],
 [
  "El 29 tiene sabor a ñoquis",
  "Ñoquis, una mesa compartida y una receta que se renueva cada mes."
 ],
 [
  "Hoy toca tradición argentina",
  "Probá ñoquis con salsa de vegetales. Si registrás el plato, pesá ñoquis y salsa por separado."
 ],
 [
  "Día de ñoquis, día de disfrutar",
  "No hay un plato universal: cada receta y acompañamiento cambia las cantidades nutricionales."
 ],
 [
  "¡Volvieron los ñoquis del 29!",
  "La tradición sigue viva: papa, salsa y una comida elegida con gusto, sin prohibiciones generales."
 ],
 [
  "Ñoquis del 29: una variante nueva",
  "Aprovechá para cambiar una salsa o preparar una versión familiar. No se deducen macros sin receta pesada."
 ]
];
export const DAILY_TIP_LIBRARY_SIZE=72;
export const DAILY_TIP_VERSION="pro60-20261030-1";
const zone="America/Argentina/Buenos_Aires";
export function argentinaDayParts(instant=new Date()){
 const pieces=new Intl.DateTimeFormat("en-US",{
  timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date(instant));
 const get=type=>Number(pieces.find(x=>x.type===type)?.value);
 const year=get("year"),month=get("month"),day=get("day");
 if(!(year>=2000&&month>=1&&month<=12&&day>=1&&day<=31))
  throw Error("No se pudo determinar la fecha local argentina.");
 return {year,month,day,iso:`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`};
}
function photoFor(key){return photos.find(x=>x.key===key)||photos[0];}
export function nutritionTipForDate(instant=new Date()){
 const date=argentinaDayParts(instant);
 const serial=Math.floor(Date.UTC(date.year,date.month-1,date.day)/86400000);
 if(date.day===29){
  const n=((date.year*12+date.month)%gnocchi.length);
  return {id:"gnocchi-"+n,title:gnocchi[n][0],body:gnocchi[n][1],
   category:"Tradiciones argentinas",special:true,date:date.iso,...gnocchiPhotos[(date.year*12+date.month)%gnocchiPhotos.length]};
 }
 const i=((serial%DAILY_TIP_LIBRARY_SIZE)+DAILY_TIP_LIBRARY_SIZE)%DAILY_TIP_LIBRARY_SIZE;
 const group=themes[i%themes.length];
 const item=group[2][Math.floor(i/themes.length)];
 return {id:"daily-"+i,title:item[0],body:item[1],category:group[0],
  special:false,date:date.iso,...photoFor(group[1])};
}
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export function nutritionTipCardHTML({now=new Date(),allowExplore=false}={}){
 const tip=nutritionTipForDate(now);
 const label=tip.special?"TRADICIÓN ARGENTINA":"NUTRICIÓN CON-CIENCIA";
 const date=tip.date.split("-").reverse().join("/");
 return '<section class="efg-daily-tip" aria-labelledby="efgTipTitle">'+
 '<div class="efg-daily-tip-media">'+
 '<img class="efg-daily-tip-photo" src="'+escapeHTML(tip.src)+'" alt="'+escapeHTML(tip.alt)+'" loading="lazy" decoding="async" width="960" height="640" referrerpolicy="no-referrer">'+
 '<div class="efg-daily-tip-overlay"><span class="efg-daily-tip-label">'+label+'</span><span class="efg-daily-tip-date">'+date+'</span></div></div>'+
 '<div class="efg-daily-tip-copy"><p class="efg-daily-tip-kicker">TIP NUTRICIONAL DEL DÍA · '+escapeHTML(tip.category)+'</p>'+
 '<h2 id="efgTipTitle">'+escapeHTML(tip.title)+'</h2>'+
 '<p class="efg-daily-tip-description">'+escapeHTML(tip.body)+'</p>'+
 '<p class="efg-daily-tip-disclaimer">Contenido cultural y educativo. No reemplaza indicaciones profesionales ni asigna calorías sin una receta verificada.</p>'+
 (allowExplore?'<button type="button" class="efg-daily-tip-action" data-tab="recipes">Explorar recetas <span aria-hidden="true">→</span></button>':'')+
 '<small class="efg-daily-tip-credit">Fotografía: <a href="'+escapeHTML(tip.page)+'" target="_blank" rel="noopener noreferrer" aria-label="Fotografía de '+escapeHTML(tip.by)+'" >'+escapeHTML(tip.by)+' / Unsplash</a></small>'+
 '</div></section>';
}
