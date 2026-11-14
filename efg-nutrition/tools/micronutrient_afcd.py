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


def fill_vinegar(root, internal):
    """Only the missing ALA cell of the existing generic vinegar ingredient."""
    data, _ = load_afcd(root)
    f = internal['@vinegar']
    row = data['rows']['F009498']
    if str(f['sourceId']) != '172237' or f['perUnit']['ala'] is not None:
        raise ValueError('Vinegar baseline identity or missing cell changed')
    if data['header'][209] != COLUMNS['ala'][1] or row[209] != 0:
        raise ValueError('Vinegar published ALA reference changed')
    f['perUnit']['ala'] = row[209] / 100


def annotate_vinegar(root, foods, internal):
    data, _ = load_afcd(root)
    all_foods = {**internal, **foods}
    memo = {}
    def contains(fid):
        if fid == '@vinegar': return True
        if fid in memo: return memo[fid]
        f = all_foods[fid]
        ids = [p['id'] for p in f.get('ingredients', [])] or list(f.get('ingredientsByMass', {}))
        memo[fid] = any(contains(i) for i in ids)
        return memo[fid]
    for fid, f in foods.items():
        if not contains(fid): continue
        p = f.get('nutrientProvenance', {}).get('ala')
        if not p or p['source'] != 'recipe_components': continue
        p['afcdVinegar'] = {'foodCode': 'F009498', 'sourceUrl': data['sourceUrl'],
                           'sourceUnit': 'g/100g', 'value': 0,
                           'licenseUrl': data['licensing']['licenseUrl']}
        p['note'] += ' Vinagre genérico: ALA completado con cero numérico publicado en FSANZ AFCD 3 F009498; no ausencia absoluta, ni vinagre balsámico o aderezo. Misma cantidad de ingrediente.'
