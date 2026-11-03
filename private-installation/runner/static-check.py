import ast,re,json
from pathlib import Path
r=Path(__file__).resolve().parents[1]
for f in (r/'runner').glob('*.py'):ast.parse(f.read_text(),str(f))
s=(r/'runner/baseline-generated.sql').read_text()
assert 'CREATE OR REPLACE FUNCTION efg_private.coach_pilot_share_active(' not in s
assert 'CREATE OR REPLACE FUNCTION efg_private.student_belongs_to_coach(' in s
assert 'CREATE OR REPLACE FUNCTION efg_private.coach_notify_shared_relaunch_intake()' in s
assert s.count('CREATE POLICY')==22 # 21 observed plus explicit support profile policy
assert 'REVOKE ALL ON' in s
assert 'never use stubs' in (r/'runner/prerequisites.mjs').read_text()
main=(r/'runner/run.mjs').read_text()
assert main.index('reviewedDependencies(')<main.index('localContext()')
assert 'Promise.all([publish(coach.token),publish(coach.token)])' in main
assert 'LOCAL_INJECTED_FINAL_FAILURE' in main
assert 'assert.deepEqual(rowSnapshot(sql,mutationTables),before' in main
iso=(r/'runner/isolation.mjs').read_text()
assert 'pg_control_system()' in iso and 'docker' in iso and 'NetworkSettings.Networks' in iso
job=(r/'runner/job-proposal.yml').read_text()
assert 'stop --no-backup' in job and 'docker volume ls' in job and '|| true' not in job
deps=json.loads((r/'required-dependencies-reviewed.json').read_text())
import hashlib
assert len(deps)==2
assert {d['signature'] for d in deps}=={'efg_private.student_belongs_to_coach(uuid)','efg_private.coach_notify_shared_relaunch_intake()'}
supplement=r/'evidence/hosted-metadata-supplement-20261101-2247.json'
assert len(supplement.read_bytes())==2953
assert hashlib.sha256(supplement.read_bytes()).hexdigest()=='e5dc78563215239466e3d8251fd719dd35446055d92db009ea358a13203a8699'
original={f['proname']:f for f in json.loads(supplement.read_text())['functions']}
for d in deps:
 source=original[d['signature'].split('.')[1].split('(')[0]]
 assert d['definition']==source['definition'] and d['md5']==source['definition_digest']
 assert d['owner']==source['owner']=='postgres' and d['prosecdef']==source['prosecdef']==True
 assert d['proconfig']==source['proconfig']==['search_path=""']
 assert hashlib.sha256(d['definition'].encode()).hexdigest()==d['sha256']
 assert hashlib.md5(d['definition'].encode()).hexdigest()==d['md5']
 assert d['definition'].strip() in s
 assert d['acl']==(['postgres=X/postgres','authenticated=X/postgres'] if 'student_belongs_to_coach' in d['signature'] else ['postgres=X/postgres'])
extra=(r/'runner/additional-cases.mjs').read_text()
for case in ['forged_guc','marker_other_actor','current health document replaced','expired official composition','second explicit publication']:
 assert case in extra
assert 'await negativePublicationCases(' in main and 'await secondPublicationCase(' in main
assert 'verifyPermissions(sql,permissionsBefore)' in main
assert 'second.nextRevision' in main
assert 'nextRevision:6' in extra
acl=(r/'runner/acl-contract.mjs').read_text()
assert 'Complete new-table set' in acl and 'Complete new-RPC/helper set' in acl
assert 'No default ACL changes' in acl and 'No new column grants' in acl and 'RESTRICTIVE' in acl
print('PASS Python AST and static runner wiring. Node/SQL/JWT NOT EXECUTED; two exact definitions/ACL integrated; final runner review pending.')
