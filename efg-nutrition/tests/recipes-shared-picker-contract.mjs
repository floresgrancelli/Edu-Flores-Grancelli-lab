import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIT_RECIPES} from '../pilot/fit-recipes.js';
import {recipeCatalogEntries} from '../pilot/recipe-catalog-bridge.js';
import {allPlannerFoods,proposeMeal} from '../pilot/planner.js';
const foodIds=[...new Set(FIT_RECIPES.flatMap(r=>r.ingredients.map(i=>i[0])))];
const foods=foodIds.map(id=>({id,name:id,category:'protein',unit:'g',k:1,p:.1,c:.2,f:.01,fi:.005}));
const own={id:'00000000-0000-4000-8000-000000000001',name:'Mi vianda',portions:3,
 ingredients:[{foodId:foodIds[0],grams:150}],totals:{k:150,p:15,c:30,f:1.5,fi:.75}};
const all=recipeCatalogEntries({foods,fitRecipes:FIT_RECIPES,personalRecipes:[own],userId:'student-A'});
assert.equal(all.filter(f=>f.id.startsWith('fit-recipe:')).length,12);
assert.equal(all.length,13);
const personal=all.find(f=>f.id.startsWith('custom-recipe:'));
assert.ok(personal&&personal.privateRecipe);
assert.equal(personal.unit,'porción');
assert.equal(personal.recipeBatchPortions,3);
assert.equal(personal.ownerStudentId,'student-A');
assert.equal(all.find(f=>f.id==='fit-recipe:pancakes').recipeBatchPortions,2);
assert.equal(personal.category,'recipe');
assert.equal(personal.k,50);
assert.equal(personal.p,5);
assert.equal(personal.fi,.25);
assert.deepEqual(personal.recipeIngredients,own.ingredients);
assert.equal(recipeCatalogEntries({foods,fitRecipes:FIT_RECIPES,personalRecipes:[own],userId:null}).length,12);
assert.equal(recipeCatalogEntries({foods,fitRecipes:FIT_RECIPES,personalRecipes:[{...own,portions:0}],userId:'student-A'}).length,12);
assert.ok(allPlannerFoods([...foods,...all],[...foods,...all].map(x=>x.id)).some(x=>x.id===personal.id));
const proposal=proposeMeal({foods:[...foods,...all],approved:[personal.id],slot:'merienda',
 remaining:{k:200,p:20,c:50,f:5,fi:1},selections:{'merienda|protein':personal.id}});
assert.equal(proposal.rows[0].food.id,personal.id);
assert.ok(proposal.rows[0].grams<=4&&proposal.rows[0].grams>=0);
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const planner=readFileSync(new URL('../pilot/planner.js',import.meta.url),'utf8');
for(const snippet of [
 'function selectableFoods(){','recipeCatalogEntries({','function recipeFoodSignal(','return selectableFoods().map(f=>f.id)',
 'const entry=attachRecipeSnapshot(normItem(f,grams,slot),f)',
 'const item=attachRecipeSnapshot(normItem(row.food,grams,slot),row.food)',
 'allPlannerFoods(selectableFoods(),allowedFoods())',
 'const catalog=selectableFoods();'
])assert.ok(app.includes(snippet),'Missing real-picker integration: '+snippet);
assert.match(planner,/if\(food\?\.unit==='porción'\)return 4/);
assert.match(planner,/if\(food\?\.unit==='porción'\)return 0\.5/);

const rpcSQL=readFileSync(new URL('../migrations/20261102_coach_shared_student_recipes_NOT_APPLIED.sql',import.meta.url),'utf8');
for(const guard of [
 'security definer set search_path=\'\'',
 'p_student uuid',
 "coach_profile.role='coach'",
 "coach_profile.active=true",
 "o.coach_id=v_coach",
 'efg_private.coach_has_student(p_student)',
 'efg_private.coach_pilot_share_active(p_student,v_org)',
 "i.completed_version='coach_major_2026_r1'",
 'i.shared_at is not null',
 'where recipe.student_id=p_student',
 'limit 30',
 'revoke all on function public.efg_coach_shared_student_recipes',
 'from public,anon,authenticated'
])assert.ok(rpcSQL.includes(guard),'Missing private recipe server authorization: '+guard);
assert.doesNotMatch(rpcSQL,/create policy|alter policy|grant select on public\.efg_personal_recipes/i,
 'Do not broaden the owner-only personal recipe RLS table');
import {loadCoachSharedStudentRecipes} from '../pilot/coach-shared-recipes-read-client.js';
const linkedCoach='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',linkedStudent='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',linkedOrg='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ownerProfile={user_id:linkedCoach,role:'coach',active:true};
const authorized={
 id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',student_id:linkedStudent,
 organization_id:linkedOrg,name:'Mi receta',portions:2,
 ingredients:[{foodId:'egg',grams:100}],totals:{k:148,p:12.4,c:.96,f:9.96,fi:0}
};
function scopedFake({response=[authorized],swap=false}={}){
 let reads=0;
 return {auth:{getUser:async()=>({data:{user:{id:swap&&++reads>=2?linkedStudent:linkedCoach}},error:null})},
 rpc:async(name,payload)=>{assert.equal(name,'efg_coach_shared_student_recipes');assert.equal(payload.p_student,linkedStudent);return {data:response,error:null};}};
}
const authorizedRead=await loadCoachSharedStudentRecipes(scopedFake(),
 {profile:ownerProfile,studentId:linkedStudent,organizationId:linkedOrg});
assert.equal(authorizedRead.recipes.length,1);
assert.equal(authorizedRead.recipes[0].name,'Mi receta');
assert.equal(authorizedRead.source,'SIGNED_COACH_SCOPED_RPC');
await assert.rejects(loadCoachSharedStudentRecipes(scopedFake({swap:true}),
 {profile:ownerProfile,studentId:linkedStudent,organizationId:linkedOrg}),/sesión cambió/);
await assert.rejects(loadCoachSharedStudentRecipes(scopedFake({response:[{...authorized,organization_id:linkedStudent}]}),
 {profile:ownerProfile,studentId:linkedStudent,organizationId:linkedOrg}),/no corresponde/);
await assert.rejects(loadCoachSharedStudentRecipes(scopedFake(),
 {profile:{...ownerProfile,role:'student'},studentId:linkedStudent,organizationId:linkedOrg}),/verificadas/);
const emptyShared=await loadCoachSharedStudentRecipes(scopedFake({response:[]}),
 {profile:ownerProfile,studentId:linkedStudent,organizationId:linkedOrg});
assert.deepEqual(emptyShared.recipes,[]);
console.log('PASS GU-06 STAGED: personal recipes require signed scoped coach RPC and opt-in; no owner-table RLS widening and no hosted writes.');

console.log('PASS RECIPE CATALOG: 12 editorial + owner-scoped recipes, 0 cross-account leaks, portion-based diary and planner contracts.');
