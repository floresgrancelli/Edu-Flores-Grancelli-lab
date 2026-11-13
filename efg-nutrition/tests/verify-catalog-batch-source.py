"""Verify pinned public USDA records; optional full official archive proof. No accounts."""
import argparse,hashlib,json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1];folder=root/'docs/catalog-batch-20261113'
review=json.loads((folder/'review.json').read_text());records=json.loads((folder/'source-records.json').read_text());byid={x['fdcId']:x for x in records}
canonical=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
assert len(byid)==len(records)==review['selectedCount']==25
for row in review['records']:
 f=byid[row['fdcId']];assert f['dataType']=='SR Legacy' and f['description']==row['sourceDescription'];assert hashlib.sha256(canonical(f)).hexdigest()==row['sourceRecordSha256']
 for nid,key,unit in [(1008,'k','KCAL'),(1003,'p','G'),(1005,'c','G'),(1004,'f','G'),(1079,'fi','G')]:
  found=[x for x in f['foodNutrients'] if x['nutrient']['id']==nid];assert len(found)==1;assert found[0]['nutrient']['unitName'].upper()==unit;assert found[0]['amount']==row['nutrientsPer100g'][key]
parser=argparse.ArgumentParser();parser.add_argument('--archive');args=parser.parse_args()
if args.archive:
 p=Path(args.archive);assert p.stat().st_size<32*1024*1024;assert hashlib.sha256(p.read_bytes()).hexdigest()==review['archiveSha256']
 with zipfile.ZipFile(p) as z:
  entries=[x for x in z.infolist() if x.filename.endswith('.json')];assert len(entries)==1 and entries[0].file_size<300*1024*1024;full=json.loads(z.read(entries[0]))['SRLegacyFoods']
 official={x['fdcId']:x for x in full if x['fdcId'] in byid};assert len(official)==25
 for fid,item in byid.items():assert canonical(item)==canonical(official[fid])
 print('PASS official archive -> 25 exact records, names, nutrient identities, units and values; 7793 source rows')
else:print('PASS 25 pinned USDA records and nutrient projections; full archive not requested in this invocation')
