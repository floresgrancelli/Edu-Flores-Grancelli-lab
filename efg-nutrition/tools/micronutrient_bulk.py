"""Reviewed gap-only equivalents. Complete means an estimate exists, not a measurement."""
import json,hashlib,math
from micronutrient_afcd import load_afcd, COLUMNS

def load(root):
    d=root/'docs/micronutrients-bulk-20261114'
    m=json.loads((d/'manifest.json').read_text())
    for name,h in m['files'].items():
        if hashlib.sha256((d/name).read_bytes()).hexdigest()!=h:raise ValueError('Bulk evidence drift')
    return json.loads((d/'mappings.json').read_text())

def fill_bulk(root,foods,internal):
    data,_=load_afcd(root)
    applied={}
    for m in load(root):
        f=(internal if m['scope']=='internal' else foods)[m['target']]
        if f['sourceId']!=m['expectedSourceId']:raise ValueError('Bulk identity drift '+m['target'])
        row=data['rows'][m['code']]
        for key in m['nutrients']:
            if f['perUnit'][key] is not None:raise ValueError('Bulk cannot overwrite known values')
            col,header,unit=COLUMNS[key]
            if data['header'][col]!=header:raise ValueError('Bulk unit drift')
            v=row[col]
            if isinstance(v,bool) or not isinstance(v,(float,int)) or not math.isfinite(v) or v<0:raise ValueError('Unknown reference')
            f['perUnit'][key]=round(v*f.get('gramsPerMl',1)/100,10)
            p={'source':'FSANZ AFCD Release 3','sourceUrl':data['sourceUrl'],'foodCode':m['code'],'food':row[3],'sourceUnit':unit,'licenseUrl':data['licensing']['licenseUrl'],'note':'ESTIMACIÓN por referencia comparable. '+m['note'],'bulkEstimate':True}
            f.setdefault('nutrientProvenance',{})[key]=p
            applied.setdefault(m['target'],{})[key]=dict(p)
    nori=json.loads((root/'docs/micronutrients-nori-20261114/source.json').read_text())
    if 'ビタミンB12 39.6 μg' not in nori['pages']['0']['rows'] or internal['@nori']['perUnit']['b12'] is not None:raise ValueError('Nori B12 evidence drift')
    internal['@nori']['perUnit']['b12']=.396
    applied.setdefault('@nori',{})['b12']={'source':'MEXT 09003','sourceUrl':nori['pages']['0']['url'],'sourceUnit':'µg/100g','note':'ESTIMACIÓN de nori seco MEXT: 39,6 µg/100 g. Variabilidad importante entre productos; no garantiza aporte ni sustituye indicación de suplementación. Estudios de caracterización y ensayo humano respaldan presencia de B12 en determinados productos, no una concentración universal.','bulkEstimate':True}
    apply_recipes(root, foods, applied)
    mext=json.loads((root/'docs/micronutrients-bulk-20261114/mext.json').read_text())
    for fid,values in {'tempeh':{'ala':720,'epa':0,'dha':0},'mung_beans_cooked':{'ala':67}}.items():
        ref=mext[fid]
        if ref['weightGrams']!=100:raise ValueError('MEXT basis drift')
        for key,v in values.items():
            label={'ala':'18:3 n-3 α−リノレン酸','epa':'20:5 n-3 イコサペンタエン酸','dha':'22:6 n-3 ドコサヘキサエン酸'}[key]
            if not any(row.startswith(label+' ') and row.split()[-2].strip('()')==str(v) and row.endswith(' mg') for row in ref['rows']):raise ValueError('MEXT row mismatch')
            if foods[fid]['perUnit'][key] is not None:raise ValueError('MEXT cannot overwrite')
            foods[fid]['perUnit'][key]=v/100/(1000 if key=='ala' else 1)
            provenance={'source':'MEXT 2023','sourceUrl':ref['url'],'sourceUnit':'mg/100g','note':'ESTIMACIÓN de referencia MEXT del mismo alimento y estado. Paréntesis del mung indican valor estimado por la tabla, no análisis directo.','bulkEstimate':True}
            foods[fid].setdefault('nutrientProvenance',{})[key]=provenance
            applied.setdefault(fid,{})[key]=dict(provenance)
    ref=mext['chinchulines_grilled']
    if ref['weightGrams']!=100 or 'ビタミンB12 21.0 μg' not in ref['rows']:raise ValueError('Intestine B12 reference drift')
    f=foods['chinchulines_grilled']
    if f['perUnit']['b12'] is not None:raise ValueError('B12 overwrite')
    f['perUnit']['b12']=.21
    p={'source':'MEXT 11098','sourceUrl':ref['url'],'sourceUnit':'µg/100g','note':'ESTIMACIÓN de baja confianza: intestino delgado bovino crudo como equivalente de B12 de chinchulines. No corrige pérdida por cocción, limpieza ni concentración por pérdida de agua; el valor real a la parrilla puede diferir.','bulkEstimate':True}
    f.setdefault('nutrientProvenance',{})['b12']=p;applied.setdefault('chinchulines_grilled',{})['b12']=dict(p)
    return applied

def annotate_bulk(foods,internal,applied):
    allfoods={**internal,**foods};memo={}
    def refs(fid,key):
        if (fid,key) in memo:return memo[(fid,key)]
        f=allfoods[fid];result=[applied[fid][key]] if key in applied.get(fid,{}) else []
        parts=[p['id'] for p in f.get('ingredients',[])] or list(f.get('ingredientsByMass',{}))
        for i in parts:result+=refs(i,key)
        unique={json.dumps(p,sort_keys=True):p for p in result};memo[(fid,key)]=list(unique.values());return memo[(fid,key)]
    for fid,f in foods.items():
        changed=False
        for key in f['perUnit']:
            r=refs(fid,key)
            if not r:continue
            p=f.setdefault('nutrientProvenance',{}).setdefault(key,{'source':'recipe_components','note':'Estimación por ingredientes; mismas cantidades y rendimiento.'})
            p['bulkReferences']=r;changed=True
            p.setdefault('sourceUrl',r[0]['sourceUrl'])
            p['note']+=' Estimación orientativa: incluye equivalentes o recetas genéricas; algunas referencias son de baja confianza.'
        if changed:
            f['estimateConfidence']='orientativa'
            f['mappingNote']=f.get('mappingNote','')+' ESTIMACIÓN por equivalentes genéricos documentados; puede variar según especie, marca, receta y preparación. Datos orientativos, no análisis del alimento concreto.'
            f['mappingNote']=f['mappingNote'].replace('B12 y DHA del nori siguen pendientes.','B12 del nori estimada con MEXT y DHA con AFCD; variabilidad entre productos.')


def apply_recipes(root, foods, applied, drinks=False):
    data,_=load_afcd(root)
    recipes=json.loads((root/'docs/micronutrients-bulk-20261114/recipes.json').read_text())
    for m in recipes:
        if (m['scope']=='drink')!=drinks:continue
        f=foods[m['target']]
        if str(f['sourceId'])!=m['expectedSourceId'] or sum(m['parts'].values())!=100:raise ValueError('Recipe identity/basis drift')
        for key in m['nutrients']:
            if f['perUnit'][key] is not None:raise ValueError('Recipe overwrite')
            col,header,unit=COLUMNS[key]
            if data['header'][col]!=header:raise ValueError('Recipe column drift')
            vals=[(data['rows'][code][col],q) for code,q in m['parts'].items()]
            if not all(isinstance(v,(int,float)) and v>=0 for v,q in vals):raise ValueError('Missing recipe ingredient nutrient')
            f['perUnit'][key]=sum(v*q/10000 for v,q in vals)
            provenance={'source':'recipe_components','sourceUrl':data['sourceUrl'],'sourceUnit':unit,'licenseUrl':data['licensing']['licenseUrl'],'partsByGrams':m['parts'],'note':'ESTIMACIÓN por receta estándar de baja confianza. '+m['note'],'bulkEstimate':True}
            f.setdefault('nutrientProvenance',{})[key]=provenance
            applied.setdefault(m['target'],{})[key]=dict(provenance)
            if drinks:provenance['bulkReferences']=[dict(applied[m['target']][key])]


def complete_cake(root, foods, applied):
    data,_=load_afcd(root)
    model=json.loads((root/'docs/micronutrients-bulk-20261114/cake-equivalent.json').read_text())
    f=foods[model['target']]
    columns={'magnesium':64,'calcium':55,'iron':62,'zinc':75,'b12':93,'ala':209,'epa':222,'dha':229}
    expected={'magnesium':'Magnesium (Mg)','calcium':'Calcium (Ca)','iron':'Iron (Fe)','zinc':'Zinc (Zn)'}
    for key,col in columns.items():
        if key not in f.get('incompleteNutrients',[]):raise ValueError('Cake value no longer partial')
        if key in expected and not data['header'][col].startswith(expected[key]):raise ValueError('Cake mineral column mismatch')
        v=data['rows'][model['code']][col]
        if not isinstance(v,(int,float)) or v<0:raise ValueError('Cake missing source')
        f['perUnit'][key]=v/100
        p={'source':'FSANZ AFCD Release 3','sourceUrl':data['sourceUrl'],'foodCode':model['code'],'licenseUrl':data['licensing']['licenseUrl'],'note':'ESTIMACIÓN por referencia comparable de baja confianza. '+model['note'],'bulkEstimate':True}
        f.setdefault('nutrientProvenance',{})[key]=p;applied.setdefault('cake',{})[key]=dict(p)
    f['incompleteNutrients']=[]
    f['compositionOverrideNote']=model['note']
