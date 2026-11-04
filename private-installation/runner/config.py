# Writes only a NEW disposable workspace config; not a hosted configuration.
from pathlib import Path
import sys,re,tomllib
p=Path(sys.argv[1]).resolve(); target=p/'supabase/config.toml'
assert p.name=='efg-nutrition-incremental-local'
s=target.read_text()
s,n=re.subn(r'^project_id = .*$', 'project_id = "efg-nutrition-incremental-local"',s,count=1,flags=re.M);assert n==1
# Real JWT signup without email transport: this installation test is not the SDK/OTP suite.
section='[auth.email]'; a=s.index(section); b=s.find('\n[',a+1); b=len(s) if b<0 else b
part=s[a:b]; part,n=re.subn(r'enable_confirmations = (true|false)','enable_confirmations = false',part);assert n==1
s=s[:a]+part+s[b:]
assert not tomllib.loads(s).get('auth',{}).get('email',{}).get('smtp',{}).get('enabled',False)
target.write_text(s)
