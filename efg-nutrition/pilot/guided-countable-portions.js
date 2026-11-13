// Explicit standalone, countable foods. Catalog equivalences remain authoritative.
// Do not infer units from names: scoops, bowls, recipe servings and handfuls stay
// divisible. Recipe components retain their exact ingredient quantities.
import {FOOD_UNIT_PORTIONS} from './food-catalog.js?v=ncc-catalog-batch-two-r1-20261113';
// Practical per-meal counts, not clinical limits. Bread allows two real slices
// (60 g), instead of the former 50 g ceiling that produced 1.67 slices.
const wholeFoods=Object.freeze(Object.fromEntries(Object.entries({
 egg:3,egg_boiled:3,egg_white:8,egg_quail:20,huevo_frito:3,huevo_frito_fritolim:3,
 bread:2,bread_white:2,bread_rye:2,pan_lactal:2,pan_lactal_integral:2,
 bread_glutenfree:2,toast_whole:4,toast_glutenfree:4,rice_cakes:6,tortilla_wheat:2,
 cheese:2,ham_cooked:6,mozzarella:4,
 apple:1,banana:1,mandarin:2,orange:1,pear:1,kiwi:2,strawberry:20,
 peach:1,plum:3,grapefruit:1,lemon:3,mango:1,
 walnuts:12,almonds:40,cashews:30,olives:20,dates:8,hazelnuts:40,pecans:20,brazil_nuts:12,
 medialuna_butter:2,medialuna_fat:2,chipa:3,alfajor_chocolate:1,alfajor_maicena:1,
 tostado_ham_cheese:2,sandwich_miga_ham_cheese:2,barrita_cereal:2,protein_bar_generic:2,
 empanada_beef_baked:3,empanada_chicken_baked:3,empanada_ham_cheese:3,
 empanada_caprese:3,empanada_vegetable:3,empanada_corn:3,
 // Audit of all catalog unit equivalences, including expansion/manufacturer IDs.
 empanada_atun_horno:3,empanada_verdura_horno:3,empanada_jamon_queso_horno:3,
 empanada_humita_horno:3,empanada_carne_horno_extra:3,
 chorizo_cooked:3,morcilla_cooked:3,zapallito_relleno_carne:2,
 milanesa_chicken_baked:2,milanesa_beef_baked:2,milanesa_chicken_fried:2,
 milanesa_beef_fried:2,milanesa_soy_gobinda:3,
 sushi_maki_salmon:14,sushi_maki_atun:14,sushi_maki_vegetal:15,
 sushi_california:13,sushi_philadelphia:12,sushi_spicy_tuna:12,sushi_ebi:13,
 sushi_nigiri_salmon:11,sushi_nigiri_atun:11,sushi_nigiri_langostino:11,
 sushi_sashimi_salmon:18,sushi_sashimi_atun:18,sushi_temaki_salmon:3,
 sushi_hot_roll:10,sushi_uramaki_palta:12,sushi_gunkan:10,
 calzone_jamon_queso:1,hamburguesa_completa:1,hamburguesa_doble:1,
 nuggets_pollo_fritos:18,pancho_completo:2,tostado_jamon_queso:2,
 sandwich_milanesa:1,arrollado_primavera:8,
 helado_palito_agua:2,helado_palito_crema:2,
 chocolate_relleno_ddl:4,bombon_chocolate:8,barrita_chocolate_oblea:2,
 alfajor_chocolate_triple:1,alfajor_ddl:1,gomitas_frutales:10,gomitas_acidas:8,
 caramelos_duros:8,chupetin_dulce:2,malvaviscos:5,pastillas_menta:10,
 factura_medialuna_manteca:2,factura_vigilante:2,factura_bola_fraile:2,
 factura_churro_relleno:2,factura_donut:2,
 galletitas_chocolate:5,galletitas_rellenas:5,galletitas_agua:7,
 tostada_pan_miga:2,barrita_cereal_choco:2,pan_mignon_panaderia:2,pan_campo_panaderia:2,
 black_bean_burger_home:3,soy_tvp_burger_home:3,chickpea_omelette_home:3,
 arcor_mini_alfajor_aguila_chocolate:2,arcor_chocolate_aguila_familiar:2,arcor_bon_o_bon_blanco:3,
 medallon_pescado_simple:3,medallon_pescado_rebozado:3,medallon_salmon_simple:3,
 medallon_pollo_simple:3,medallon_pollo_rebozado:3,medallon_pollo_espinaca:3,
 medallon_cerdo_simple:3,medallon_cerdo_rebozado:3,medallon_cerdo_vegetales:3
}).map(([id,maxUnits])=>[id,Object.freeze({minUnits:1,maxUnits})])));
export function guidedCountablePortion(id){
 if(!Object.hasOwn(wholeFoods,id))return null;
 const rule=wholeFoods[id];
 const grams=FOOD_UNIT_PORTIONS[id]?.grams;
 if(!Number.isFinite(grams)||grams<=0)throw Error('Falta la equivalencia de la unidad contable.');
 return {grams,min:rule.minUnits*grams,max:rule.maxUnits*grams,
  preserveCount:['egg','egg_boiled','egg_white','egg_quail','huevo_frito','huevo_frito_fritolim'].includes(id)};
}
export function normalizeGuidedCountableQuantity(item){
 if(item?.recipeComponent===true)return item.qty;
 const rule=guidedCountablePortion(item?.id);if(!rule)return item.qty;
 if(item.unit&&item.unit!=='g')throw Error('La unidad del alimento contable no coincide con su ficha en gramos.');
 const qty=Number(item.qty);
 if(!Number.isFinite(qty))throw Error('La cantidad del alimento contable es inválida.');
 const normalized=Math.max(rule.min,Math.min(rule.max,Math.round(Math.round(qty/rule.grams)*rule.grams*1e8)/1e8));
 if(item.locked===true&&Math.abs(normalized-qty)>1e-8)
  throw Error('La cantidad fijada de '+String(item.name||item.id)+' necesita unidades enteras. Revisala antes de recalcular; no se modificó automáticamente.');
 return normalized;
}
