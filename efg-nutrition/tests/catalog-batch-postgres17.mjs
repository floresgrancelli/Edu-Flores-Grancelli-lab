// Disposable PostgreSQL 17 only. Never accepts hosted credentials.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const env=process.env;
assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.PGHOST,'127.0.0.1');assert.equal(env.PGPASSWORD,'local_qa_only');assert.equal(env.PGDATABASE,'postgres');
const dir=new URL('../docs/catalog-batch-20261113/',import.meta.url),read=n=>readFileSync(new URL(n,dir),'utf8');
const sql=s=>execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',env,maxBuffer:5e6}).trim();
const literal=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const old=JSON.parse(read('baseline-catalog.json')),now=JSON.parse(readFileSync(new URL('../docs/catalog-batch-two-20261113/baseline-catalog.json',import.meta.url)));
const goal={kcal:2100,protein_g:150,carb_g:225,fat_g:70,fiber_g:28};
const guide=(catalog,id)=>({kind:'flexible_meal_guide',version:2,catalogVersion:catalog.version,meals:[{slot:'almuerzo',items:[{...catalog.foods[id],qty:37.5}]},{slot:'cena',items:[{...catalog.foods.chicken,qty:100}]}]});
const canonical=g=>JSON.parse(sql('select efg_private.canonical_catalog_guide('+literal(g)+','+literal(goal)+');'));
sql('create role anon;create role authenticated;create schema efg_private;'+read('baseline.sql'));
assert.match(sql('show server_version;'),/^17\./);
const prior=canonical(guide(old,'chicken'));
sql(read('forward.sql'));
assert.deepEqual(canonical(guide(old,'chicken')),prior,'Existing version and quantities remain exact');
for(const id of Object.keys(now.foods).filter(id=>!old.foods[id])){
 const g=guide(now,id),result=canonical(g);assert.equal(result.meals[0].items[0].qty,37.5);
 for(const key of ['k','p','c','f','fi'])assert.ok(Math.abs(result.catalogTotals[key]-(now.foods[id][key]*37.5+now.foods.chicken[key]*100))<1e-8);
}
const rejects=(g,msg)=>{assert.throws(()=>canonical(g),msg);};
for(const mutate of [g=>g.catalogVersion='unknown',g=>g.meals[0].items[0].id='unknown',g=>g.meals[0].items[0].unit='ml',g=>g.meals[0].items[0].qty=-1,g=>g.meals[0].items[0].k+=1]){const g=guide(now,'spinach_raw');mutate(g);rejects(g,'Keep existing validation');}
const archivedNew=guide(now,'spinach_raw');archivedNew.catalogVersion=old.version;rejects(archivedNew,'New foods cannot enter old snapshot');
for(const role of ['anon','authenticated'])for(const fn of ['guide_catalog_snapshot()','guide_catalog_snapshot_25b60eacf6e38ba7()','canonical_catalog_guide(jsonb,jsonb)'])assert.equal(sql("select has_function_privilege('"+role+"','efg_private."+fn+"','execute');"),'f');
// Exact baseline guards prevent accidental reapplication and drift overwrite.
assert.throws(()=>sql(read('forward.sql')));
sql(read('rollback.sql'));assert.deepEqual(canonical(guide(old,'chicken')),prior);rejects(guide(now,'spinach_raw'),'Rollback refuses new client version');
console.log('PASS PG17: old drafts unchanged; all25 new foods; exact totals; tamper/unit/version rejection; private privileges; transactional guard and rollback. Disposable only; hosted migration NOT applied.');
