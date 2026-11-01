import json,hashlib
from pathlib import Path
r=Path(__file__).resolve().parents[1]
m=json.loads((r/'MANIFEST.json').read_text())
for name,v in m['files'].items():
 p=r/name
 assert p.is_file(),name
 assert hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256'],name
print('PASS package hashes; no SQL/runtime claim')
