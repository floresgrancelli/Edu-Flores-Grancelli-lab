"""Only configure the reviewed disposable runner before its first start."""
import os,re,sys,tomllib
from pathlib import Path
assert os.environ.get('GITHUB_ACTIONS')=='true'
assert os.environ.get('EFG_QA_SDK_ENTRY')=='1'
root=Path(sys.argv[1]).resolve()
assert root==Path(os.environ['RUNNER_TEMP']).resolve()/'efg-nutrition-sdk-entry-local'
config=root/'supabase/config.toml'
text=config.read_text();data=tomllib.loads(text)
assert data.get('inbucket',{}).get('enabled') is True
assert data.get('inbucket',{}).get('port')==54324
assert not data.get('auth',{}).get('email',{}).get('smtp',{}).get('enabled',False)
def set_value(section,key,value):
 global text
 pattern=r'(?ms)(^\['+re.escape(section)+r'\]\s*\n)(.*?)(?=^\[|\Z)'
 m=re.search(pattern,text);assert m,section
 body=m.group(2);line=r'(?m)^'+re.escape(key)+r'\s*=.*$'
 assert len(re.findall(line,body))==1,(section,key)
 body=re.sub(line,key+' = '+value,body)
 text=text[:m.start(2)]+body+text[m.end(2):]
set_value('auth.email','max_frequency','"1s"')
set_value('auth.rate_limit','email_sent','100')
set_value('auth','site_url','"http://127.0.0.1:4173/efg-nutrition/pilot/"')
set_value('auth','additional_redirect_urls','[]')
for kind in ('magic_link','confirmation'):
 section='auth.email.template.'+kind
 assert not re.search(r'(?m)^\['+re.escape(section)+r'\]',text)
 text+='\n['+section+']\nsubject = "NCC fictional local login"\ncontent_path = "./supabase/templates/sdk-local-otp.html"\n'
templates=root/'supabase/templates';templates.mkdir(exist_ok=True)
(templates/'sdk-local-otp.html').write_text('<p>FICTIONAL LOCAL ONLY</p><p>NCC_LOCAL_OTP={{ .Token }}</p>')
tomllib.loads(text);config.write_text(text)
print('Prepared disposable local OTP template and local-only email rate settings; no SMTP relay.')
