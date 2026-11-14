from pathlib import Path
import json,re,hashlib,subprocess
root=Path('efg-nutrition');p=root/'pilot/micronutrient-catalog.js';s=p.read_text();base=json.loads(s[s.index('= ')+2:].strip().rstrip(';'))['foods'];src={str(r['fdcId']):r for r in json.loads((root/'docs/micronutrients-restaurants-20261114/new-usda-records.json').read_text())};data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {EXTRA_FOODS} from './efg-nutrition/pilot/food-catalog.js';import {RESTAURANT_MODELS,RESTAURANT_OFFICIAL} from './efg-nutrition/pilot/food-restaurants-20261114.js';import {DRINK_COMPONENTS} from './efg-nutrition/pilot/food-alcohol-20261114.js';console.log(JSON.stringify({foods:EXTRA_FOODS.filter(f=>f.restaurant||f.alcohol),models:RESTAURANT_MODELS,official:RESTAURANT_OFFICIAL,components:DRINK_COMPONENTS}));"],text=True));keys={'magnesium':1090,'calcium':1087,'iron':1089,'zinc':1095,'b12':1178,'ala':1404,'epa':1278,'dha':1272};captured={};refs={}
def usda(id):
 r=src[str(id)];captured[str(id)]=r;nums={n['nutrient']['id']:n['amount'] for n in r['foodNutrients']};return {'perUnit':{k:(nums[n]/100*(1000 if k in ['epa','dha'] else 1) if n in nums else None) for k,n in keys.items()},'sourceId':str(id),'sourceUrl':'https://fdc.nal.usda.gov/food-details/'+str(id)+'/nutrients','unit':'g','sourceDescription':r['description']}
refs['bacon']=usda(167914)
# Explicit generic equivalents; all liquid densities approximated at 1 g/ml.
ids={'beer':168746,'beer_light':168749,'beer_ipa':171906,'beer_stout':168746,'beer_wheat':168746,'red':173190,'white':174837,'rose':171908,'sweet_red':173176,'sweet_white':173176,'brut':174837,'demi':174837,'port':173176,'sherry':175112,'cider':174146,'whisky':174819,'bourbon':174819,'vodka':174818,'gin':174815,'rum':174817,'tequila':174815,'pisco':174815,'cachaca':174817,'cognac':174815,'coffee_liqueur':173665,'cream_liqueur':175098,'triple_sec':173168,'amaretto':173168,'peach_liqueur':173168,'cola':174852,'zero':174826,'lemon_soda':174846,'tonic':171869,'grapefruit_soda':174846,'ginger_beer':174846,'pineapple':169947,'cranberry':171903,'lime':168156,'cream':170859,'soda':174158,'bitters':174815,'fernet':174815,'gancia':173176,'campari':173176,'aperol':173176,'cynar':173176,'vermouth_red':173176,'vermouth_dry':175112}
for k,id in ids.items():refs['drink:'+k]=usda(id)
for k,id in {'orange':'orange_juice_raw_weight','lemon':'lemon_juice_raw_weight','sugar':'sugar','egg_white':'egg_white','strawberry':'strawberry','espresso':'coffee_black'}.items():refs['drink:'+k]={**base[id],'unit':'ml' if k!='sugar' else 'g'}
# Syrups are ingredient dilutions, not full-strength sugar/honey per ml.
for k,id,factor in [('syrup','sugar',.62),('honey_syrup','honey',.65),('grenadine','sugar',.65),('coconut_cream','milk_coconut_unsweet',1)]:
 refs['drink:'+k]={**base[id],'perUnit':{n:(v*factor if v is not None else None) for n,v in base[id]['perUnit'].items()},'mappingNote':'Equivalente orientativo para '+k+'; concentración supuesta '+str(factor)}
assert set(data['components'])=={k.removeprefix('drink:') for k in refs if k.startswith('drink:')}
from micronutrient_afcd import fill_afcd, load_afcd
fill_afcd(root, refs, drinks=True)
new={};models={r['key']:r for r in data['models']};modelsOut={}
def make(f,parts,yieldq,kind,note):
 per={};incomplete=[]
 for n in keys:
  per[n]=sum((ref['perUnit'].get(n) or 0)*q for ref,q,_ in parts)/yieldq
  if any(ref['perUnit'].get(n) is None or n in ref.get('incompleteNutrients',[]) for ref,_,_ in parts):
   incomplete.append(n)
   if all(ref['perUnit'].get(n) is None for ref,_,_ in parts):per[n]=None
 row=dict(name=f['name'],unit=f['unit'],perUnit=per,incompleteNutrients=incomplete,sourceId='estimated-'+f['id'],catalogSourceId=f.get('sourceId',''),sourceUrl=f['sourceUrl'],sourceDescription='Modelo orientativo por ingredientes y equivalentes genéricos USDA/SARA del catálogo',approximation=True,matchType=kind,mappingNote='ESTIMACIÓN DE MICRONUTRIENTES; no análisis ni tabla oficial de la cadena o marca. '+note+' Densidad de líquidos aproximada a 1 g/ml; rendimiento y dilución según modelo. Los componentes sin dato generan aporte parcial, no cero confirmado.',ingredients=[dict(id=id,quantity=q,sourceId=ref['sourceId'],sourceUrl=ref.get('sourceUrl',''),unit=ref['unit']) for ref,q,id in parts],yieldQuantity=yieldq)
 for n in keys:
  supplements=[(id,ref['nutrientProvenance'][n]) for ref,q,id in parts if ref.get('nutrientProvenance',{}).get(n,{}).get('source')=='FSANZ AFCD Release 3']
  if supplements:
   row.setdefault('nutrientProvenance',{})[n]={'source':'recipe_components','sourceUrl':supplements[0][1]['sourceUrl'],'note':'Aportes estimados completados con FSANZ AFCD 3 (Australia) para '+', '.join(id for id,p in supplements)+'. Equivalentes genéricos, no formulaciones de marca.','partial':n in incomplete}
 for n in keys:
  nori=[ref['nutrientProvenance'][n] for ref,q,id in parts if ref.get('nutrientProvenance',{}).get(n,{}).get('supplementalSource')=='MEXT-09003-dried']
  if nori:
   previous=row.setdefault('nutrientProvenance',{}).get(n,{}).get('note','')
   row['nutrientProvenance'][n]={'source':'recipe_components','sourceUrl':nori[0]['sourceUrl'],'note':previous+' Incluye aporte de nori seco MEXT 09003 (Japón) a través de las piezas del modelo; no tabla oficial de la cadena.','partial':n in incomplete,'supplementalSource':'MEXT-09003-dried'}
 new[f['id']]=row
for f in data['foods']:
 if f.get('alcohol'):
  parts=[(refs['drink:'+id],q,id) for id,q in f['recipeParts'].items()]
  make(f,parts,f['servingMl'],'cocktail_ingredient_estimate','Proporciones del cóctel del catálogo. Aperitivos, licores y destilados sin referencia específica usan equivalentes genéricos; no reproducen formulaciones de marca.')
 else:
  if 'recipeParts' in f:
   model=models[f['id'][5:]];quantities=model['parts'];den=model['portion'];note=model['note'];kind='restaurant_ingredient_estimate'
  else:
   # Independently declared micronutrient proxies, never overwriting official macros.
   id=f['id'];kind='restaurant_generic_equivalent';den=100
   if 'side_salad' in id:quantities={'lettuce':60,'tomato':40}
   elif 'pileta_de_cheddar' in id:quantities={'cheddar':100}
   elif 'papas' in id:
    quantities={'papas_fritas':80,'cheddar':20} if 'cheddar' in id else {'papas_fritas':100}
    if 'bacon' in id:quantities={'papas_fritas':75,'cheddar':15,'bacon':10}
   elif 'pure_de_frutas' in id:quantities={'fruit_salad_basic':100}
   elif 'yogur' in id:quantities={'yogurt':100}
   elif 'mcnuggets' in id:quantities={'nuggets_pollo_fritos':100}
   elif 'mccrispy' in id:quantities={'milanesa_chicken_fried':50,'bread_white':30,'cheddar':15,'bacon':5} if 'bacon' in id else {'milanesa_chicken_fried':60,'bread_white':30,'lettuce':5,'tomato':5}
   elif any(w in id for w in ['cono','mcflurry','sundae']):quantities={'helado_dulce_leche' if 'dulce_de_leche' in id else 'helado_chocolate' if 'chocolate' in id else 'helado_crema':100}
   else:quantities={'homemade_burger':50,'bread_white':35,'cheddar':15} if 'queso' in id or 'cheddar' in id or 'mac' in id or 'cuarto' in id or 'tasty' in id else {'homemade_burger':60,'bread_white':40}
   note='Equivalente genérico independiente de '+str(quantities)+'. Para helados no modela coberturas ni cono; para hamburguesas no reproduce proporciones exactas, salsas o fortificación. Calorías y macros oficiales se conservan.'
   modelsOut[id]={'parts':quantities,'yield':den,'note':note}
  parts=[(base.get(id) or refs[id],q,id) for id,q in quantities.items()];make(f,parts,den,kind,note)
D=root/'docs/micronutrients-restaurants-20261114';D.mkdir(exist_ok=True)
(D/'new-usda-records.json').write_text(json.dumps(list(captured.values()),ensure_ascii=False,separators=(',',':'))+'\n')
(D/'equivalent-models.json').write_text(json.dumps({'drinkReferences':refs,'restaurantEquivalents':modelsOut,'additionalDataLicenses':[load_afcd(root)[0]['licensing']]},ensure_ascii=False,indent=2)+'\n')
body=json.dumps(new,ensure_ascii=False,separators=(',',':'));version='ncc-micro-'+hashlib.sha256(body.encode()).hexdigest()[:16]
(root/'pilot/micronutrient-expanded-catalog.js').write_text('import {MICRONUTRIENT_CATALOG as base} from "./micronutrient-catalog.js?v=ncc-micro-nori-r1-20261114";\nexport const NEW_MICRONUTRIENT_ESTIMATES='+body+';\nexport const MICRONUTRIENT_CATALOG={...base,version:"'+version+'",foodCount:base.foodCount+Object.keys(NEW_MICRONUTRIENT_ESTIMATES).length,foods:{...base.foods,...NEW_MICRONUTRIENT_ESTIMATES}};\n')
(D/'README.md').write_text('Se añaden 235 perfiles estimados: 161 platos de cadenas y 74 bebidas. Nueve combos de sushi usan las mezclas ya declaradas, por combo completo y fracciones. Los 618 perfiles anteriores se conservan.\n\nLos modelos reutilizan las composiciones congeladas USDA/SARA de ingredientes; se conservan capturas nuevas USDA SR Legacy en new-usda-records.json y correspondencias en equivalent-models.json. Fuente: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip. SHA256 del archivo original: 0fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef.\n\nDensidades líquidas supuestas a 1 g/ml. Licores y aperitivos sin referencia específica usan equivalentes; no son análisis de marca. McDonald’s conserva sus macros oficiales y recibe aproximaciones de micronutrientes por equivalente genérico, con limitaciones detalladas en cada perfil. Conos/coberturas y salsas no se modelan en los equivalentes de helado. Los faltantes se marcan como parciales, no como cero. No se cambian metas ni recomendaciones diarias.\n')
print('Generated',len(new),'profiles,',len(captured),'new frozen reference records',version)
