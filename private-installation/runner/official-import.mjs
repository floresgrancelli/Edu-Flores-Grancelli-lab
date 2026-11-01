// Uses the already reviewed raw-evidence harness, never the prior SQL overlay.
import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {q} from './snapshot.mjs';
export function officialInput(){
 const args=['--experimental-default-type=module','efg-nutrition/tests/official-complete-guide-private.mjs',
 'efg-nutrition/tests/evidence/fdc-official-20261101.zip','efg-nutrition/tests/evidence/fdc-additional-five-20261101.json',
 'a2160a75e37bf36dd2fc4b267a6efd17a15558c48949762da09ad3ec69da3f39'];
 const data=JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8',maxBuffer:3e6,env:{...process.env,EFG_EXPORT_PRIVATE_GUIDE_INPUT:'1'}}));
 assert.equal(data.status,'PASS_OFFICIAL_NINE_PRIVATE_SCENARIO');assert.equal(data.qaInput.catalog.length,9);return data.qaInput;
}
export function installOfficialFixture(sql,input){
 const manifest={},rows=[];
 for(const f of input.catalog){
  const c=f.composition,id=c.url.split('/').at(-1);assert.match(c.id,/^sha256:[a-f0-9]{64}$/);
  const old=['apple','oats_raw','spinach_cooked','yogurt_greek_light'].includes(f.id);
  const p={schemaVersion:1,provider:'usda_fdc',foodId:f.id,recordId:id,description:f.name,preparation:f.preparation,
   preparationEvidenceId:`FDC-${id}-description`,unit:'g',basisGrams:100,dataType:'SR Legacy',sourceUrl:c.url,
   sourcePublishedAt:c.sourcePublishedAt,capturedAt:c.sourceCapturedAt,perUnit:c.perUnit,rawDigest:c.id,
   archiveDigest:'sha256:'+(old?'ea088c8c4e30729a10aa0512cfe57365f91c5d0c53e83490a1ec296a4f5ebcae':'a2160a75e37bf36dd2fc4b267a6efd17a15558c48949762da09ad3ec69da3f39'),
   mappingVersion:'official-nine-records-v1',parserVersion:'ncc-fdc-selected-export-v1',importMode:'approved_official_archive',
   importRunId:'isolated_'+process.env.GITHUB_RUN_ID,policyVersion:'ISOLATED_REVIEW_ONE_HOUR',test_only:false};
  manifest[f.id]=structuredClone(p);
  const values=['k','p','c','f','fi'].map(k=>{assert.ok(Number.isFinite(f[k]));assert.equal(f[k],c.perUnit[k]);return f[k];});
  rows.push(`insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,automated_validated_at,expires_at,automatic_provenance) values(${q(f.id)},${q(p.mappingVersion)},'g',${values.join(',')},'validated_composition',${q(c.url)},${q('sha256_'+c.id.slice(7))},'automated_validated',now(),now()+interval '1 hour',${q(JSON.stringify(p))}::jsonb);`);
 }
 assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'),'0');
 // This operating policy is exclusively a disposable test value, not a USDA freshness claim.
 sql(`begin; insert into efg_private.nutrition_import_policies values('ISOLATED_REVIEW_ONE_HOUR',true,interval '1 hour','official-nine-records-v1','ncc-fdc-selected-export-v1',${q(JSON.stringify(manifest))}::jsonb,now()); ${rows.join('\n')} commit;`);
 assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods source_food where efg_private.coach_food_evidence_current(source_food)'),'9');
 return input.catalog.map(f=>f.id);
}
