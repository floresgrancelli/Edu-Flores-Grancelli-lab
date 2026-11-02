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
console.log('PASS RECIPE CATALOG: 12 editorial + owner-scoped recipes, 0 cross-account leaks, portion-based diary and planner contracts.');
