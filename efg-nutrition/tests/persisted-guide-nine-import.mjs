// Server-side disposable import only; never accepts browser records or credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {literal as q} from './helpers/coach119-local.mjs';
export function compositionEvidenceId(rawDigest){
 assert.match(rawDigest,/^sha256:[a-f0-9]{64}$/,'Exact raw SHA256 digest required');
 const id='sha256_'+rawDigest.slice('sha256:'.length);
 // Exact existing coach_reviewed_foods CHECK, not a schema change.
 assert.match(id,/^[a-zA-Z0-9_-]{8,120}$/);
 return id;
}
export function importNine(sql){
 const test=fileURLToPath(new URL('./official-complete-guide-private.mjs',import.meta.url));
 const result=JSON.parse(execFileSync(process.execPath,['--experimental-default-type=module',test,
 'efg-nutrition/tests/evidence/fdc-official-20261101.zip','efg-nutrition/tests/evidence/fdc-additional-five-20261101.json',
 'a2160a75e37bf36dd2fc4b267a6efd17a15558c48949762da09ad3ec69da3f39'],
 {env:{...process.env,EFG_EXPORT_PRIVATE_GUIDE_INPUT:'1'},encoding:'utf8',maxBuffer:2*1024*1024}));
 assert.equal(result.status,'PASS_OFFICIAL_NINE_PRIVATE_SCENARIO');
 const input=result.qaInput;assert.equal(input.catalog.length,9);
 assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'),'0');
 let overlay=readFileSync(new URL('./sql/automatic-composition-local-overlay.sql',import.meta.url),'utf8');
 const oldDigest='sha256:ea088c8c4e30729a10aa0512cfe57365f91c5d0c53e83490a1ec296a4f5ebcae';
 const newDigest='sha256:a2160a75e37bf36dd2fc4b267a6efd17a15558c48949762da09ad3ec69da3f39';
 const oldIds=new Set(['apple','oats_raw','spinach_cooked','yogurt_greek_light']);
 const sourceDigest=f=>oldIds.has(f.id)?oldDigest:newDigest;
 overlay=overlay.replaceAll('official-three-records-v1','official-nine-records-v1');
 overlay=overlay.replace("or p->>'archiveDigest' is distinct from '"+oldDigest+"'","or p->>'archiveDigest' not in ('"+oldDigest+"','"+newDigest+"')");
 const start=overlay.indexOf(' case food.food_id'),end=overlay.indexOf(' end case;',start);
 assert.ok(start>0&&end>start);
 const cases=input.catalog.map(f=>{
  const id=f.composition.url.split('/').at(-1);
  return ` when ${q(f.id)} then expected_id:=${q(id)};expected_preparation:=${q(f.preparation)};expected_description:=${q(f.name)};
   if p->>'rawDigest' is distinct from ${q(f.composition.id)} or p->>'archiveDigest' is distinct from ${q(sourceDigest(f))} then return false; end if;`;
 }).join('\n');
 overlay=overlay.slice(0,start)+' case food.food_id\n'+cases+'\n else return false;\n'+overlay.slice(end);
 const inserts=input.catalog.map(f=>{
  const c=f.composition,id=c.url.split('/').at(-1);
  const provenance={schemaVersion:1,provider:'usda_fdc',foodId:f.id,recordId:id,description:f.name,
   preparation:f.preparation,preparationEvidenceId:`FDC-${id}-description`,unit:'g',basisGrams:100,dataType:'SR Legacy',
   sourceUrl:c.url,sourcePublishedAt:c.sourcePublishedAt,capturedAt:c.sourceCapturedAt,perUnit:c.perUnit,
   rawDigest:c.id,archiveDigest:sourceDigest(f),mappingVersion:'official-nine-records-v1',parserVersion:'ncc-fdc-selected-export-v1',
   importMode:'approved_official_archive',importRunId:'isolated_'+process.env.GITHUB_RUN_ID,
   policyVersion:'ISOLATED_ARCHIVE_REVIEW_1H_V1',test_only:false};
  return `insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,
   evidence_status,automated_validated_at,expires_at,automatic_provenance) values(${q(f.id)},'official-nine-records-v1','g',
   ${['k','p','c','f','fi'].map(k=>f[k]).join(',')},'validated_composition',${q(c.url)},${q(compositionEvidenceId(c.id))},
   'automated_validated',now(),now()+interval '1 hour',${q(JSON.stringify(provenance))}::jsonb);`;
 }).join('\n');
 sql('begin;\n'+overlay+'\n'+inserts+'\ncommit;');
 assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods source_food where efg_private.coach_food_evidence_current(source_food)'),'9');
 return {template:input.template,goal:{...input.goal,goal_type:'maintenance'},ids:input.catalog.map(f=>f.id)};
}
