// Pure unit regression, no SQL/HTTP/Docker; use real captured identity arguments.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observedFunctionIdentityQuery,verifyObservedFunction,q} from './snapshot.mjs';
const m=JSON.parse(readFileSync(new URL('../evidence/hosted-metadata-20261101-2212.json',import.meta.url),'utf8'));
const f=m.functions.functions.find(x=>x.proname==='efg_save_coach_plan_draft');
assert.ok(f);assert.match(f.arguments,/p_intake_updated_at timestamp with time zone/);
const query=observedFunctionIdentityQuery(f);
assert.ok(query.includes('pg_get_function_identity_arguments(p.oid)='+q(f.arguments)));
assert.ok(query.includes('n.nspname='+q(f.nspname))&&query.includes('p.proname='+q(f.proname)));
assert.ok(!query.includes('::regprocedure'),'No guessed signature cast');
let calls=0;verifyObservedFunction(s=>{assert.equal(s,query);calls++;return JSON.stringify([{digest:f.definition_digest}]);},f);assert.equal(calls,1);
for(const rows of [[],[{digest:f.definition_digest},{digest:f.definition_digest}],[{digest:'wrong'}]])assert.throws(()=>verifyObservedFunction(()=>JSON.stringify(rows),f));
for(const named of m.functions.functions){assert.ok(observedFunctionIdentityQuery(named).includes(q(named.arguments)));}
console.log('PASS identity lookup regression: real named timestamp identity, exact scope, unique digest; zero/multiple/wrong digest rejected. Pure unit only.');
