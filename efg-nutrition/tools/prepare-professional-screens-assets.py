#!/usr/bin/env python3
"""Pin the OFF professional-screen integration from an exact prior candidate. No network or release enablement."""
import argparse,copy,hashlib,json,posixpath,re
from pathlib import Path
VERSION='ncc-professional-screens-r1-20261107'
PRIOR='961015ea714acb1851c0886a95e1b3f4a8325ae5566bd701534cd6c1cf675b6b'
PILOT='efg-nutrition/pilot/pilot.js'
HTML='efg-nutrition/pilot/index.html'
CSS='efg-nutrition/pilot/dual-workspace.css'
MANIFEST='efg-nutrition/docs/guide-return-candidate/asset-manifest.json'
MODULES=[PILOT]+['efg-nutrition/pilot/dual-workspace-'+x+'.mjs' for x in ['bootstrap','frame','integration','panel']]+['efg-nutrition/pilot/professional-screens-'+x+'.mjs' for x in ['candidate','panel','transport']]
EDGE=re.compile(r'''(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.{1,2}/[^"']+)\2''')
sha=lambda data:hashlib.sha256(data).hexdigest()
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--candidate-root',type=Path,required=True);ap.add_argument('--prior-root',type=Path,required=True);ap.add_argument('--evidence',type=Path,required=True);a=ap.parse_args()
 root,prior=a.candidate_root.resolve(),a.prior_root.resolve();assert root!=prior and root not in prior.parents and prior not in root.parents
 original=(prior/MANIFEST).read_bytes();assert sha(original)==PRIOR
 old=json.loads(original);assert old['build']=='ncc-pilot-3a40474052be'
 for p in old['sha256']:
  assert sha((prior/p).read_bytes())==old['sha256'][p],p
  if p not in MODULES+[HTML]:assert (root/p).read_bytes()==(prior/p).read_bytes(),p
 for item in old['stylesheets']:
  if item['path']!=CSS:assert (root/item['path']).read_bytes()==(prior/item['path']).read_bytes()
 assert 'export const DUAL_WORKSPACE_RELEASE_ENABLED = false;' in (root/'efg-nutrition/pilot/dual-workspace-candidate.mjs').read_text()
 for flag,name in [('PROFESSIONAL_SCREENS_RELEASE_ENABLED','candidate'),('PROFESSIONAL_TRANSPORT_ENABLED','transport'),('PROFESSIONAL_BACKEND_EXECUTION_ENABLED','transport')]:
  assert f'export const {flag} = false;' in (root/f'efg-nutrition/pilot/professional-screens-{name}.mjs').read_text()
 planned={}
 # Query-pinned runtime imports must have one module identity in Node and browser fixtures.
 # In particular the host mutation guard lives in a module-private WeakMap.
 imports=MODULES+[str(p.relative_to(root)) for p in sorted((root/'efg-nutrition/tests').glob('professional-screens*.mjs'))]
 for p in imports:
  source=(root/p).read_text()
  def edge(m):
   prefix,quote,ref=m.groups();clean=ref.split('?')[0];target=posixpath.normpath(posixpath.join(posixpath.dirname(p),clean))
   return prefix+quote+clean+'?v='+VERSION+quote if target in MODULES else m[0]
  planned[p]=EDGE.sub(edge,source).encode()
 html=(root/HTML).read_text();html,n=re.subn(r'(src="\./pilot\.js\?v=)[^"]+',r'\g<1>'+VERSION,html);assert n==1
 html,n=re.subn(r'(href="\./dual-workspace\.css\?v=)[^"]+',r'\g<1>'+VERSION,html);assert n==1
 assert '<meta name="efg-build" content="'+old['build']+'">' in html;planned[HTML]=html.encode()
 manifest=copy.deepcopy(old);manifest['assetVersion']=VERSION
 for p in MODULES:manifest['moduleVersions'][p]=VERSION;manifest['sha256'][p]=sha(planned[p])
 manifest['sha256'][HTML]=sha(planned[HTML])
 for item in manifest['stylesheets']:
  if item['path']==CSS:item['sha256']=sha((root/CSS).read_bytes());item['url']='./dual-workspace.css?v='+VERSION
 for k in ['moduleVersions','sha256']:manifest[k]=dict(sorted(manifest[k].items()))
 planned[MANIFEST]=(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n').encode();digest=sha(planned[MANIFEST])
 validator='efg-nutrition/tools/pwa-build-identity.mjs';s=(prior/validator).read_text();needle="'"+PRIOR+"'].includes";assert s.count(needle)==1
 planned[validator]=s.replace(needle,"'"+PRIOR+"','"+digest+"'].includes").encode()
 approved='efg-nutrition/tests/approved-release-flags.mjs';s=(prior/approved).read_text();assert s.count(PRIOR)==1;planned[approved]=s.replace(PRIOR,digest).encode()
 for p,data in planned.items():
  target=(root/p).resolve();assert target.is_relative_to(root);target.write_bytes(data)
 evidence={'status':'OFF_CANDIDATE_NOT_PRODUCTION','prior_manifest_sha256':PRIOR,'manifest_sha256':digest,'asset_version':VERSION,'release_build':old['build'],'changed_module_paths':MODULES,'new_modules':3,'historical_stylesheets_unchanged':len(old['stylesheets'])-1,'preserved_dual_flag':False,'professional_flags':[False,False,False]}
 a.evidence.parent.mkdir(parents=True,exist_ok=True);a.evidence.write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps(evidence,indent=2))
if __name__=='__main__':main()
