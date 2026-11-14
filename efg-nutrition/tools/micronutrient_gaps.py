"""Reviewed cross-table estimates for missing cells only; never turn traces into zero."""
import hashlib
import json
import math

def numeric(cell):
    if isinstance(cell, bool) or cell is None:
        return None
    try:
        value = float(cell)
    except (ValueError, TypeError):
        return None
    return value if math.isfinite(value) and value >= 0 else None

def fill_gaps(root, foods):
    folder = root / 'docs/micronutrients-gaps-20261114'
    manifest = json.loads((folder / 'manifest.json').read_text())
    for filename, digest in manifest['files'].items():
        if hashlib.sha256((folder / filename).read_bytes()).hexdigest() != digest:
            raise ValueError('Gap evidence drift: ' + filename)
    captured = json.loads((folder / 'cofid-selected.json').read_text())
    sara_folder = root / 'docs/micronutrients-20261114'
    sara = json.loads((sara_folder / 'enrichment-sara-rows.json').read_text())
    sara_url = json.loads((sara_folder / 'enrichment-manifest.json').read_text())['saraUrl']
    seen = set()
    for m in json.loads((folder / 'mappings.json').read_text()):
        fid, key = m['foodId'], m['nutrient']
        if (fid, key) in seen:
            raise ValueError('Duplicate gap mapping')
        seen.add((fid, key))
        f = foods[fid]
        if f['name'] != m['expectedName'] or f['unit'] != m['expectedUnit']:
            raise ValueError('Gap identity drift: ' + fid)
        if f['perUnit'][key] is not None:
            raise ValueError('Gap is already known: ' + fid + ' ' + key)
        if m['source'] == 'CoFID 2021':
            row = captured['rows'][m['sheet']][m['code']]
            expected = {'ala': ('1.12 (PUFA per 100gFood)', 16, 'cis n-3 C18:3 /100g food (g)'),
                        'epa': ('1.12 (PUFA per 100gFood)', 28, 'cis n-3 C20:5 /100g food (g)'),
                        'dha': ('1.12 (PUFA per 100gFood)', 40, 'cis n-3 C22:6 /100g food (g)'),
                        'b12': ('1.5 Vitamins', 19, 'Vitamin B12 (µg)')}[key]
            if (m['sheet'], m['column'], captured['headers'][m['sheet']][0][m['column']]) != expected:
                raise ValueError('Wrong nutrient column or unit')
            value = numeric(row[m['column']])
            description, url = row[1], captured['sourceUrl']
            source_unit = 'µg/100g' if key == 'b12' else 'g/100g'
        else:
            if m['source'] != 'SARA 2' or key != 'ala':
                raise ValueError('Unsupported reference')
            row = sara[m['saraName']]['macro']
            value = numeric(row['cells'][11].replace(',', '.'))
            description, url = m['saraName'], sara_url + '#page=' + str(row['page'])
            source_unit = 'g/100g'
        if value is None:
            raise ValueError('Unknown or trace value cannot be filled: ' + fid)
        if f['unit'] == 'ml' and not f.get('gramsPerMl'):
            raise ValueError('Missing liquid density')
        f['perUnit'][key] = round(value / 100 * f.get('gramsPerMl', 1) * (1000 if key in ('epa', 'dha') else 1), 10)
        f.setdefault('nutrientProvenance', {})[key] = {
            'source': m['source'], 'food': description, 'sourceUrl': url,
            'sourceUnit': source_unit, 'note': 'ESTIMACIÓN por referencia comparable. ' + m['note'],
            'capturePath': 'docs/micronutrients-gaps-20261114/cofid-selected.json' if m['source'] == 'CoFID 2021' else 'docs/micronutrients-20261114/enrichment-sara-rows.json',
            **({'foodCode': m['code']} if 'code' in m else {})}
