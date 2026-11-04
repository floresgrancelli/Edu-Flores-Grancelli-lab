# Local-only OTP template consumed by the already reviewed SDK mail reader.
import os,sys,re,tomllib
from pathlib import Path
assert os.environ.get('GITHUB_ACTIONS')=='true'
assert os.environ.get('EFG_QA_CLINICAL_BRIDGE')=='1'
root=Path(sys.argv[1]).resolve()
assert root==Path(os.environ['RUNNER_TEMP']).resolve()/'efg-nutrition-incremental-local'
config=root/'supabase/config.toml';text=config.read_text();data=tomllib.loads(text)
assert data['project_id']=='efg-nutrition-incremental-local'
assert data.get('inbucket',{}).get('enabled') is True
assert data.get('inbucket',{}).get('port')==54324
assert not data.get('auth',{}).get('email',{}).get('smtp',{}).get('enabled',False)
for kind in ('magic_link','confirmation'):
 section='auth.email.template.'+kind
 assert not re.search(r'(?m)^\['+re.escape(section)+r'\]',text)
 text+='\n['+section+']\nsubject = "NCC fictional local login"\ncontent_path = "./supabase/templates/sdk-local-otp.html"\n'
templates=root/'supabase/templates';templates.mkdir(exist_ok=True)
(templates/'sdk-local-otp.html').write_text('<p>FICTIONAL LOCAL ONLY</p><p>NCC_LOCAL_OTP={{ .Token }}</p>')
tomllib.loads(text);config.write_text(text)
print('Prepared local-only fictional OTP template; no SMTP or auth policy changes.')
