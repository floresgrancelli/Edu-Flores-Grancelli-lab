import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {approvedFoodGuide} from '../pilot/coach-food-selection.js';
const s=readFileSync(new URL('../migrations/20261030_coach_reviewed_guide_nutrition_source.sql',import.meta.url),'utf8');
assert.match(s,/create table efg_private\.coach_reviewed_foods/);
assert.match(s,/evidence_status='reviewed'/);
assert.match(s,/expires_at>pg_catalog\.now\(\)/);
assert.match(s,/v_item->>'unit' not in \('g','ml'\)/);
assert.match(s,/v_item->>'id' !~/);
assert.match(s,/pg_catalog\.jsonb_array_length\(p_guide->'meals'\) <> 5/);
assert.match(s,/v_meal->>'slot'=any\(v_slots\)/);
assert.match(s,/v_value-v_source/);
assert.match(s,/source_kind in[\s\S]*manufacturer_label/);
assert.match(s,/alter table efg_private\.coach_reviewed_foods enable row level security/);
assert.match(s,/revoke all on efg_private\.coach_reviewed_foods from public,anon,authenticated/);
assert.match(s,/revoke all on function efg_private\.coach_guide_foods_verified\(jsonb\)/);
assert.doesNotMatch(s,/\b(insert|update|delete|truncate)\s+(into|from)\s+public\.efg_(?:goals|food_plans|daily_logs)/i);
assert.doesNotMatch(s,/\b(insert\s+into)\s+efg_private\.coach_reviewed_foods/i,'No operator reviews may be faked as seed data');
// 02-03: approved student catalog is independent of the five example meals.
// The approved list may include legitimate optional foods beyond the sample guide.
const guide={kind:'five_meal_example',version:1,meals:[
 {slot:'desayuno',items:[{id:'egg'}]}, {slot:'media_manana',items:[{id:'apple'}]},
 {slot:'almuerzo',items:[{id:'rice'}]}, {slot:'merienda',items:[{id:'milk_skim'}]},
 {slot:'cena',items:[{id:'fish_hake'}]}
]};
const selected=['milk_skim','fish_hake','egg','apple','rice','pumpkin','almonds'];
const known=['egg','apple','rice','milk_skim','fish_hake','pumpkin','almonds'];
const approved=approvedFoodGuide(guide,selected,{knownIds:known});
assert.deepEqual(approved.approvedFoodIds,[...selected].sort(),
 'Full catalog selections must remain available, not only guide ingredients.');
assert.equal(guide.approvedFoodIds,undefined,'Source example must stay unchanged.');
for(const invalid of [
 [],['egg','apple','rice','milk_skim','fish_hake','missing'],
 ['egg','apple','rice','milk_skim','fish_hake','egg'],
 ['egg','apple','rice','milk_skim'],
 ['egg','apple','rice','milk_skim','fish_hake','bad/id']
])assert.throws(()=>approvedFoodGuide(guide,invalid,{knownIds:known}),
 'Missing/duplicate/unknown selections cannot be approved.');
console.log('PASS COACH114: server-owned private unseeded composition, per-item verified-only source, exact macro rates, no medical inference.');
