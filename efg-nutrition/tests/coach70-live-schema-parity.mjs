// COACH70 · Assert ONLY schema metadata parity for 11 modeled tables.
// Source: read-only hosted information_schema capture, never actual users/rows.
// Requires disposable CI PostgreSQL and manifest; never contacts hosted DB.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const manifest=JSON.parse(readFileSync(new URL("./sql/coach70-live-schema-columns-20261030.json",import.meta.url),"utf8"));
assert.equal(manifest.project,"cyjvddhimbsfipjfctsl");
assert.equal(manifest.fixture_tables.length,11);
assert.equal(manifest.not_in_fixture.length,4);
assert.ok(manifest.fixture_tables.every(t=>Array.isArray(manifest.tables[t])));
if(!["127.0.0.1","localhost"].includes(process.env.PGHOST)||
 !["5432","54322"].includes(process.env.PGPORT)||
 !/^efg_(?:nut57_before|nut57_restored|nutrition_ephemeral)$/.test(process.env.PGDATABASE||"")){
 throw Error("COACH70 STOP: must use an approved ephemeral local PostgreSQL CI database.");
}
const names=manifest.fixture_tables.map(s=>"'"+s+"'").join(",");
const sql=`select coalesce(json_agg(json_build_object(
 'table',table_name,'column',column_name,'type',udt_name,
 'nullable',is_nullable='YES','default',case when column_default is null then null else 'present' end
 ) order by table_name,ordinal_position),'[]'::json)
 from information_schema.columns
 where table_schema='public' and table_name in (${names});`;
const result=spawnSync("psql",["-X","-Atq","-v","ON_ERROR_STOP=1","-c",sql],
 {encoding:"utf8",timeout:15000,env:process.env});
assert.equal(result.status,0,(result.stderr||result.stdout||"Postgres failure").slice(0,900));
const actual=JSON.parse(result.stdout.trim());
const observed={};
for(const x of actual)(observed[x.table]??=[]).push({
 column:x.column,type:x.type,nullable:x.nullable,default:x.default});
const errors=[];
for(const table of manifest.fixture_tables){
 const exp=manifest.tables[table],got=observed[table]||[];
 const by=new Map(got.map(x=>[x.column,x]));
 for(const e of exp){
  const found=by.get(e.column);
  if(!found){errors.push(table+"."+e.column+" missing");continue}
  for(const field of ["type","nullable","default"])
   if(found[field]!==e[field])
    errors.push(table+"."+e.column+" "+field+" hosted="+JSON.stringify(e[field])+" synthetic="+JSON.stringify(found[field]));
 }
 for(const col of got)if(!exp.some(e=>e.column===col.column))
   errors.push(table+"."+col.column+" extra synthetic column");
}
assert.deepEqual(errors,[],"COACH70 production-shape metadata mismatch: "+errors.join(" | "));
console.log("PASS COACH70: "+manifest.fixture_tables.length+" core synthetic tables match 2026-10-30 hosted column names/types/nullability/default presence. This is PARTIAL parity only: "+manifest.not_in_fixture.join(", ")+" are NOT represented; no data/constraints/triggers/policies or production restoration audited.");
