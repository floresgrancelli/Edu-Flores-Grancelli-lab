#!/usr/bin/env python3
"""Generate a reviewable SQL candidate and isolated fixture from READ-ONLY metadata.
No database/network access; no user records in the metadata snapshots.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
columns=json.loads((ROOT/'catalog-columns-20261113.json').read_text())
snapshot=json.loads((ROOT.parent.parent/'docs/play-store/deletion-metadata-20261113.json').read_text())
fks=snapshot['foreign_keys']
own_student=['efg_activities','efg_coach_plan_drafts','efg_coach_plan_publish_receipts',
 'efg_coach_relaunch_intakes','efg_consents','efg_daily_logs','efg_food_plans','efg_goals',
 'efg_habitual_meals','efg_messages','efg_period_reports','efg_personal_recipes',
 'efg_pilot_participation_receipts','efg_student_plan_access','efg_sunday_rewards',
 'efg_weekly_reports','efg_weights']
scopes={name:'student_id=$1' for name in own_student}
for name in ['efg_profiles','efg_personal_targets','efg_legal_acceptances','efg_science_intro_receipts','efg_student_onboarding']:
 scopes[name]='user_id=$1'
scopes['efg_invitations']='claimed_by=$1 or lower(email)=lower($2)'
scopes['efg_notifications']='recipient_id=$1 or actor_id=$1 or target_student=$1'
scopes['efg_organizations']='false'
scopes['efg_payments']='false'
order=['efg_student_plan_access','efg_food_plans','efg_coach_plan_drafts',
 'efg_coach_plan_publish_receipts','efg_weekly_reports','efg_period_reports','efg_messages',
 'efg_notifications','efg_invitations','efg_sunday_rewards','efg_consents',
 'efg_coach_relaunch_intakes','efg_pilot_participation_receipts','efg_student_onboarding',
 'efg_personal_targets','efg_daily_logs','efg_activities','efg_weights','efg_habitual_meals',
 'efg_personal_recipes','efg_legal_acceptances','efg_science_intro_receipts','efg_goals','efg_profiles']
def lit(value):return "'"+value.replace("'","''")+"'"
def qi(value):return '"'+value.replace('"','""')+'"'
tables=sorted(set(c['table_name'] for c in columns))
triggers=[]
for schema,table in [('public',t) for t in tables]+[('storage','objects')]:
 triggers.append(f'create trigger ncc_freeze_erasure_writes before insert or update or delete on {qi(schema)}.{qi(table)} for each row execute function public.ncc_freeze_erasure_writes();')
sql=(ROOT/'student-erasure.template.sql').read_text()
for marker,value in {
 'FOREIGN_KEYS':lit(json.dumps(fks,separators=(',',':'))),
 'COLUMNS':lit(json.dumps(columns,separators=(',',':'))),
 'SCOPES':lit(json.dumps(scopes,separators=(',',':'))),
 'FREEZE_TRIGGERS':'\n'.join(triggers),
 'DELETE_ORDER':'ARRAY['+','.join(lit(x) for x in order)+']::text[]'
}.items():sql=sql.replace('@@'+marker+'@@',value)
(ROOT/'student-erasure.candidate.sql').write_text(sql)

# Synthetic structural fixture: exact columns/nullability and FK relationships;
# defaults are QA-only conveniences, not claims about live defaults or policies.
fixture=['-- ISOLATED QA ONLY. Contains no production user data.',
 'create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;',
 'create schema auth;create schema storage;create schema qa;',
 'create table auth.users(id uuid primary key,email text);',
 "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
 'grant usage on schema public,auth,storage to anon,authenticated,service_role;',
 'grant execute on function auth.uid() to anon,authenticated,service_role;']
type_map={'uuid':'uuid','date':'date','int4':'integer','text':'text','numeric':'numeric',
 'timestamptz':'timestamptz','_text':'text[]','jsonb':'jsonb','int8':'bigint','bool':'boolean','time':'time'}
defaults={'uuid':'gen_random_uuid()','date':'current_date','integer':'0','text':"''",'numeric':'0',
 'timestamptz':'now()','text[]':"'{}'::text[]",'jsonb':"'{}'::jsonb",'bigint':'0','boolean':'true','time':"'00:00'::time"}
for table in tables:
 defs=[]
 for c in [x for x in columns if x['table_name']==table]:
  kind=type_map[c['udt_name']]
  defs.append(qi(c['column_name'])+' '+kind+(' not null' if c['is_nullable']=='NO' else '')+' default '+(defaults[kind] if c['is_nullable']=='NO' else 'null'))
 fixture.append('create table public.'+qi(table)+'('+','.join(defs)+');')
for table,key in [('efg_profiles','user_id'),('efg_goals','id'),('efg_organizations','id'),('efg_legal_documents','id')]:
 fixture.append(f'alter table public.{qi(table)} add primary key({qi(key)});')
for i,fk in enumerate(fks):
 fixture.append(f'alter table public.{qi(fk["source_table"])} add constraint qa_fk_{i} '+fk['definition']+';')
fixture.extend([
 'create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null,owner_id text);',
 'grant all on all tables in schema public,auth,storage to service_role;',
 'grant select,insert,update,delete on all tables in schema public to authenticated;',
 'grant select,insert,update,delete on storage.objects to authenticated;',
])
(ROOT/'erasure-fixture.sql').write_text('\n'.join(fixture)+'\n')

A='11111111-1111-4111-8111-111111111111';B='22222222-2222-4222-8222-222222222222'
C='33333333-3333-4333-8333-333333333333';D='44444444-4444-4444-8444-444444444444';E='55555555-5555-4555-8555-555555555555'
O='66666666-6666-4666-8666-666666666666';GA='77777777-7777-4777-8777-777777777777';GB='88888888-8888-4888-8888-888888888888';L='99999999-9999-4999-8999-999999999999'
requests={u:f'aaaaaaaa-aaaa-4aaa-8aaa-{i:012d}' for i,u in enumerate([A,B,C,D,E],1)}
scenario=['-- ISOLATED SYNTHETIC DATA ONLY. Storage/Auth API effects below are simulations.',
 'begin;',
 "create function qa.expect_error(command text,wanted text) returns void language plpgsql as $$begin begin execute command;exception when others then if position(wanted in sqlerrm)>0 then return;end if;raise;end;raise exception 'Expected error was not raised: %',wanted;end$$;",
 "create function qa.seed(tbl text,attrs jsonb) returns void language plpgsql as $$declare cols text; vals text;begin select string_agg(format('%I',key),',' order by key),string_agg(format('%L',value #>> '{}'),',' order by key) into cols,vals from jsonb_each(attrs);execute format('insert into public.%I (%s) values (%s)',tbl,cols,vals);end$$;",
 "grant usage on schema qa to authenticated,service_role,anon;",
 "create function qa.definer_write() returns void language plpgsql security definer set search_path=pg_catalog,public as $$begin insert into public.efg_daily_logs(student_id) values(auth.uid());end$$;"
]
def seed(table,attrs):scenario.append('select qa.seed('+lit(table)+','+lit(json.dumps(attrs))+'::jsonb);')
for u in [A,B,C,D,E]:scenario.append(f'insert into auth.users values ({lit(u)},{lit("student-"+u[0]+"@example.test")});')
seed('efg_organizations',{'id':O,'coach_id':C})
for u in [A,B,C,D,E]:seed('efg_profiles',{'user_id':u,'email':'student-'+u[0]+'@example.test','role':'coach' if u==C else 'student','organization_id':O})
seed('efg_legal_documents',{'id':L})
for uid,gid in [(A,GA),(B,GB)]:
 seed('efg_goals',{'id':gid,'student_id':uid,'approved_by':C})
 for table in order:
  if table in ['efg_profiles','efg_goals','efg_invitations','efg_notifications']:continue
  attrs={}
  for fk in [f for f in fks if f['source_table']==table]:
   key=fk['definition'].split('(')[1].split(')')[0]
   target=fk['target_table']
   if target=='auth.users':attrs[key]=uid if key in ['user_id','student_id'] else C
   elif target=='efg_profiles':attrs[key]=uid
   elif target=='efg_organizations':attrs[key]=O
   elif target=='efg_goals':attrs[key]=gid
   elif target=='efg_legal_documents':attrs[key]=L
  seed(table,attrs)
 seed('efg_invitations',{'email':'student-'+uid[0]+'@example.test','claimed_by':uid,'invited_by':C,'organization_id':O})
 seed('efg_invitations',{'email':'student-'+uid[0]+'@example.test','invited_by':C,'organization_id':O})
 seed('efg_notifications',{'recipient_id':C,'actor_id':C,'target_student':uid})
 scenario.append(f"insert into storage.objects(bucket_id,name,owner_id) values ('efg-receipts',{lit(uid+'/photo.webp')},{lit(uid)});")
seed('efg_payments',{'payer_id':D,'recipient_id':C,'organization_id':O})
seed('efg_coach_plan_drafts',{'student_id':D,'coach_id':B,'organization_id':O})
for uid,rid in requests.items():scenario.append(f"insert into public.ncc_account_deletion_requests(id,user_id,source) values ({lit(rid)},{lit(uid)},'privacy_web');")
def expect(command,wanted):scenario.append('select qa.expect_error('+lit(command)+','+lit(wanted)+');')
scenario.append('set local role anon;')
expect(f'select public.ncc_prepare_student_erasure({lit(requests[A])})','permission denied')
scenario.append('set local role authenticated;')
expect(f'select public.ncc_prepare_student_erasure({lit(requests[A])})','permission denied')
scenario.append('set local role service_role;')
expect(f'select public.ncc_prepare_student_erasure({lit(requests[C])})','ROLE_REQUIRES_MANUAL_REVIEW')
expect(f'select public.ncc_prepare_student_erasure({lit(requests[D])})','FINANCIAL_REVIEW_REQUIRED')
expect(f'select public.ncc_prepare_student_erasure({lit(requests[B])})','PROFESSIONAL_LINK_REVIEW_REQUIRED')
scenario.append(f"do $$declare p jsonb;begin p:=public.ncc_prepare_student_erasure({lit(requests[A])});if jsonb_array_length(p->'files')<>1 or p->>'user_id'<>{lit(A)} then raise exception 'Incorrect manifest';end if;end$$;")
scenario.append(f"do $$begin if (select active from public.efg_profiles where user_id={lit(A)}) or (select accepted from public.efg_consents where student_id={lit(A)}) then raise exception 'Access not restricted';end if;end$$;")
expect(f'select public.ncc_purge_student_data({lit(requests[A])})','OWNED_FILES_REMAIN')
scenario.append("set local role authenticated;select set_config('request.jwt.claim.sub',"+lit(A)+",true);")
expect(f'insert into public.efg_daily_logs(student_id) values ({lit(A)})','ACCOUNT_DELETION_IN_PROGRESS')
expect('select qa.definer_write()','ACCOUNT_DELETION_IN_PROGRESS')
expect(f"insert into storage.objects(bucket_id,name,owner_id) values ('efg-receipts','late.webp',{lit(A)})",'ACCOUNT_DELETION_IN_PROGRESS')
scenario.append("select set_config('request.jwt.claim.sub',"+lit(B)+",true);")
scenario.append(f'insert into public.efg_daily_logs(student_id) values ({lit(B)});')
scenario.append("set local role service_role;select set_config('request.jwt.claim.sub','',true);")
scenario.append(f"delete from storage.objects where owner_id={lit(A)}; -- Simulated successful Storage API removal in this isolated fixture only.")
scenario.append(f'select public.ncc_purge_student_data({lit(requests[A])});')
scenario.append(f"do $$begin if exists(select 1 from public.efg_profiles where user_id={lit(A)}) or exists(select 1 from public.efg_messages where student_id={lit(A)}) or exists(select 1 from public.efg_notifications where target_student={lit(A)}) or exists(select 1 from public.efg_invitations where email='student-1@example.test') then raise exception 'Personal data remains';end if;if not exists(select 1 from public.efg_profiles where user_id={lit(B)}) or not exists(select 1 from public.efg_messages where student_id={lit(B)}) or not exists(select 1 from storage.objects where owner_id={lit(B)}) or not exists(select 1 from public.efg_organizations where coach_id={lit(C)}) then raise exception 'Other users affected';end if;if not exists(select 1 from auth.users where id={lit(A)}) then raise exception 'SQL must not delete Auth';end if;end$$;")
scenario.append(f'select public.ncc_prepare_student_erasure({lit(requests[A])}); -- Retry after database phase, before Auth removal.')
scenario.append(f'select public.ncc_purge_student_data({lit(requests[A])}); -- Idempotent retry.')
scenario.append(f'delete from auth.users where id={lit(A)}; -- Simulated Auth API hard delete in QA only.')
scenario.append(f"do $$begin if exists(select 1 from public.ncc_account_deletion_requests where user_id={lit(A)}) then raise exception 'Request PII was not removed';end if;if (select count(*) from auth.users)<>4 then raise exception 'Other accounts affected';end if;end$$;")
scenario.append('reset role;create table public.efg_unreviewed_data(user_id uuid references auth.users(id));grant all on public.efg_unreviewed_data to service_role;set local role service_role;')
expect(f'select public.ncc_prepare_student_erasure({lit(requests[E])})','SCHEMA_REVIEW_REQUIRED')
scenario.append('reset role;drop table public.efg_unreviewed_data;')
scenario.append("rollback;\n\\echo 'Student deletion synthetic SQL tests passed'")
(ROOT/'erasure-scenarios.sql').write_text('\n'.join(scenario)+'\n')
print('Generated SQL candidate and isolated schema fixture from metadata only.')
