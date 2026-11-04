import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyPilotReviewedSources,loadPilotReviewedGuide} from '../pilot/coach-reviewed-sources.js';
import {rebalanceGuidedDay,guideTotals,describeGuidedMeal} from '../pilot/guided-day.js';
import {validateCoachPlanProposal} from '../pilot/coach-plan-draft-client.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./evidence/p29c-qa-guide-v1.json',import.meta.url)));
const proposal=JSON.parse(fs.readFileSync(new URL('../docs/p29h-review/proposal.json',import.meta.url)));
// Synthetic approval metadata, NOT a human decision.
const now=Date.parse('2026-11-04T18:00:00Z');
const rows=proposal.rows.map(r=>({id:r.foodId,name:r.proposedIdentity,unit:r.unit,
 ...Object.fromEntries(Object.entries(r.per100Unit).map(([k,v])=>[k,Math.round(v/100*1e6)/1e6])),
 sourceUrl:r.sourceUrl,sourceApprovalId:'test_'+r.foodId,scope:'pilot_real',
 reviewedAt:'2026-11-04T17:00:00Z',expiresAt:'2099-01-01T00:00:00Z'}));
const original=JSON.stringify(fixture.guide);
const reviewed=applyPilotReviewedSources(fixture.guide,rows,{now});
assert.equal(JSON.stringify(fixture.guide),original);
assert.throws(()=>applyPilotReviewedSources(fixture.guide,rows.slice(1),{now}),/Falta revisión/);
for(const patch of [{scope:'QA_ONLY'},{expiresAt:'2026-11-04T17:00:00Z'},{reviewedAt:'2099-01-01'},{k:NaN},{unit:'ml'}]){
 const bad=structuredClone(rows);Object.assign(bad[0],patch);
 assert.throws(()=>applyPilotReviewedSources(fixture.guide,bad,{now}));
}
assert.throws(()=>applyPilotReviewedSources(fixture.guide,[...rows,rows[0]],{now}));
const next=rebalanceGuidedDay(reviewed,fixture.goal,{targetTolerance:.02});
const validated=validateCoachPlanProposal(fixture.goal,next).guide;
assert(validated.meals.flatMap(x=>x.items).every(x=>x.sourceApprovalId&&x.sourceUrl));
assert(next.meals.flatMap(m=>m.items).filter(x=>x.recipeComponent).every(x=>x.qty===100&&x.locked));
assert.match(describeGuidedMeal(next.meals.find(m=>m.slot==='cena')),/cocida y escurrida/);
const total=guideTotals(next).totals;for(const [k,g] of Object.entries({k:2500,p:150,c:322,f:68,fi:35}))assert(Math.abs(total[k]/g-1)<.04);
let current=true;
const client={rpc:async(name,args)=>{assert.equal(name,'efg_coach_pilot_food_sources');assert.equal(args.p_food_ids.length,13);return {data:rows,error:null};}};
await loadPilotReviewedGuide(client,{studentId:'synthetic',guide:fixture.guide,isCurrent:()=>current});
await assert.rejects(()=>loadPilotReviewedGuide({rpc:async()=>{current=false;return {data:rows};}},{studentId:'synthetic',guide:fixture.guide,isCurrent:()=>current}),/Cambió/);
current=true;
await assert.rejects(()=>loadPilotReviewedGuide({rpc:async()=>({error:{message:'offline'}})},{studentId:'synthetic',guide:fixture.guide,isCurrent:()=>current}),/No se pudieron/);
assert.equal(JSON.stringify(fixture.guide),original);
console.log('PASS P29W client: current real-scope references, missing/unit/expiry/future/NaN/duplicate rejection, immutable draft, source IDs survive save, locked recipe, preparation, recalculation <4%, stale-response and RPC failure. Synthetic approvals only.');
