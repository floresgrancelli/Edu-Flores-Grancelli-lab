"""Offline controlled-import input. No extraction, network, accounts or secrets."""
import hashlib,json,sys,zipfile
from pathlib import Path
PIN='ea088c8c4e30729a10aa0512cfe57365f91c5d0c53e83490a1ec296a4f5ebcae'
path=Path(sys.argv[1]); data=path.read_bytes()
if len(data)!=22607 or hashlib.sha256(data).hexdigest()!=PIN:
    raise SystemExit('OFFICIAL_INPUT_PACKAGE_MISMATCH')
records={}; manifests=[]
with zipfile.ZipFile(path) as archive:
    for info in archive.infolist():
        if info.is_dir() or not info.filename.endswith('.json'): continue
        if info.file_size>1024*1024: raise SystemExit('OVERSIZED_ENTRY')
        raw=archive.read(info); item=json.loads(raw)
        if isinstance(item,dict) and item.get('fdcId') in [171688,173904,173432,170894,168463]:
            key=str(item['fdcId'])
            if key in records: raise SystemExit('DUPLICATE_RECORD')
            records[key]={'raw':raw.decode('utf-8'),'sha256':hashlib.sha256(raw).hexdigest()}
        elif 'manifest' in info.filename.lower(): manifests.append(item)
if len(records)!=5 or not manifests: raise SystemExit('INCOMPLETE_OFFICIAL_PACKAGE')
print(json.dumps({'archiveDigest':'sha256:'+PIN,'records':records,'manifests':manifests}))
