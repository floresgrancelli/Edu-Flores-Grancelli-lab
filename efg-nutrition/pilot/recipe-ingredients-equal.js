// JSON structural equality: object key order is not part of JSONB identity.
// Array order, extra fields, types and numeric values remain significant.
export function sameRecipeIngredients(a,b){
 if(!Array.isArray(a)||!Array.isArray(b))return false;
 const same=(x,y)=>{
  if(x===y)return true;
  if(x===null||y===null||typeof x!==typeof y||typeof x!=='object')return false;
  if(Array.isArray(x)||Array.isArray(y))return Array.isArray(x)&&Array.isArray(y)&&x.length===y.length&&x.every((v,i)=>same(v,y[i]));
  const keys=Object.keys(x),other=Object.keys(y);
  return keys.length===other.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(y,k)&&same(x[k],y[k]));
 };
 return same(a,b);
}
