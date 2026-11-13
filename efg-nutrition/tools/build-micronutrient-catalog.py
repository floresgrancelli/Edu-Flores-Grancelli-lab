"""Offline exact-ID projection of existing USDA captures; no guessed food matching."""
from pathlib import Path
import hashlib
import json
import math
import zipfile

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

catalog = json.loads((ROOT / 'catalog/guide-catalog.json').read_text())
# Explicit density conversion already present in the existing macro catalog.
# Other ml entries remain unknown; do not silently assume 1 ml == 1 g.
DENSITY = {'milk_skim': 1.03, 'milk_whole': 1.03}
foods = {}
for fid, food in sorted(catalog['foods'].items()):
    source_id = str(food.get('sourceId', ''))
    if food.get('sourceType') not in ('usda_fdc', 'usda_fdc_converted') or source_id not in records:
        continue
    unit = food.get('unit')
    if unit == 'g': factor = .01
    elif unit == 'ml' and fid in DENSITY: factor = DENSITY[fid] / 100
    else: continue
    raw, origin, sha = records[source_id]
    values, derivations = {}, {}
    for key, (nutrient_id, source_unit, scale) in NUTRIENTS.items():
        found = [item for item in raw['foodNutrients'] if item.get('nutrient', {}).get('id') == nutrient_id]
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
    foods[fid] = {
        'name': food['name'], 'unit': unit, 'sourceId': source_id,
        'sourceUrl': 'https://fdc.nal.usda.gov/food-details/' + source_id + '/nutrients',
        'sourceDescription': raw.get('description', ''), 'recordSha256': sha,
        'capturePath': origin, 'perUnit': values, 'derivationCodes': derivations,
        **({'gramsPerMl': DENSITY[fid]} if unit == 'ml' else {}),
    }
canonical = json.dumps(foods, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
digest = hashlib.sha256(canonical.encode()).hexdigest()
result = {'version': 'ncc-micro-' + digest[:16], 'macroCatalogVersion': catalog['version'],
          'basis': 'USDA frozen composition estimates; exact source IDs only',
          'foodCount': len(foods), 'foods': foods}
output = ROOT / 'pilot/micronutrient-catalog.js'
output.write_text('// Generated offline; missing nutrients are null, never inferred zero.\nexport const MICRONUTRIENT_CATALOG = ' +
                  json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(json.dumps({'foodCount': len(foods), 'version': result['version'], 'output': str(output)}))
