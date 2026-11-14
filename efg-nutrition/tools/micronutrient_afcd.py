"""Fill explicitly reviewed gaps from frozen FSANZ AFCD mass-basis columns."""
import hashlib
import json
import math

COLUMNS = {'ala': (209, 'C18:3w3 (g)', 'g/100g'),
           'epa': (222, 'C20:5w3 (mg)', 'mg/100g'),
           'dha': (229, 'C22:6w3 (mg)', 'mg/100g'),
           'b12': (93, 'Cobalamin (B12) \n(ug)', 'µg/100g')}

def load_afcd(root):
    folder = root / 'docs/micronutrients-afcd-20261114'
    manifest = json.loads((folder / 'manifest.json').read_text())
    for name, digest in manifest['files'].items():
        if hashlib.sha256((folder / name).read_bytes()).hexdigest() != digest:
            raise ValueError('AFCD source drift: ' + name)
    return (json.loads((folder / 'selected-records.json').read_text()),
            json.loads((folder / 'mappings.json').read_text()))

def fill_afcd(root, foods, drinks=False):
    data, mappings = load_afcd(root)
    if data['sheet'] != 'All solids & liquids per 100 g':
        raise ValueError('Wrong AFCD food basis')
    changed = 0
    for m in mappings:
        if m['target'].startswith('drink:') != drinks:
            continue
        f = foods[m['target']]
        if not drinks and (f['name'] != m['expectedName'] or f['unit'] != m['expectedUnit']):
            raise ValueError('AFCD mapping identity drift: ' + m['target'])
        density = 1 if drinks else f.get('gramsPerMl', 1)
        if not drinks and f['unit'] == 'ml' and 'gramsPerMl' not in f:
            raise ValueError('Missing native-unit density')
        row = data['rows'][m['code']]
        if row[0] != m['code']:
            raise ValueError('AFCD food code mismatch')
        for nutrient in m['nutrients']:
            if f['perUnit'][nutrient] is not None:
                continue
            col, header, unit = COLUMNS[nutrient]
            if data['header'][col] != header:
                raise ValueError('Wrong AFCD nutrient column or unit')
            value = row[col]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                raise ValueError('No numeric reference for reviewed AFCD gap')
            f['perUnit'][nutrient] = round(value * density / 100, 10)
            f.setdefault('nutrientProvenance', {})[nutrient] = {
                'source': 'FSANZ AFCD Release 3', 'food': row[3], 'foodCode': row[0],
                'sourceUrl': data['sourceUrl'], 'sourceUnit': unit,
                'capturePath': 'docs/micronutrients-afcd-20261114/selected-records.json',
                'licenseUrl': data['licensing']['licenseUrl'],
                'note': 'ESTIMACIÓN por referencia comparable. FSANZ AFCD 3 (Australia). ' + m['note'] +
                        (' Cero numérico publicado a la precisión de la tabla; no significa ausencia absoluta ni convierte un dato desconocido en cero.' if value == 0 else '')}
            changed += 1
    return changed
