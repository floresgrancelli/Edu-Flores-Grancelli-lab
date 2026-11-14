// One deterministic release snapshot of the exact food catalog used by the PWA.
// This is composition/provenance, never an independent nutritional approval.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {EXTRA_FOODS} from '../pilot/food-catalog.js';
import {applyRecipeModels} from '../pilot/recipe-models.js';
import {applyRegionalCompositeModels} from '../pilot/regional-composite-models.js';
const root=new URL('../',import.meta.url);
export function exportGuideCatalog(){
 const app=readFileSync(new URL('pilot/pilot.js',root),'utf8');
 const match=app.match(/const foods=\[([\s\S]*?)\]\.concat\(EXTRA_FOODS\)/);
 if(!match)throw Error('The mounted PWA food catalog moved; do not guess a replacement.');
 const foods=JSON.parse(JSON.stringify(runInNewContext('['+match[1]+']'))).concat(structuredClone(EXTRA_FOODS.filter(f=>!f.diaryOnly)));
 applyRecipeModels(foods);applyRegionalCompositeModels(foods);
 const rows={};
 for(const food of foods){
  const {id,name,unit}=food;
  if(!/^[\p{L}\p{N}_-]{1,100}$/u.test(id)||Object.hasOwn(rows,id)||!['g','ml'].includes(unit))throw Error('Invalid/duplicate catalog identity '+id);
  const rates=Object.fromEntries(['k','p','c','f','fi'].map(k=>[k,food[k]]));
  if(Object.entries(rates).some(([k,n])=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>(k==='k'?12:1)))throw Error('Invalid catalog composition '+id);
  const sourceType=food.sourceType||(id==='cake'?'recipe_estimate':food.sourceId?'usda_fdc':'generic_estimate');
  const validationStatus=food.validationStatus||(id==='cake'?'receta_estimado':food.sourceId?'referencia_pendiente_confirmacion':'generico_pendiente');
  const sourceId=String(food.sourceId||'').slice(0,120);
  const sourceUrl=/^https:\/\//.test(food.sourceUrl||'')?food.sourceUrl:
   sourceType==='usda_fdc'&&/^\d+$/.test(sourceId)?'https://fdc.nal.usda.gov/food-details/'+sourceId+'/nutrients':'';
  rows[id]={id,name:String(name).slice(0,200),unit,...rates,sourceType,sourceId,sourceUrl,
   validationStatus,source:String(food.source||'').slice(0,1600),
   dataQuality:validationStatus==='tabla_referenciada'?'referenced':sourceType==='manufacturer_label'?'label':'estimated'};
 }
 const ordered=Object.fromEntries(Object.entries(rows).sort(([a],[b])=>a.localeCompare(b,'en')));
 const digest=createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
 return {version:'ncc-catalog-'+digest.slice(0,16),sha256:digest,foods:ordered};
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 const data=exportGuideCatalog();mkdirSync(new URL('catalog/',root),{recursive:true});
 writeFileSync(new URL('catalog/guide-catalog.json',root),JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({version:data.version,foods:Object.keys(data.foods).length,estimated:Object.values(data.foods).filter(f=>f.dataQuality==='estimated').length}));
}
