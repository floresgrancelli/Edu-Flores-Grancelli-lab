// Resize the recorded portion; never re-read today's catalog or change its composition.
export function resizeDiaryFood(item,quantity){
 const units=Number(item?.displayQty)>0;
 const previous=Number(units?item.displayQty:item?.qty),next=Number(quantity);
 const grams=Number(item?.qty)*next/previous;
 const max=item?.unit==='porción'?20:5000;
 if(!Number.isFinite(previous)||previous<=0||!Number.isFinite(next)||next<=0||
    !Number.isFinite(grams)||grams<=0||grams>max||(units&&(!Number.isInteger(next)||next>100)))
  throw Error('Revisá la cantidad: debe ser mayor que cero y respetar la unidad del alimento.');
 const ratio=next/previous,out={...item,qty:grams};
 for(const key of ['k','p','c','f','fi']){
  const value=Number(item[key]??0);
  if(!Number.isFinite(value)||value<0)throw Error('Este registro no tiene una composición válida para editar.');
  out[key]=Math.round(value*ratio*100)/100;
 }
 if(units)out.displayQty=next;
 // Recipe ingredient arrays describe the recipe per serving, not the consumed total.
 // Personalized drink objects describe the actual glass and must scale with it.
 if(item.ingredients&&!Array.isArray(item.ingredients)){
  out.ingredients={...item.ingredients};
  for(const key of ['milk_ml','sugar_g'])if(Number.isFinite(item.ingredients[key]))out.ingredients[key]=item.ingredients[key]*ratio;
  out.name=String(item.name).split(' · ')[0]+' · mezcla personalizada';
  out.source='Bebida personalizada: '+grams+' ml; leche '+(out.ingredients.milk_ml||0)+' ml; azúcar '+(out.ingredients.sugar_g||0)+' g. Misma proporción del registro original; valores estimados.';
 }
 return out;
}
