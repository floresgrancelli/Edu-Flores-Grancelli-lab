"""Reviewed dry-nori contribution. B12 and DHA remain unresolved, not zero."""
import json
import hashlib

def read_nori(root):
    folder=root/'docs/micronutrients-nori-20261114'
    manifest=json.loads((folder/'manifest.json').read_text())
    for name,digest in manifest['files'].items():
        if hashlib.sha256((folder/name).read_bytes()).hexdigest()!=digest:
            raise ValueError('Nori evidence drift')
    data=json.loads((folder/'source.json').read_text())
    if data['foodCode']!='09003' or any(p['weightGrams']!=100 for p in data['pages'].values()):
        raise ValueError('Wrong dry-nori identity or basis')
    return data

def fill_nori(root,internal):
    data=read_nori(root);f=internal['@nori']
    if any(v is not None for v in f['perUnit'].values()):
        raise ValueError('Nori baseline already has values')
    for key,item in data['usedPer100g'].items():
        if item['unit']!='mg':raise ValueError('Unexpected MEXT source unit')
        f['perUnit'][key]=item['value']/100/(1000 if key=='ala' else 1)
    f.update(sourceId='MEXT-09003-dried',sourceUrl=data['pages']['0']['url'],sourceDescription=data['foodName'],withheld=data['withheld'])

def annotate_nori(root,foods,internal):
    data=read_nori(root);all_foods={**internal,**foods};memo={}
    def has_nori(fid):
        if fid=='@nori':return True
        if fid in memo:return memo[fid]
        f=all_foods[fid]
        parts=[p['id'] for p in f.get('ingredients',[])] or list(f.get('ingredientsByMass',{}))
        memo[fid]=any(has_nori(p) for p in parts)
        return memo[fid]
    for fid,f in foods.items():
        if not has_nori(fid):continue
        f['mappingNote']+=' Nori seco: seis componentes estimados desde MEXT 09003; B12 y DHA del nori siguen pendientes.'
        for key in data['usedPer100g']:
            p=f.get('nutrientProvenance',{}).get(key)
            if p and p['source']=='recipe_components':
                p.update(sourceUrl=data['pages']['4' if key in ('ala','epa') else '0']['url'],
                         note=p['note']+' Incluye aporte de nori seco MEXT 09003 (Japón); mismas cantidades y rendimiento, no alga fresca.',
                         supplementalSource='MEXT-09003-dried')
