// Private opt-in, existing disposable runner only. Official composition, no human/student data import.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {localContext,literal as q} from './helpers/coach119-local.mjs';
import {GUIDE_FDC_IDS,importSelectedFdcExport} from '../pilot/fdc-selected-export.js';

assert.equal(process.env.EFG_QA_AUTO_COMPOSITION,'1','Explicit isolated opt-in required');
assert.match(process.env.GITHUB_RUN_ID||'',/^\d+$/,'Actual CI run identifier required');
const {sql}=localContext(); // genuine CI, localhost54321/54322, existing guards, no hosted creds.
assert.equal(sql("select to_regclass('efg_private.nut57_isolated_staging_marker') is not null"),'t');
assert.equal(sql("select count(*) from efg_private.coach_reviewed_foods where food_id in ('apple','oats_raw','spinach_cooked')"),'0');
const archive=process.env.EFG_OFFICIAL_FDC_ARCHIVE;
assert.ok(archive,'Reviewed official archive file required; no network fallback');
const loaded=JSON.parse(execFileSync('python3',[fileURLToPath(new URL('../tools/read-pinned-fdc-archive.py',import.meta.url)),archive],
 {encoding:'utf8',maxBuffer:2*1024*1024}));
const wanted=[171688,173904,173432,170894,168463];
const manifests=loaded.manifests.flatMap(m=>{assert.ok(Array.isArray(m.records));return m.records;});
assert.equal(manifests.length,5);assert.deepEqual(manifests.map(r=>r.fdcId).sort((a,b)=>a-b),[...wanted].sort((a,b)=>a-b));
const captures=new Map(manifests.map(r=>{
 assert.ok(typeof r.captureCompletedAtUTC==='string'&&Number.isFinite(Date.parse(r.captureCompletedAtUTC)));
 return [r.fdcId,r.captureCompletedAtUTC];
}));
// 02-03. Audit ALL FIVE immutable capture records independently of the three
// entries actually injected into an isolated SQL transaction below. These
// strict, documented identities must match the archive; the source cannot
// certify itself by supplying its own expected description.
const expectedArchive=[
 ['apple',171688,"Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",'raw'],
 ['oats_raw',173904,'Cereals, oats, regular and quick, not fortified, dry','raw'],
 ['milk_skim',173432,'Milk, nonfat, fluid, without added vitamin A and vitamin D (fat free or skim)','as_sold'],
 ['yogurt_greek_light',170894,"Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)",'as_sold'],
 ['spinach_cooked',168463,'Spinach, cooked, boiled, drained, without salt','cooked']
];
const archiveAudit=[];
for(const [foodId,fdcId,description,preparation] of expectedArchive){
 assert.equal(GUIDE_FDC_IDS[foodId],fdcId,'Mapping must use the pinned FDC identity');
 const captured=loaded.records[fdcId];assert.ok(captured,'No FDC bytes for '+fdcId);
 const raw=new TextEncoder().encode(captured.raw),record=JSON.parse(captured.raw);
 assert.equal(createHash('sha256').update(raw).digest('hex'),captured.sha256);
 assert.equal(record.fdcId,fdcId);assert.equal(record.dataType,'SR Legacy');
 assert.equal(record.description,description,'FDC identity/preparation mismatch for '+foodId);
 const capturedAt=captures.get(fdcId),now=Date.parse(capturedAt)+1800000;
 const mapping={schemaVersion:1,foodId,fdcId,expectedDescription:description,
  preparation,dataType:'SR Legacy',unit:'g',basisGrams:100,
  version:'official-capture-audit-v1',matchMethod:'pinned_record',
  preparationEvidenceId:'FDC-'+fdcId+'-exact-description'};
 const metadata={format:'fdc-detail-json-v1',release:'SR Legacy',
  sourceUrl:'https://api.nal.usda.gov/fdc/v1/food/'+fdcId,
  retrievedAt:capturedAt,validUntil:new Date(Date.parse(capturedAt)+3600000).toISOString(),
  basis:'per100g',basisEvidence:'FDC_SR_LEGACY_PER_100G'};
 const candidate=await importSelectedFdcExport({bytes:raw,mappings:[mapping],metadata,now});
 assert.equal(candidate.status,'import_report','FDC '+fdcId+' not a valid pinned record');
 assert.equal(candidate.results?.length,1);
 const item=candidate.results[0].result;
 assert.equal(item.status,'normalized_candidate','FDC '+fdcId+' did not normalize: '+(item.reason||'unknown'));
 assert.equal(item.publishable,false,'Archive normalization is never server approval');
 assert.equal(candidate.publishable,false,'No source may auto-publish');
 assert.ok(Object.values(item.perUnit).every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0));
 // A 100 g dairy reference cannot be repurposed as 100 mL without density
 // or a product label. A reviewer must supply separate volume evidence.
 if(foodId==='milk_skim'){
  const wrongUnit=await importSelectedFdcExport({bytes:raw,mappings:[{...mapping,unit:'ml'}],metadata,now});
  assert.equal(wrongUnit.status,'unknown','Do not silently convert milk from g to ml');
  assert.equal(wrongUnit.publishable,false);
 }
 archiveAudit.push({foodId,fdcId,validatedIdentity:true,normalizedPer100g:true,
  publishable:false,rawDigest:'sha256:'+captured.sha256,unit:'g'});
}
assert.equal(archiveAudit.length,5);
console.log('PASS PINNED FDC AUDIT: 5/5 exact records normalized per 100g; milk mL conversion BLOCKED; no hosted/catalog publication.');
console.log('FDC AUDIT JSON '+JSON.stringify({archiveDigest:loaded.archiveDigest,
 normalizedRecords:archiveAudit.length,serverReviewRecords:0,records:archiveAudit}));

const selections=[['apple',171688,"Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",'raw'],
 ['oats_raw',173904,'Cereals, oats, regular and quick, not fortified, dry','raw'],
 ['spinach_cooked',168463,'Spinach, cooked, boiled, drained, without salt','cooked']];
const rows=[];
for(const [foodId,fdcId,expectedDescription,preparation] of selections){
 const bytes=new TextEncoder().encode(loaded.records[fdcId].raw),record=JSON.parse(loaded.records[fdcId].raw);
 const capturedAt=captures.get(fdcId),fixtureClock=Date.parse(capturedAt)+1800000;
 // V7 requires a validity input: use a clearly isolated replay window for NORMALIZATION ONLY.
 // Database eligibility below uses actual import validation time and an explicit local review policy.
 const mapping={schemaVersion:1,foodId,fdcId,expectedDescription,preparation,dataType:'SR Legacy',unit:'g',basisGrams:100,
  version:'official-three-records-v1',matchMethod:'pinned_record',preparationEvidenceId:`FDC-${fdcId}-description`};
 const sourceUrl=`https://api.nal.usda.gov/fdc/v1/food/${fdcId}`;
 const imported=await importSelectedFdcExport({bytes,mappings:[mapping],now:fixtureClock,metadata:{
  format:'fdc-detail-json-v1',release:'SR Legacy',sourceUrl,retrievedAt:capturedAt,
  validUntil:new Date(Date.parse(capturedAt)+3600000).toISOString(),basis:'per100g',basisEvidence:'FDC_SR_LEGACY_PER_100G'}});
 const candidate=imported.results?.[0]?.result;assert.equal(candidate?.status,'normalized_candidate');
 const provenance={schemaVersion:1,provider:'usda_fdc',foodId,recordId:String(fdcId),description:record.description,
  preparation,preparationEvidenceId:mapping.preparationEvidenceId,unit:'g',basisGrams:100,dataType:'SR Legacy',
  sourceUrl,sourcePublishedAt:record.publicationDate,capturedAt,perUnit:candidate.perUnit,
  rawDigest:'sha256:'+createHash('sha256').update(bytes).digest('hex'),archiveDigest:loaded.archiveDigest,
  mappingVersion:mapping.version,parserVersion:'ncc-fdc-selected-export-v1',
  importMode:'approved_official_archive',importRunId:'isolated_'+process.env.GITHUB_RUN_ID,
  policyVersion:'ISOLATED_ARCHIVE_REVIEW_1H_V1',test_only:false};
 // test_only=false describes REAL source evidence, not permission to activate this isolated policy in production.
 rows.push({foodId,sourceUrl,perUnit:candidate.perUnit,provenance});
}
const overlay=readFileSync(new URL('./sql/automatic-composition-local-overlay.sql',import.meta.url),'utf8');
const before={foods:sql('select count(*) from efg_private.coach_reviewed_foods'),
 goals:sql('select count(*) from public.efg_goals'),
 publishFn:sql("select md5(pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure))")};
const inserts=rows.map(r=>`insert into efg_private.coach_reviewed_foods
 (food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,
  automated_validated_at,expires_at,automatic_provenance)
 values(${q(r.foodId)},'official-three-records-v1','g',${['k','p','c','f','fi'].map(k=>r.perUnit[k]).join(',')},
 'validated_composition',${q(r.sourceUrl)},${q('official_'+r.foodId+'_v1')},'automated_validated',
 now(),now()+interval '1 hour',${q(JSON.stringify(r.provenance))}::jsonb);`).join('\n');
// Use original gate on a STRUCTURAL five-slot probe, not a nutritionally adequate plan or publication.
const probe={kind:'five_meal_example',version:1,approvedFoodIds:rows.map(r=>r.foodId),
 meals:['desayuno','media_manana','almuerzo','merienda','cena'].map((slot,i)=>{
  const r=rows[i%3];return {slot,items:[{id:r.foodId,unit:'g',qty:100,...r.perUnit}]};
 })};
const probeSql=q(JSON.stringify(probe))+'::jsonb';
const checks=`
do $checks$
declare saved efg_private.coach_reviewed_foods%rowtype; good boolean; edit jsonb;
begin
 if (select count(*) from efg_private.coach_reviewed_foods source_row where food_id in ('apple','oats_raw','spinach_cooked')
  and efg_private.coach_food_evidence_current(source_row))<>3 then raise exception 'three official rows not eligible'; end if;
 if efg_private.coach_guide_foods_verified(${probeSql}) is distinct from true then raise exception 'automatic guide source gate failed'; end if;
 if cardinality(efg_private.coach119_reviewed_food_ids(${probeSql}))<>3 then raise exception 'automatic selected-food gate failed'; end if;
 -- Existing manual records must retain exactly their previous eligibility.
 if not exists(select 1 from efg_private.coach_reviewed_foods where evidence_status='reviewed')
 then raise exception 'manual regression fixture missing'; end if;
 if exists(select 1 from efg_private.coach_reviewed_foods source_row where evidence_status='reviewed'
  and efg_private.coach_food_evidence_current(source_row) is distinct from
   (reviewed_by is not null and reviewed_at is not null and reviewed_at<=now() and expires_at>now()))
 then raise exception 'manual evidence changed'; end if;
 select * into saved from efg_private.coach_reviewed_foods where food_id='apple';
 for edit in select value from jsonb_array_elements('[
  {"recordId":"173904"},{"description":"alias only"},{"preparation":"cooked"},
  {"sourceUrl":"https://example.org/171688"},{"unit":null},{"test_only":true},
  {"rawDigest":"broken"},{"capturedAt":"invalid"},{"schemaVersion":null},
  {"perUnit":{"k":999}},{"policyVersion":"TEST_ONLY"}]'::jsonb) loop
  update efg_private.coach_reviewed_foods set automatic_provenance=saved.automatic_provenance||edit where food_id='apple';
  if efg_private.coach_guide_foods_verified(${probeSql}) is distinct from false then raise exception 'inconsistent evidence accepted %',edit; end if;
  begin
   perform efg_private.coach119_reviewed_food_ids(${probeSql});raise exception 'selected-food gate accepted inconsistent evidence';
  exception when insufficient_privilege then null; end;
 end loop;
 update efg_private.coach_reviewed_foods set automatic_provenance=saved.automatic_provenance,
  automated_validated_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where food_id='apple';
 if efg_private.coach_guide_foods_verified(${probeSql}) then raise exception 'expired evidence accepted'; end if;
 update efg_private.coach_reviewed_foods set automated_validated_at=saved.automated_validated_at,
  expires_at=saved.expires_at,evidence_status='rejected' where food_id='apple';
 if efg_private.coach_guide_foods_verified(${probeSql}) then raise exception 'revoked evidence accepted'; end if;
 update efg_private.coach_reviewed_foods set evidence_status='automated_validated' where food_id='apple';
 if exists(select 1 from efg_private.coach_reviewed_foods where evidence_status='automated_validated' and reviewed_by is not null)
 then raise exception 'fabricated human reviewer'; end if;
end $checks$;
`;
const permissions=['anon','authenticated'].map(role=>`
set local role ${role};
do $client$
begin
 begin insert into efg_private.coach_reviewed_foods(food_id) values('client_injected');
  raise exception 'client insert allowed';exception when insufficient_privilege then null;end;
 begin update efg_private.coach_reviewed_foods set evidence_status='automated_validated' where food_id='apple';
  raise exception 'client update allowed';exception when insufficient_privilege then null;end;
 begin perform efg_private.coach_food_evidence_current(null::efg_private.coach_reviewed_foods);
  raise exception 'client validator allowed';exception when insufficient_privilege then null;end;
end $client$;
reset role;`).join('\n');
sql('begin;\n'+overlay+'\n'+inserts+'\n'+checks+'\n'+permissions+`
do $no_plan$
begin
 if (select count(*) from public.efg_goals)<>${Number(before.goals)} then raise exception 'import approved a plan'; end if;
 if md5(pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure))<>${q(before.publishFn)}
 then raise exception 'publish authorization changed'; end if;
end $no_plan$;
rollback;`);
assert.equal(sql('select count(*) from efg_private.coach_reviewed_foods'),before.foods);
assert.equal(sql("select count(*) from pg_attribute where attrelid='efg_private.coach_reviewed_foods'::regclass and attname='automatic_provenance' and not attisdropped"),'0');
assert.equal(sql("select md5(pg_get_functiondef('public.efg_publish_coach_plan_draft_atomic(uuid,bigint,uuid)'::regprocedure))"),before.publishFn);
console.log('PASS isolated official three-food import, both evidence gates, negative provenance cases, client SQL denial, unchanged plan RPC and transaction rollback. No complete/clinical guide published. Existing signed A/B suite remains separate evidence.');
