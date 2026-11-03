// EFG Nutrition Pro · fase de catálogo panadería y proteínas vegetales (PR borrador).
// Macros genéricos ORIENTATIVOS por 100 g de alimento comestible, no son análisis
// de alimentos concretos, etiquetas de marcas ni aval de aptitud para celíacos.
// Ajustar por peso real, ingredientes, humedad y cocción. Fuente de validación
// futura por ficha: USDA FoodData Central, Argenfoods, recetas pesadas o etiqueta.
// Campos: id, nombre, categoría, proteína, hidratos, grasas, fibra, porción g, descripción, alias.
const ROWS=[
 ["pan_mignon_panaderia","Pan miñón común de panadería","bakery",9,55,1.6,2.4,45,"miñón mediano",["pan mignon","pan miñon","pan comun","pan panaderia","pancito"]],
 ["pan_campo_panaderia","Pan de campo tradicional de panadería","bakery",8.5,52,2.5,3,60,"rebanada gruesa",["pan campo","pan casero de panaderia","pan de panaderia"]],
 ["tofu_ahumado_generic","Tofu ahumado, sin aceite añadido","plant",15,2.5,9,1,100,"porción de tofu",["tofu smoked","tofu vegetal","proteina vegana"]],
 ["tofu_sedoso_generic","Tofu sedoso natural","plant",5,2,3,0.3,100,"porción de tofu sedoso",["tofu silken","tofu suave","tofu blando"]],
 ["lupines_cooked","Altramuces o lupines cocidos, escurridos","legumes",15.5,10,3,3,100,"porción de lupines",["lupines","chochos","altramuces","legumbre proteica"]],
 ["lentils_red_cooked","Lentejas rojas cocidas, sin aceite","legumes",9,20,0.4,8,150,"porción de lentejas rojas",["lenteja roja","lentejas turcas","lentejas coral"]],
 ["mung_beans_cooked","Porotos mung cocidos, sin aceite","legumes",7,19,0.4,7,150,"porción de porotos mung",["poroto mung","frijol mung","judia mung"]],
 ["black_bean_burger_home","Hamburguesa casera de porotos negros y avena, horneada","prepared",8,20,5,6,115,"medallón casero",["medallon porotos negros","hamburguesa vegana porotos","hamburguesa vegetal"]],
 ["soy_tvp_burger_home","Hamburguesa casera de soja texturizada rehidratada, horneada","prepared",14,13,6,5,115,"medallón casero",["hamburguesa soja texturizada","medallon de soja","hamburguesa vegana soja"]],
 ["soy_tvp_meatballs_home","Albóndigas veganas de soja texturizada, horneadas","prepared",14,12,7,4,120,"porción de albóndigas",["albondigas veganas","albondigas soja","proteina vegetal"]],
 ["tofu_scramble_no_oil","Revuelto de tofu con verduras, sin aceite añadido","prepared",10,5,7,2,150,"porción de revuelto",["tofu revuelto","huevos veganos tofu","revuelto vegano"]],
 ["chickpea_omelette_home","Tortilla de harina de garbanzo, cocida con aceite","prepared",8,20,8,4,120,"tortilla mediana",["tortilla vegana","omelette garbanzo","tortilla sin huevo"]],
 ["lentil_pasta_dry_generic","Pasta seca de lentejas, sin salsa","plant",25,57,2,10,80,"porción seca",["fideos de lentejas","pasta legumbres","pasta proteica vegetal"]],
 ["chickpea_pasta_dry_generic","Pasta seca de garbanzos, sin salsa","plant",21,58,5,9,80,"porción seca",["fideos de garbanzos","pasta garbanzo","pasta vegetal proteica"]],
 ["soy_yogurt_plain_generic","Yogur de soja natural sin azúcar, genérico","plant",4.5,3.2,2.3,0.6,125,"vaso de yogur",["yogur vegano","yogur de soja","yogurt vegetal"]],
 ["roasted_chickpeas_no_oil","Garbanzos tostados al horno sin aceite añadido","legumes",19,57,6,11,30,"puñado pequeño",["garbanzo tostado","snack de garbanzos","garbanzos crocantes"]]
];
const source="Estimación genérica por 100 g, NO representa una marca ni registro verificado en USDA/Argenfoods. El pan varía por formulación y humedad; comidas preparadas, pasta, tofu y legumbres varían por ingredientes, preparación, aceite, marca y peso antes/después de cocción. Verificar tabla o rótulo particular. No certifica ausencia de alérgenos ni aptitud para celiaquía.";
export const PLANT_BAKERY_FOODS=ROWS.map(([id,name,category,p,c,f,fi,servingGrams])=>({
 id,name,category,unit:"g",
 k:Math.round((p*4+c*4+f*9)*100)/10000,p:p/100,c:c/100,f:f/100,fi:fi/100,
 sourceType:"generic_estimate",validationStatus:"generico_pendiente",source,
 servingGrams
}));
export const PLANT_BAKERY_PORTIONS=Object.fromEntries(ROWS.map(r=>[r[0],{grams:r[7],label:r[8]}]));
export const PLANT_BAKERY_ALIASES=Object.fromEntries(ROWS.map(r=>[r[0],r[9]]));
export const PLANT_BAKERY_COUNT=ROWS.length;
