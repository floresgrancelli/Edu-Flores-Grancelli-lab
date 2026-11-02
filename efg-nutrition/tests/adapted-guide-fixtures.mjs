// FICTIONAL rates and evidence ONLY. Never import into product/catalog/SQL.
export const now=Date.parse('2026-11-01T13:00:00Z');
const evidence={status:'verified',url:'https://fixture.invalid/not-a-real-source',
 observedAt:'2026-11-01T12:00:00Z',expiresAt:'2026-11-02T12:00:00Z'};
export function food(id,extra={}){
 const f={id,name:'FICTICIO '+id,unit:'g',k:2.23,p:.2,c:.02,f:.15,fi:.02,
  preparation:'fresh_unseasoned',...extra};
 f.composition={...evidence,id:'composition-'+id,foodId:id,unit:f.unit,
  preparation:f.preparation,productId:f.productId||null,
  perUnit:Object.fromEntries(['k','p','c','f','fi'].map(k=>[k,f[k]]))};
 f.glutenEvidence={...evidence,id:'gluten-'+id,foodId:id,verdict:'compatible',
  basis:'fresh_unseasoned',preparation:'fresh_unseasoned',conditions:['Sin agregados; revisar preparación.']};
 return f;
}
export const catalog=[food('fresh_a'),food('fresh_b'),food('preferred')];
export const goal={kcal:2230,protein_g:200,carb_g:20,fat_g:150,fiber_g:20};
export const template=['desayuno','media_manana','almuerzo','merienda','cena'].map(slot=>({slot,label:slot,
 groups:[{ids:['fresh_a','preferred'],qty:100},{ids:['fresh_b'],qty:100}]}));
export const context={now,restrictions:['gluten'],dislikedIds:[],
 pattern:{kind:'keto',coachConfirmed:true,maxCarbG:30}};
