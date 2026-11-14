"""Add reviewed approximations without changing existing food composition.
Sources and recipe assumptions are frozen alongside the generated catalog.
Missing ingredients produce partial sums, never fictitious zero contributions.
"""
import gzip
import hashlib
import json
import math


def complete_catalog(root, catalog, foods, nutrient_definitions):
    folder = root / 'docs/micronutrients-20261114'
    manifest = json.loads((folder / 'completion-manifest.json').read_text())
    for name, digest in manifest['files'].items():
        if hashlib.sha256((folder / name).read_bytes()).hexdigest() != digest:
            raise ValueError('Completion source hash mismatch: ' + name)
    plan = json.loads((folder / 'completion-models.json').read_text())
    records = {str(r['fdcId']): r for r in json.loads(gzip.decompress((folder / 'completion-usda.json.gz').read_bytes()))}
    sara = json.loads((folder / 'completion-sara-rows.json').read_text())
    tables = json.loads((folder / 'completion-reviewed-tables.json').read_text())
    keys = list(nutrient_definitions)
    cache, visiting = {}, set()

    def valid(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0

    def table_number(cell):
        if cell is None or not cell.strip(): return None
        try: result = float(cell.strip().replace(',', '.'))
        except ValueError: raise ValueError('Unexpected SARA numeric cell: ' + cell)
        if not valid(result): raise ValueError('Invalid SARA numeric value')
        return result

    def source(model):
        values = dict.fromkeys(keys)
        if 'fdcId' in model:
            record = records[str(model['fdcId'])]
            for key, (nid, unit, scale) in nutrient_definitions.items():
                found = [n for n in record['foodNutrients'] if n['nutrient']['id'] == nid]
                if len(found) > 1: raise ValueError('Duplicate USDA nutrient')
                if found:
                    n = found[0]
                    if n['nutrient']['unitName'] != unit: raise ValueError('USDA unit mismatch')
                    if valid(n.get('amount')): values[key] = n['amount'] * scale
            sid = str(record['fdcId'])
            metadata = {'sourceId': sid, 'sourceUrl': 'https://fdc.nal.usda.gov/food-details/'+sid+'/nutrients', 'sourceDescription': record['description'], 'capturePath': 'docs/micronutrients-20261114/completion-usda.json.gz'}
        elif 'saraName' in model:
            name = model['saraName']; row = sara[name]
            for key, column in {'calcium':4,'iron':7,'magnesium':8,'zinc':9}.items():
                if 'micro' in row: values[key] = table_number(row['micro']['cells'][column])
            for key, column in {'ala':11,'epa':13,'dha':14}.items():
                if 'macro' in row:
                    v = table_number(row['macro']['cells'][column])
                    if v is not None: values[key] = v * (1 if key == 'ala' else 1000)
            metadata = {'sourceId': 'SARA2-'+name, 'sourceUrl':manifest['sara']['url'], 'sourceDescription':name, 'capturePath':'docs/micronutrients-20261114/completion-sara-rows.json', 'sourcePages':{k:v['page'] for k,v in row.items()}, 'withheld':{'b12':'Printed SARA B12 unit mg is ambiguous; no µg reinterpretation.'}}
        elif 'tableId' in model:
            row = tables[model['tableId']]; values.update(row['per100g'])
            metadata = {k:row[k] for k in ['sourceId','sourceUrl','sourceDescription']}
            metadata['capturePath'] = 'docs/micronutrients-20261114/completion-reviewed-tables.json'
        elif 'unknownReason' in model:
            metadata = {'sourceId':'unknown','sourceUrl':'','sourceDescription':model['unknownReason']}
        else: raise ValueError('Unknown source model')
        return {'unit':'g','perUnit':{k:None if v is None else v/100 for k,v in values.items()},'incompleteNutrients':[], **metadata}

    def build(fid):
        if fid in foods: return foods[fid]
        if fid in cache: return cache[fid]
        if fid in visiting: raise ValueError('Recipe cycle: '+fid)
        visiting.add(fid)
        if fid.startswith('@'):
            value = source(plan['ingredients'][fid]); cache[fid] = value; visiting.remove(fid); return value
        model = plan['models'][fid]; food = catalog['foods'][fid]
        if food['name'] != model['expectedName'] or food['unit'] != model['expectedUnit']:
            raise ValueError('Reviewed completion mapping drift: '+fid)
        density = model.get('gramsPerMl', 1)
        if food['unit'] not in ('g','ml') or food['unit']=='ml' and 'gramsPerMl' not in model or not valid(density) or density <= 0:
            raise ValueError('Missing native-unit conversion: '+fid)
        if 'ingredientQuantities' in model:
            quantities = model['ingredientQuantities']; yield_grams = model['yieldGrams']
            if not valid(yield_grams) or yield_grams <= 0 or not quantities: raise ValueError('Invalid recipe yield')
            inputs = {}
            for ingredient, quantity in quantities.items():
                if not valid(quantity) or quantity <= 0: raise ValueError('Invalid ingredient quantity')
                inputs[ingredient] = build(ingredient)
            values, incomplete = {}, []
            for key in keys:
                known = [(inputs[i]['perUnit'][key],q) for i,q in quantities.items() if inputs[i]['perUnit'][key] is not None]
                partial = len(known) < len(quantities) or any(key in p.get('incompleteNutrients',[]) for p in inputs.values()) or bool(model.get('unknownComponents'))
                values[key] = round(sum(v*q for v,q in known)/yield_grams*density,10) if known else None
                if partial and known: incomplete.append(key)
            value = {'sourceId':'standard-recipe-'+fid, 'sourceUrl':'', 'sourceDescription':'Explicit approximate recipe; frozen component references', 'perUnit':values, 'incompleteNutrients':incomplete, 'ingredients':[{ 'id':i,'quantity':q,'unit':inputs[i]['unit']} for i,q in quantities.items()], 'yieldGrams':yield_grams, 'unknownComponents':model.get('unknownComponents',[]), 'capturePath':'docs/micronutrients-20261114/completion-models.json'}
        else:
            value = source(model)
            value['perUnit'] = {k:None if v is None else round(v*density,10) for k,v in value['perUnit'].items()}
        value.update({'name':food['name'],'unit':food['unit'],'catalogSourceId':str(food.get('sourceId','')), 'matchType':model['kind'],'mappingNote':model['note'],'approximation':True})
        if food['unit']=='ml': value['gramsPerMl'] = density
        if not any(v is not None for v in value['perUnit'].values()): raise ValueError('Food lacks all nutrient estimates: '+fid)
        foods[fid] = value; cache[fid] = value; visiting.remove(fid)
        return value

    overlap = set(foods) & set(plan['models'])
    if overlap: raise ValueError('Completion must not overwrite previous profiles: '+str(overlap))
    for fid in sorted(plan['models']): build(fid)
    if set(foods) != set(catalog['foods']): raise ValueError('Incomplete catalog identity coverage')

    return cache
