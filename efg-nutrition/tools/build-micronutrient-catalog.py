"""Offline exact-ID projection of existing USDA captures; no guessed food matching."""
from pathlib import Path
import hashlib
import json
import math
import zipfile
import gzip

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATHS = [
    'docs/catalog-batch-20261113/source-records.json',
    'docs/catalog-batch-two-20261113/source-records.json',
    'docs/p29x-review/usda-four-raw.json',
    'tests/evidence/fdc-additional-five-20261101.json',
]
NUTRIENTS = {
    'magnesium': (1090, 'mg', 1), 'calcium': (1087, 'mg', 1),
    'iron': (1089, 'mg', 1), 'zinc': (1095, 'mg', 1),
    'b12': (1178, 'µg', 1), 'ala': (1404, 'g', 1),
    'epa': (1278, 'g', 1000), 'dha': (1272, 'g', 1000),
}
records = {}
def add(record, origin):
    fid = str(record.get('fdcId', ''))
    if not fid.isdigit() or not isinstance(record.get('foodNutrients'), list):
        raise ValueError('Invalid raw USDA record')
    canonical = json.dumps(record, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
    # Prefer the first frozen capture; record the precise bytes used.
    if fid not in records:
        records[fid] = (record, origin, hashlib.sha256(canonical.encode()).hexdigest())

for relative in SOURCE_PATHS:
    data = json.loads((ROOT / relative).read_text())
    for row in data if isinstance(data, list) else data['records']:
        record = json.loads(row['rawJSON']) if 'rawJSON' in row else row
        add(record, relative)
with zipfile.ZipFile(ROOT / 'tests/evidence/fdc-official-20261101.zip') as archive:
    for name in sorted(archive.namelist()):
        if name.endswith('.json') and name != 'manifest.json':
            add(json.loads(archive.read(name)), 'tests/evidence/fdc-official-20261101.zip/' + name)

# Full official SR Legacy captures supplement missing nutrient identities only.
EXTRA = 'docs/micronutrients-20261114/usda-sr-selected.json.gz'
full_records = {str(r['fdcId']): r for r in json.loads(gzip.decompress((ROOT / EXTRA).read_bytes()))}
full_origins = {fid:EXTRA for fid in full_records}
API_CAPTURE = 'docs/micronutrients-20261114/usda-full-five.json.gz'
for raw in json.loads(gzip.decompress((ROOT / API_CAPTURE).read_bytes())):
    fid = str(raw['fdcId'])
    if fid in full_records: raise ValueError('Duplicate full capture')
    full_records[fid] = raw; full_origins[fid] = API_CAPTURE
for source_id, raw in full_records.items():
    if source_id not in records: add(raw, full_origins[source_id])
mappings = {r['foodId']: r for r in json.loads((ROOT / 'docs/micronutrients-20261114/reviewed-mappings.json').read_text())}

catalog = json.loads((ROOT / 'catalog/guide-catalog.json').read_text())
# Explicit density conversion already present in the existing macro catalog.
# Other ml entries remain unknown; do not silently assume 1 ml == 1 g.
DENSITY = {'milk_skim': 1.03, 'milk_whole': 1.03}
foods = {}
for fid, food in sorted(catalog['foods'].items()):
    source_id = str(food.get('sourceId', ''))
    mapped = None
    if fid == 'egg_white' or food.get('sourceType') not in ('usda_fdc', 'usda_fdc_converted'):
        mapped = mappings.get(fid)
        if not mapped: continue
        if mapped['expectedName'] != food['name'] or mapped['expectedUnit'] != food['unit']:
            raise ValueError('Reviewed mapping drift: ' + fid)
        source_id = mapped['fdcId']
    if source_id not in records: continue
    unit = food.get('unit')
    if unit == 'g': factor = .01
    elif unit == 'ml' and fid in DENSITY: factor = DENSITY[fid] / 100
    else: continue
    raw, origin, sha = records[source_id]
    values, derivations, origins = {}, {}, {}
    for key, (nutrient_id, source_unit, scale) in NUTRIENTS.items():
        found = [item for item in raw['foodNutrients'] if item.get('nutrient', {}).get('id') == nutrient_id]
        if not found and source_id in full_records:
            found = [item for item in full_records[source_id]['foodNutrients'] if item.get('nutrient', {}).get('id') == nutrient_id]
            if found: origins[key] = full_origins[source_id]
        if not found:
            values[key] = None
            continue
        if len(found) != 1: raise ValueError('Duplicate nutrient identity')
        item = found[0]
        if item['nutrient'].get('unitName') != source_unit: raise ValueError('Nutrient unit mismatch')
        amount = item.get('amount')
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not math.isfinite(amount) or amount < 0:
            values[key] = None
            continue
        values[key] = round(amount * factor * scale, 10)
        derivations[key] = item.get('foodNutrientDerivation', {}).get('code') or 'not_stated'
    if all(value is None for value in values.values()): continue
    foods[fid] = {
        'name': food['name'], 'unit': unit, 'sourceId': source_id,
        'sourceUrl': 'https://fdc.nal.usda.gov/food-details/' + source_id + '/nutrients',
        'sourceDescription': raw.get('description', ''), 'recordSha256': sha,
        'capturePath': origin, 'perUnit': values, 'derivationCodes': derivations,
        'nutrientSupplementalCaptures': origins,
        'catalogSourceId': str(food.get('sourceId', '')),
        'matchType': 'reviewed_generic_reference' if mapped else 'exact_source_id',
        **({'mappingNote': mapped['note']} if mapped else {}),
        **({'gramsPerMl': DENSITY[fid]} if unit == 'ml' else {}),
    }
# SARA 2 explicitly reviewed local foods: minerals and named fatty acids.
# Source values are transcribed from the reviewed table pages. B12 is withheld because the printed heading says mg; no silent
# reinterpretation as micrograms. Fatty acids are not inferred from total fat.
sara_path = 'docs/micronutrients-20261114/sara2-reviewed.json'
for row in json.loads((ROOT / sara_path).read_text()):
    fid = row['foodId']; food = catalog['foods'][fid]
    if food['name'] != row['expectedName'] or food['unit'] != 'g': raise ValueError('SARA mapping drift')
    values = {key: None for key in NUTRIENTS}
    for key, amount in row['per100g'].items():
        if key not in NUTRIENTS or isinstance(amount,bool) or not isinstance(amount,(int,float)) or not math.isfinite(amount) or amount < 0: raise ValueError('Invalid SARA amount')
        values[key] = amount / 100
    foods[fid] = {'name': food['name'], 'unit': 'g', 'sourceId': row['sourceId'],
        'catalogSourceId': str(food.get('sourceId', '')), 'sourceUrl': row['sourceUrl'],
        'sourceDescription': row['sourceDescription'], 'capturePath': sara_path,
        'recordSha256': hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),
        'matchType': 'reviewed_generic_reference', 'perUnit': values,
        'derivationCodes': {k: 'SARA2_compilation' for k in row['per100g']},
        **({'fattyAcidEvidence':row['fattyAcidEvidence']} if 'fattyAcidEvidence' in row else {})}

# Only mixtures already defined by mass in the existing food catalogue.
for fid, ingredients in {'fruit_salad_basic': {'apple':.25,'banana':.25,'orange':.25,'mandarin':.25},
                         'morcilla_vasca_estimate': {'morcilla_cooked':.85,'raisins':.10,'walnuts':.05},
                         'mixed_nuts':{'peanuts':.25,'walnuts':.25,'almonds':.25,'cashews':.25},
                         'mi_mix_nueces_almendras_avellanas_caju':{'walnuts':.25,'almonds':.25,'hazelnuts':.25,'cashews':.25},
                         'peanut_butter':{'peanuts':1}}.items():
    values = {}
    for key in NUTRIENTS:
        amounts = [foods[i]['perUnit'][key] for i in ingredients]
        values[key] = None if any(v is None for v in amounts) else round(sum(foods[i]['perUnit'][key]*w for i,w in ingredients.items()),10)
    food = catalog['foods'][fid]
    foods[fid] = {'name':food['name'],'unit':'g','sourceId':'catalog-recipe-'+fid,
        'catalogSourceId':str(food.get('sourceId','')),'sourceUrl':'',
        'sourceDescription':food['source'],'matchType':'existing_recipe_model',
        'ingredientsByMass':ingredients,'perUnit':values,
        'derivationCodes':{k:'recipe_weighted' for k,v in values.items() if v is not None}}

from micronutrient_completion import complete_catalog
complete_catalog(ROOT, catalog, foods, NUTRIENTS)

canonical = json.dumps(foods, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
digest = hashlib.sha256(canonical.encode()).hexdigest()
result = {'version': 'ncc-micro-' + digest[:16], 'macroCatalogVersion': catalog['version'],
          'basis': 'Frozen USDA/SARA/TBCA references and explicitly documented standard recipe approximations; null means unknown',
          'foodCount': len(foods), 'foods': foods}
output = ROOT / 'pilot/micronutrient-catalog.js'
output.write_text('// Generated offline; missing nutrients are null, never inferred zero.\nexport const MICRONUTRIENT_CATALOG = ' +
                  json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(json.dumps({'foodCount': len(foods), 'version': result['version'], 'output': str(output)}))

# Every catalogue identity has an explicit coverage decision, including blockers.
coverage = []
for fid, food in sorted(catalog['foods'].items()):
    f = foods.get(fid)
    known = [key for key in NUTRIENTS if f and f['perUnit'].get(key) is not None]
    reason = None if known else ('requires_product_label' if food.get('sourceType') in ('manufacturer_web_label','etiqueta_fabricante') else 'requires_recipe_or_matching_preparation_source')
    coverage.append({'id':fid,'name':food['name'],'known':known,'missing':[k for k in NUTRIENTS if k not in known],'incomplete':f.get('incompleteNutrients',[]) if f else [],'status':'complete' if len(known)==8 and not f.get('incompleteNutrients') else 'partial' if known else 'pending','blocker':reason})
(ROOT / 'docs/micronutrients-20261114/coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
