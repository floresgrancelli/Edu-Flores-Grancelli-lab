import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {exportGuideCatalog} from './export-guide-catalog.mjs';
const root=new URL('../',import.meta.url),out=new URL('docs/catalog-release/',root);
mkdirSync(out,{recursive:true});
const snapshot=exportGuideCatalog();
writeFileSync(new URL('catalog/guide-catalog.json',root),JSON.stringify(snapshot,null,2)+'\n');
const payload=JSON.stringify(snapshot);assert.ok(!payload.includes('$ncc_catalog_payload$'));
const snapshotSql=`create or replace function efg_private.guide_catalog_snapshot()
returns jsonb language sql immutable parallel safe set search_path='' as $fn$
select $ncc_catalog_payload$${payload}$ncc_catalog_payload$::jsonb
$fn$;
revoke all on function efg_private.guide_catalog_snapshot() from public,anon,authenticated;\n`;
// This is an exact copy of the current hosted audited function, not a rewrite.
// The original is retained for rollback and checked before application.
const base=readFileSync(new URL('base-atomic.sql',out),'utf8');
let atomic=base;
const change=(old,replacement)=>{assert.equal(atomic.split(old).length-1,1,'Atomic marker moved: '+old);atomic=atomic.replace(old,replacement);};
change(' v_guide:=v_draft.guide_proposal;',` v_guide:=v_draft.guide_proposal;
 if v_guide ? 'catalogVersion' then
  v_guide:=efg_private.canonical_catalog_guide(v_guide,v_goal);
  v_guide:=v_guide||jsonb_build_object('healthContext',efg_private.guide_health_context(p_student,v_org,v_coach,v_guide));
 end if;`);
change('(case when v_is_qa then efg_private.coach_guide_foods_verified(v_guide)',"(case when v_guide ? 'catalogVersion' then true when v_is_qa then efg_private.coach_guide_foods_verified(v_guide)");
change(' if v_is_qa then\n  v_food_ids:='," if v_is_qa and not(v_guide ? 'catalogVersion') then\n  v_food_ids:=");
change(" set status='published',updated_at=pg_catalog.clock_timestamp()", " set status='published',guide_proposal=v_guide,updated_at=pg_catalog.clock_timestamp()");
const forward=snapshotSql+'\n'+readFileSync(new URL('validation.sql',out),'utf8')+'\n'+readFileSync(new URL('optional-health.sql',out),'utf8')+'\n'+atomic+';\n';
writeFileSync(new URL('forward.sql',out),forward);
writeFileSync(new URL('rollback.sql',out),base+';\n'+readFileSync(new URL('base-health.sql',out),'utf8')+';\n');
console.log(JSON.stringify({catalog:snapshot.version,foods:Object.keys(snapshot.foods).length,forwardBytes:Buffer.byteLength(forward)}));
