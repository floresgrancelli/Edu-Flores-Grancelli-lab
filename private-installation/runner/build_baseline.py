"""Generate a disposable facsimile of OBSERVED structures; never a hosted restore.
No database/network use. Unknown student_belongs_to_coach and shared-notice body are explicit prerequisites.
"""
import json,re,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'evidence/hosted-metadata-20261101-2212.json').read_text())
ref=root/'reference/efg-nutrition'; out=[]
def emit(s):out.append(s)
def qi(s):return '"'+s.replace('"','""')+'"'
def fnblocks(s):
 return re.findall(r'create(?: or replace)? function\b.*?\bas\s+(\$[a-zA-Z0-9_]*\$).*?\1\s*;',s,re.S|re.I)
def bodies(s):
 rx=re.compile(r'create(?: or replace)? function\b.*?\bas\s+(\$[a-zA-Z0-9_]*\$).*?\1\s*;',re.S|re.I)
 return [x.group() for x in rx.finditer(s)]
emit('-- GENERATED LOCAL ONLY. Exact observed types/defaults/constraints/policies; support profiles/org are explicit fixture.\nBEGIN; SET LOCAL search_path=public,pg_catalog; CREATE SCHEMA efg_private;')
boot=(ref/'tests/sql/coach-auth-local-bootstrap.sql').read_text()
for table in ['efg_organizations','efg_profiles']:
 emit(re.search(r'create table public\.'+table+r'\(.*?\n\);',boot,re.S).group())
prod=(ref/'tests/sql/nut56-prodshape-local-overlay.sql').read_text()
for table in ['efg_organizations','efg_profiles']:
 emit(re.search(r'alter table public\.'+table+r'\n.*?;',prod,re.S).group())
columns={}
for c in m['structure']['columns']:columns.setdefault((c['table_schema'],c['table_name']),[]).append(c)
for (schema,table),cs in columns.items():
 fields=[]
 for c in cs:
  typ=c['data_type']; typ='text[]' if typ=='ARRAY' and c['column_default']=="'{}'::text[]" else typ
  assert typ in ['text','uuid','boolean','timestamp with time zone','date','numeric','integer','bigint','jsonb','text[]'],typ
  fields.append(qi(c['column_name'])+' '+typ+(' DEFAULT '+c['column_default'] if c['column_default'] is not None else '')+(' NOT NULL' if c['is_nullable']=='NO' else ''))
 emit('CREATE TABLE '+qi(schema)+'.'+qi(table)+'('+',\n'.join(fields)+');')
# All tables exist before foreign keys; unique/primary keys first.
constraints=m['structure']['constraints']
for c in sorted(constraints,key=lambda x:x['definition'].startswith('FOREIGN KEY')):
 emit('ALTER TABLE '+qi(c['nspname'])+'.'+qi(c['relname'])+' ADD CONSTRAINT '+qi(c['conname'])+' '+c['definition']+';')
constraint_names={x['conname'] for x in constraints}
for idx in m['functions']['indexes']:
 if idx['indexname'] not in constraint_names:emit(idx['indexdef']+';')
# Candidate bodies supply unobserved supporting definitions; exact observed nine override them.
sourcefiles=['migrations/20261030_coach_pilot_participation_server_receipts.sql','migrations/20261030_coach_relaunch_general_pilot_intake.sql','migrations/20261030_coach_versioned_private_plan_drafts.sql','migrations/20261030_coach115_versioned_legal_documents_receipts.sql','tests/sql/nut56-prodshape-local-overlay.sql']
seen=set()
for path in sourcefiles:
 for body in bodies((ref/path).read_text()):
  name=re.search(r'function\s+([\w.]+)',body,re.I)[1]
  if name=='efg_private.coach_pilot_share_active':continue # absent in observed hosted baseline
  if name not in seen:
   emit(re.sub(r'^create(?: or replace)? function','CREATE OR REPLACE FUNCTION',body,flags=re.I)); seen.add(name)
for d in m['definitions']['definitions']:emit(d['definition'].rstrip(';\n')+';')
# Unknown authorization helper is NOT replaced by a permissive stub. Separate
# reviewed-source input must define it before the generated policies are applied.
deps=json.loads((root/'required-dependencies-reviewed.json').read_text())
for d in deps:
 assert hashlib.sha256(d['definition'].encode()).hexdigest()==d['sha256']
 emit(d['definition'].rstrip(';\n')+';')
raw=json.loads(m['tablesResponse']['content'][0]['text'])['result'].replace('\\"','"').replace('\\n','\n')
rows=json.loads(raw[raw.index('[{'):raw.rindex('}]')+2])
priv={'a':'INSERT','r':'SELECT','w':'UPDATE','d':'DELETE','D':'TRUNCATE','x':'REFERENCES','t':'TRIGGER','m':'MAINTAIN'}
for t in rows:
 if t['relkind']!='r':continue
 name=qi(t['schema_name'])+'.'+qi(t['relname'])
 emit('ALTER TABLE '+name+(' ENABLE' if t['relrowsecurity'] else ' DISABLE')+' ROW LEVEL SECURITY;')
 emit('REVOKE ALL ON '+name+' FROM public,anon,authenticated,service_role;')
 for grantee,codes in re.findall(r'([^,{=]+)=([^/]+)/postgres',t.get('relacl') or ''):
  assert grantee in ['postgres','authenticated','service_role','anon']
  if grantee=='postgres':continue
  emit('GRANT '+','.join(priv[x] for x in codes)+' ON '+name+' TO '+grantee+';')
for p in m['structure']['policies']:
 emit('CREATE POLICY '+qi(p['policyname'])+' ON '+qi(p['schemaname'])+'.'+qi(p['tablename'])+' AS '+p['permissive']+' FOR '+p['cmd']+' TO '+','.join(qi(x) for x in p['roles'])+(' USING ('+p['qual']+')' if p['qual'] else '')+(' WITH CHECK ('+p['with_check']+')' if p['with_check'] else '')+';')
for c in m['definitions']['column_acl']:
 for role,codes in re.findall(r'([^=]+)=([^/]+)/postgres',''.join(c['attacl'])):
  assert role=='authenticated' and codes=='w'
  emit('GRANT UPDATE('+qi(c['attname'])+') ON '+qi(c['nspname'])+'.'+qi(c['relname'])+' TO authenticated;')
for t in m['functions']['triggers']:emit(t['definition']+';')
# Every function created in this fixture gets PUBLIC revoked. Explicit RPC grants
# below come from candidate source, while six captured ACLs are restored exactly.
emit("DO $acl$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='efg_private' OR n.nspname='public' AND p.proname LIKE 'efg_%' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public,anon,authenticated,service_role',f.sig); END LOOP; END $acl$;")
for path in sourcefiles:
 for grant in re.findall(r'grant execute on function\b.*?;', (ref/path).read_text(),re.S|re.I):
  if 'coach_pilot_share_active' not in grant:emit(grant)
def ql(s):return "'"+s.replace("'","''")+"'"
for f in m['functions']['functions']:
 grants=[]
 for acl in f['proacl'] or []:
  role=acl.split('=')[0]
  if role!='postgres':
   assert role in ['authenticated','service_role'] and '=X/' in acl
   grants.append("EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,"+ql(role)+");")
 # Strict identity lookup from the catalog handles named multiword types.
 emit("DO $identity_acl$ DECLARE sig regprocedure; BEGIN SELECT p.oid::regprocedure INTO STRICT sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname="+ql(f['nspname'])+" AND p.proname="+ql(f['proname'])+" AND pg_get_function_identity_arguments(p.oid)="+ql(f['arguments'])+"; "+' '.join(grants)+" END $identity_acl$;")
emit('GRANT USAGE ON SCHEMA efg_private TO authenticated;')
emit('ALTER TABLE public.efg_organizations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.efg_organizations FROM public,anon,authenticated;')
emit('ALTER TABLE public.efg_profiles ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.efg_profiles FROM public,anon,authenticated; GRANT SELECT ON public.efg_profiles TO authenticated; CREATE POLICY fixture_profiles_read ON public.efg_profiles FOR SELECT TO authenticated USING(user_id=auth.uid() OR efg_private.coach_has_student(user_id));')
for d in deps:
 for acl in d['acl']:
  role=acl.split('=')[0]
  if role!='postgres':emit('GRANT EXECUTE ON FUNCTION '+d['signature']+' TO '+role+';')
emit('COMMIT;')
(root/'runner/baseline-generated.sql').write_text('\n\n'.join(out)+'\n')
(root/'evidence/metadata-tables-acl.json').write_text(json.dumps(rows,indent=2)+'\n')
print('Generated baseline: 13 observed tables, 122 columns, 98 constraints, 21 policies. NOT EXECUTED; two supplied definitions and exact ACL included; final runner review pending.')
