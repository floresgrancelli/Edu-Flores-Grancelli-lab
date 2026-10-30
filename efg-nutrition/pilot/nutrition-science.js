// EFG Nutrition Pro — educational reading for Coach + Student; no clinical advice.
export const NUTRITION_SCIENCE_SOURCES=Object.freeze([
 {title:"OMS · Alimentación saludable (2026)",url:"https://www.who.int/news-room/fact-sheets/detail/healthy-diet"},
 {title:"OMS · Calidad de los hidratos de carbono (2023)",url:"https://www.who.int/publications/i/9789240073593"},
 {title:"OMS · Grasas saturadas y trans (2023)",url:"https://www.who.int/publications/i/item/9789240073630"},
 {title:"NIH · Balance energético y calorías",url:"https://www.ncbi.nlm.nih.gov/books/NBK20371/"},
 {title:"ISSN · Proteína y ejercicio, revisión (2017)",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"}
]);
const macro=(grams,kcal)=>Object.freeze({grams,kcal,energy:grams*kcal});
export function macroEnergy(grams,kind){
 const factors={protein:4,carbs:4,fat:9};
 if(!Object.hasOwn(factors,kind)||!Number.isFinite(grams)||grams<0)
  throw new RangeError("Gramaje o macronutriente no válido");
 return grams*factors[kind];
}
export const SCIENCE_EXAMPLE=Object.freeze([
 macro(20,4),macro(20,4),macro(20,9)
]);
const src=()=>NUTRITION_SCIENCE_SOURCES.map((s,i)=>
 '<li><a href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+
 String(i+1)+'. '+s.title+' <span aria-hidden="true">↗</span></a></li>').join("");

export function renderNutritionScienceView(){
 return '<div class="ns-science" aria-label="Educación nutricional basada en evidencia">'+
 '<header class="ns-hero">'+
 '<span class="ns-kicker">EFG LAB · APRENDÉ EN 5 MINUTOS</span>'+
 '<h1>Nutrición <em>con ciencia.</em></h1>'+
 '<p>Sin dietas mágicas, sin alimentos enemigos. Lo esencial para entender tu plan y elegir con libertad.</p>'+
 '<div class="ns-hero-chips" aria-label="Temas"><span>⚡ Energía</span><span>💪 Proteínas</span><span>🥑 Grasas</span><span>🌾 Hidratos</span></div>'+
 '</header>'+
 '<section class="ns-intro" aria-labelledby="ns-calorias">'+
 '<div><span class="ns-eyebrow">01 · EMPECEMOS POR LO BÁSICO</span>'+
 '<h2 id="ns-calorias">¿Qué son las calorías?</h2>'+
 '<p>Son una forma de medir la <strong>energía</strong> de lo que comemos. Tu cuerpo la usa para respirar, moverse, pensar y entrenar.</p>'+
 '<p>Si, a lo largo del tiempo, incorporás más energía de la que gastás, el peso tiende a subir. Si incorporás menos, tiende a bajar. <strong>Pero el cuerpo no es una calculadora perfecta:</strong> la actividad, la saciedad y las adaptaciones también influyen.</p></div>'+
 '<div class="ns-energy" role="img" aria-label="Proteína e hidratos: 4 kilocalorías por gramo cada uno. Grasas: 9 kilocalorías por gramo.">'+
 '<div class="ns-energy-line ns-energy-p"><span>💪 Proteínas</span><strong>4 <small>kcal/g</small></strong><i></i></div>'+
 '<div class="ns-energy-line ns-energy-c"><span>🌾 Hidratos</span><strong>4 <small>kcal/g</small></strong><i></i></div>'+
 '<div class="ns-energy-line ns-energy-f"><span>🥑 Grasas</span><strong>9 <small>kcal/g</small></strong><i></i></div>'+
 '<small>Por cada gramo de macronutriente. No por gramo de alimento.</small></div>'+
 '</section>'+
 '<section aria-labelledby="ns-tres"><div class="ns-section-head"><span class="ns-eyebrow">02 · TRES PIEZAS QUE SE COMPLEMENTAN</span>'+
 '<h2 id="ns-tres">Los tres macros tienen su función</h2><p>Más no siempre significa mejor. La combinación adecuada depende de cada persona y de sus objetivos.</p></div>'+
 '<div class="ns-macro-grid">'+
 '<article class="ns-macro ns-protein"><span class="ns-macro-emoji" aria-hidden="true">💪</span><h3>Proteínas</h3><b>Construir y reparar</b><p>Aportan aminoácidos para mantener músculos, tejidos y muchas funciones del cuerpo. Entrenar fuerza y comer suficiente proteína se complementan.</p><small>Ejemplos: huevos, pescado, legumbres, carnes y lácteos.</small></article>'+
 '<article class="ns-macro ns-carbs"><span class="ns-macro-emoji" aria-hidden="true">🌾</span><h3>Hidratos</h3><b>Energía para vivir y rendir</b><p>Aportan combustible para tus actividades y entrenamiento. Las fuentes con fibra, como avena, frutas, legumbres y cereales integrales, suman nutrientes.</p><small>Ejemplos: arroz, papa, pan integral, frutas y lentejas.</small></article>'+
 '<article class="ns-macro ns-fat"><span class="ns-macro-emoji" aria-hidden="true">🥑</span><h3>Grasas</h3><b>También son esenciales</b><p>Ayudan a las membranas celulares y a absorber vitaminas A, D, E y K. Priorizá las insaturadas y moderá las saturadas; no se trata de eliminarlas.</p><small>Ejemplos: aceite de oliva, nueces, semillas y pescados.</small></article>'+
 '</div></section>'+
 '<section class="ns-myth" aria-labelledby="ns-mito"><span class="ns-eyebrow">03 · DERRIBANDO UN MITO</span>'+
 '<div class="ns-myth-badge" aria-hidden="true">MITO ≠ CIENCIA</div><h2 id="ns-mito">Los hidratos no son el villano.</h2>'+
 '<p><strong>Comer arroz, pan o papa no te hace aumentar grasa automáticamente.</strong> Importa la cantidad total de energía y la calidad de la alimentación. No es igual basar tu dieta en legumbres, frutas e integrales que en bebidas azucaradas y productos de baja calidad nutricional.</p>'+
 '<p>Para la mayoría de las personas, incluir hidratos ricos en fibra es compatible con comer saludable y entrenar bien. Si tenés diabetes u otra condición, las porciones y elecciones necesitan individualizarse.</p>'+
 '<span class="ns-myth-credit">Basado en recomendaciones OMS sobre calidad de carbohidratos (2023 y 2026).</span></section>'+
 '<section class="ns-balance" aria-labelledby="ns-comparar"><span class="ns-eyebrow">04 · ¿QUÉ PASA SI CAMBIO LAS PROPORCIONES?</span>'+
 '<h2 id="ns-comparar">¿Más proteínas que grasas? ¿O al revés?</h2>'+
 '<p>Primero una clave: comparar <strong>gramos</strong> no es comparar <strong>calorías</strong>. Por ejemplo, 20 g de grasa aportan 180 kcal; 20 g de proteína, 80 kcal.</p>'+
 '<div class="ns-compare">'+
 '<article><div class="ns-compare-badge">↑ PROTEÍNAS</div><h3>Más proteínas, menos grasas</h3><p>Puede facilitar llegar al aporte proteico, pero <strong>no garantiza ganar más músculo</strong>. Si bajás demasiado las grasas, podés perder ácidos grasos esenciales y variedad nutricional. También importan las calorías y el entrenamiento.</p></article>'+
 '<article><div class="ns-compare-badge">↑ GRASAS</div><h3>Más grasas, menos proteínas</h3><p>Puede ser una distribución válida, pero resulta más fácil sumar calorías porque la grasa concentra más energía. Si no alcanzás la proteína que necesitás, podrías dificultar el mantenimiento muscular, especialmente si entrenás.</p></article>'+
 '</div><div class="ns-takeaway"><strong>Lo que importa:</strong> energía total, proteína suficiente, grasas de calidad, hidratos adecuados, fibra y constancia. Ningún macro compensa por sí solo una alimentación poco variada.</div></section>'+
 '<section class="ns-faq" aria-labelledby="ns-preguntas"><span class="ns-eyebrow">05 · RESPUESTAS CORTAS</span>'+
 '<h2 id="ns-preguntas">Preguntas que aparecen siempre</h2>'+
 '<details><summary>¿Más proteína significa más músculo?</summary><p>No por sí sola. Importan el estímulo del entrenamiento, la cantidad suficiente de proteína, la recuperación y el total de energía. En personas sanas que entrenan, la literatura deportiva suele situar un rango orientativo de 1,4 a 2,0 g/kg/día, no un objetivo universal.</p></details>'+
 '<details><summary>¿Las grasas engordan más que los hidratos?</summary><p>Las grasas concentran más kcal por gramo, pero el aumento de peso depende del balance energético sostenido. Aceite de oliva, frutos secos y pescado pueden formar parte de una alimentación saludable.</p></details>'+
 '<details><summary>¿Si dejo el pan o el arroz bajo grasa más rápido?</summary><p>No necesariamente. Al disminuir hidratos puede cambiar el agua asociada al glucógeno y verse un descenso inicial en la balanza. La pérdida de grasa sostenida no depende de prohibir un único alimento.</p></details>'+
 '<details><summary>¿Existe una distribución perfecta de macros?</summary><p>No para todos. Tus necesidades varían según actividad, objetivo y salud. Si hay una condición médica o restricción, las recomendaciones generales no sustituyen un plan individual.</p></details>'+
 '</section>'+
 '<section class="ns-sources" aria-labelledby="ns-fuentes"><span class="ns-eyebrow">TRANSPARENCIA CIENTÍFICA</span><h2 id="ns-fuentes">¿De dónde sale esta información?</h2>'+
 '<p>Fuentes públicas y revisión científica consultadas para esta guía. Podés abrirlas y conocer la evidencia original.</p><ol>'+src()+'</ol>'+
 '<p class="ns-disclaimer">Contenido educativo general, no diagnóstico ni indicación dietoterapéutica. Tus metas y restricciones se revisan con tu coach y, cuando corresponda, con un profesional de salud.</p></section>'+
 '</div>';
}
