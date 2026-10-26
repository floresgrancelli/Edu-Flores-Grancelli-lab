
import assert from "node:assert/strict";
import {readFile, writeFile} from "node:fs/promises";
import vm from "node:vm";
const base=new URL("./",import.meta.url);
const catalogText=await readFile(new URL("./food-catalog.js",base),"utf8");
const pilotText=await readFile(new URL("./pilot.js",base),"utf8");
const imported=await import("data:text/javascript;base64,"+Buffer.from(catalogText).toString("base64"));
const start=pilotText.indexOf("const foods=[");
const end=pilotText.indexOf("].concat(EXTRA_FOODS);",start);
assert.ok(start>=0 && end>start,"Formato de alimentos principales no reconocido");
const mainArray=pilotText.slice(start+"const foods=".length,end+1);
const primary=vm.runInNewContext(mainArray,{});
const all=[...primary,...imported.EXTRA_FOODS].map(food=>({
 ...food,category:food.category||imported.LEGACY_CATEGORIES[food.id]||"extra",
 sourceType:food.sourceType||(food.id==="cake"?"recipe_estimate":"generic_estimate"),
 validationStatus:food.validationStatus||(food.id==="cake"?"receta_estimado":"generico_pendiente")
}));
const seen=new Set();
const rows=[];
const escape=(s)=>'"'+String(s??"").replaceAll('"','""').replaceAll(/\s+/g," ").trim()+'"';
function risk(food){
 const flags=[];
 if(!food.source)flags.push("SIN_NOTA_ORIGEN");
 if(!food.sourceId && /usda/i.test(food.source||"")) flags.push("REFERENCIA_SIN_ID");
 if(food.validationStatus==="generico_pendiente")flags.push("SIN_TABLA_TRAZABLE");
 if(["prepared","dessert","bakery","recipe"].includes(food.category)&&food.validationStatus==="generico_pendiente")flags.push("RECETA_VARIABLE");
 if(/(crudo|cocido|cocida|seco|seca|al horno|hervid|frito|frita)/i.test(food.name))flags.push("VERIFICAR_ESTADO_Y_RENDIMIENTO");
 if(food.validationStatus==="rotulo_fotografiado")flags.push("VERIFICAR_ETIQUETA_VIGENTE");
 if(food.validationStatus==="tabla_convertida_densidad")flags.push("CONVERSION_G_ML_APROX");
 if(food.sourceType==="usda_fdc")flags.push("CONFIRMAR_FDC_ID_EN_USDA_OFICIAL");
 if(food.id==="cake")flags.push("RENDIMIENTO_RECETA_VARIABLE");
 if(food.sourceType==="generic_estimate" && /(protein|whey|light|sin azúcar|zero)/i.test(food.name))flags.push("VERIFICAR_COMPOSICION_DE_MARCA");
 if(["coffee_milk","coffee_cortado","tea_milk","mate_cocido_milk"].includes(food.id))flags.push("SOLO_BASE_INFUSION_EDITAR_LECHE");
 if(["p","c","f","fi","k"].some(k=>!Number.isFinite(food[k])||food[k]<0))flags.push("ERROR_NUMERICO");
 const atwater=400*food.p+400*food.c+900*food.f;
 if(Math.abs(food.k*100-atwater)>40 && food.validationStatus==="generico_pendiente") flags.push("REVISAR_ENERGIA_VS_MACROS");
 return flags;
}
for(const f of all){
 assert.ok(f.id&&!seen.has(f.id),"ID duplicado: "+f.id);
 seen.add(f.id);
 const flags=risk(f);
 const status=f.validationStatus==="generico_pendiente"?"ESTIMACION_PENDIENTE_DE_FUENTE":f.validationStatus==="rotulo_fotografiado"?"ETIQUETA_VERIFICADA_VISUALMENTE":f.validationStatus==="receta_estimado"?"RECETA_ESTIMADA":f.validationStatus==="tabla_convertida_densidad"?"TABLA_Y_CONVERSION_PENDIENTE_DE_COTEJO_OFICIAL":f.validationStatus==="tabla_parcial_fibra_pendiente"?"TABLA_PARCIAL_FIBRA_PENDIENTE":"TABLA_REFERENCIADA_PENDIENTE_DE_COTEJO_OFICIAL";
 rows.push([f.id,f.name,f.category,f.unit||"g",status,f.sourceType,f.sourceId||"",f.validationStatus,+(f.k*100).toFixed(3),+(f.p*100).toFixed(3),+(f.c*100).toFixed(3),+(f.f*100).toFixed(3),+(f.fi*100).toFixed(3),+((f.k*100)-(400*f.p+400*f.c+900*f.f)).toFixed(2),flags.join(";"),f.source||""]);
}
const header=["id","alimento","categoria","unidad","estado_auditoria","tipo_fuente","fdc_id","estado_original","kcal_100","proteinas_100","hidratos_100","grasas_100","fibra_100","diferencia_4_4_9_kcal_100","alertas","descripcion_fuente"];
const csv=[header.map(escape).join(","),...rows.map(r=>r.map(escape).join(","))].join("\n")+"\n";
await writeFile(new URL("./FOOD_CATALOG_AUDIT_2026-10-26.csv",base),csv,"utf8");
const byStatus={};const byCategory={};for(const x of rows){byStatus[x[4]]=(byStatus[x[4]]||0)+1;byCategory[x[2]]=(byCategory[x[2]]||0)+1}
console.log(JSON.stringify({count:rows.length,uniqueIds:seen.size,byStatus,byCategory,critical:rows.filter(x=>x[14].includes("ERROR_NUMERICO")).map(x=>x[0]),schema:"No cambia datos privados ni números de alimentos"}));
