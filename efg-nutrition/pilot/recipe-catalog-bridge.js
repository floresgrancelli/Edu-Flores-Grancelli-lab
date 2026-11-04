// Read-only projection: canonical foods plus Fit and account-owned recipes.
const keys=['k','p','c','f','fi'];
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x);
const validPortions=x=>Number.isInteger(x)&&x>=1&&x<=50;
function entry(id,name,parts,portions,totals,privateRecipe=false,pendingLocal=false,metadata={}){
 if(typeof name!=='string'||!name.trim()||name.length>140||!validPortions(portions)||
  !parts.length||!keys.every(k=>number(totals?.[k])))return null;
 return {id,name:name.trim(),category:'recipe',unit:'porción',
  ...Object.fromEntries(keys.map(k=>[k,totals[k]/portions])),
  recipeIngredients:parts,recipeBatchPortions:portions,privateRecipe,pendingLocal,
  ...(privateRecipe?{ownerStudentId:metadata.ownerStudentId}:{}),
  sourceType:'recipe_estimate',validationStatus:'estimado',
  source:privateRecipe?'Receta propia calculada al guardarla según ingredientes':'Receta Fit estimada según ingredientes del catálogo'};
}
export function recipeCatalogEntries({foods=[],fitRecipes=[],personalRecipes=[],userId=null}={}){
 if(!Array.isArray(foods)||!Array.isArray(fitRecipes)||!Array.isArray(personalRecipes))
  throw Error('Fuentes de recetas inválidas.');
 const base=new Map(foods.filter(f=>f&&validId(f.id)).map(f=>[f.id,f]));
 const seen=new Set(base.keys()),out=[];
 const add=x=>{if(x&&!seen.has(x.id)){out.push(x);seen.add(x.id);}};
 for(const recipe of fitRecipes){
  if(!validId(recipe?.id)||!validPortions(recipe?.portions)||!Array.isArray(recipe.ingredients))continue;
  const parts=recipe.ingredients.map(x=>({foodId:x?.[0],grams:x?.[1]}));
  if(!parts.length||parts.some(x=>!validId(x.foodId)||!number(x.grams)||x.grams<=0||!base.has(x.foodId)))continue;
  const totals=Object.fromEntries(keys.map(k=>[k,parts.reduce((v,x)=>v+Number(base.get(x.foodId)[k])*x.grams,0)]));
  add(entry('fit-recipe:'+recipe.id,recipe.name,parts,recipe.portions,totals));
 }
 // Personal recipes must already be RLS/user scoped by the caller. No identity -> none.
 if(!userId)return out;
 for(const recipe of personalRecipes){
  if(!validId(recipe?.id)||!validPortions(Number(recipe?.portions))||!Array.isArray(recipe.ingredients))continue;
  const parts=recipe.ingredients.map(x=>({foodId:x?.foodId,grams:Number(x?.grams)}));
  if(!parts.length||parts.some(x=>!validId(x.foodId)||!number(x.grams)||x.grams<=0||!base.has(x.foodId)))continue;
  const totals=Object.fromEntries(keys.map(k=>[k,Number(recipe?.totals?.[k]??0)]));
  add(entry('custom-recipe:'+recipe.id,recipe.name,parts,Number(recipe.portions),
    totals,true,recipe.pendingLocal===true,{ownerStudentId:userId}));
 }
 return out;
}
