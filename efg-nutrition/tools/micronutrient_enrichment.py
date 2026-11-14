"""Fill documented gaps only; preserve independently known composition values."""
import json,gzip,hashlib,math

def enrich_catalog(root, foods, internal, definitions):
    folder=root/'docs/micronutrients-20261114'
    manifest=json.loads((folder/'enrichment-manifest.json').read_text())
    for name,digest in manifest['files'].items():
        if hashlib.sha256((folder/name).read_bytes()).hexdigest()!=digest:raise ValueError('Enrichment source drift: '+name)
    mappings=json.loads((folder/'enrichment-mappings.json').read_text())
    sara=json.loads((folder/'enrichment-sara-rows.json').read_text())
    usda={str(r['fdcId']):r for r in json.loads(gzip.decompress((folder/'enrichment-usda.json.gz').read_bytes()))}
    all_foods={**internal,**foods}
    def number(cell):
        if cell is None or not cell.strip():return None
        v=float(cell.strip().replace(',','.'))
        if not math.isfinite(v) or v<0:raise ValueError('Invalid table number')
        return v
    for fid,m in mappings.items():
        f=all_foods[fid]
        if fid in foods and (f['name']!=m['expectedName'] or f['unit']!=m['expectedUnit']):raise ValueError('Enrichment identity drift')
        candidates={};provenance={}
        if 'saraName'in m:
            row=sara[m['saraName']]
            for key,col in {'ala':11,'epa':13,'dha':14}.items():
                if 'macro' not in row:continue
                v=number(row['macro']['cells'][col])
                if v is not None:
                    candidates[key]=v*(1 if key=='ala' else 1000)
                    provenance[key]={'source':'SARA 2','food':m['saraName'],'page':row['macro']['page'],'sourceUnit':'g/100g','sourceUrl':manifest['saraUrl']+'#page='+str(row['macro']['page']),'note':m.get('note','Referencia genérica SARA 2')}
            # An explicitly printed 0 is unit-invariant; positive values stay withheld.
            if 'micro'in row and number(row['micro']['cells'][17])==0:
                candidates['b12']=0
                provenance['b12']={'source':'SARA 2','food':m['saraName'],'page':row['micro']['page'],'sourceUrl':manifest['saraUrl']+'#page='+str(row['micro']['page']),'note':'Cero explícitamente informado por la tabla; no deducido de una celda vacía. No se reinterpreta ningún valor positivo de la unidad ambigua.'}
        if 'usda'in m:
            u=m['usda'];r=usda[str(u['fdcId'])]
            for key in u['nutrients']:
                nid,unit,scale=definitions[key];found=[x for x in r['foodNutrients']if x['nutrient']['id']==nid]
                if len(found)>1:raise ValueError('Duplicate USDA nutrient')
                if found:
                    x=found[0];v=x.get('amount')
                    if x['nutrient']['unitName']!=unit:raise ValueError('USDA unit mismatch')
                    if isinstance(v,(int,float))and not isinstance(v,bool)and math.isfinite(v)and v>=0:
                        candidates[key]=v*scale;provenance[key]={'source':'USDA SR Legacy','fdcId':u['fdcId'],'food':r['description'],'sourceUnit':unit+'/100g','sourceUrl':'https://fdc.nal.usda.gov/food-details/'+str(u['fdcId'])+'/nutrients','note':u['note']}
        for key,v in candidates.items():
            if f['perUnit'][key] is not None:continue
            factor=f.get('gramsPerMl',1)/100
            f['perUnit'][key]=round(v*factor,10)
            f.setdefault('nutrientProvenance',{})[key]=provenance[key]
    done=set();visiting=set()
    def recompute(fid):
        if fid in done:return
        if fid in visiting:raise ValueError('Recipe cycle')
        visiting.add(fid);f=all_foods[fid]
        parts=f.get('ingredients') or [{'id':i,'quantity':q*100,'unit':'g'}for i,q in f.get('ingredientsByMass',{}).items()]
        if parts:
            for p in parts:recompute(p['id'])
            before_partial=set(f.get('incompleteNutrients',[]));partial=set(before_partial)
            for key in definitions:
                if f['perUnit'][key] is not None and key not in before_partial:continue
                known=[(all_foods[p['id']]['perUnit'][key],p['quantity'])for p in parts if all_foods[p['id']]['perUnit'][key]is not None]
                is_partial=len(known)<len(parts)or any(key in all_foods[p['id']].get('incompleteNutrients',[])for p in parts)or bool(f.get('unknownComponents'))
                v=round(sum(a*q for a,q in known)/f.get('yieldGrams',100)*f.get('gramsPerMl',1),10)if known else None
                if v is not None:
                    f['perUnit'][key]=v
                    f.setdefault('nutrientProvenance',{})[key]={'source':'recipe_components','note':'Recalculado al completar referencias de los ingredientes; mismas cantidades y rendimiento.','partial':is_partial}
                    if is_partial:partial.add(key)
                    else:partial.discard(key)
            if partial or 'incompleteNutrients'in f:f['incompleteNutrients']=sorted(partial)
        visiting.remove(fid);done.add(fid)
    for fid in foods:recompute(fid)
