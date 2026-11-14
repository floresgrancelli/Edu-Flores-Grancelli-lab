import assert from 'node:assert/strict';
import {resizeDiaryFood} from '../pilot/diary-food-edit.js';
const food={id:'egg',name:'Huevo',qty:100,unit:'g',displayQty:2,displayUnit:'unidad',k:148,p:12.4,c:.96,f:9.96,fi:0,source:'Stored reference'};
const before=JSON.stringify(food),edited=resizeDiaryFood(food,3);
assert.equal(edited.qty,150);assert.equal(edited.k,222);assert.equal(edited.displayQty,3);assert.equal(edited.source,food.source);assert.equal(JSON.stringify(food),before);
for(const q of [0,-1,NaN,Infinity,0.25,1.25,101])assert.throws(()=>resizeDiaryFood(food,q));
assert.throws(()=>resizeDiaryFood({...food,displayQty:undefined,qty:0},2));
assert.throws(()=>resizeDiaryFood({...food,k:NaN},2));
const recipe={id:'recipe',qty:1,unit:'porción',k:200,p:10,c:20,f:8,fi:1,ingredients:[{foodId:'egg',grams:100}]};
assert.equal(resizeDiaryFood(recipe,1.5).k,300);assert.deepEqual(resizeDiaryFood(recipe,1.5).ingredients,recipe.ingredients);assert.throws(()=>resizeDiaryFood(recipe,21));
const drink={name:'Café · 100 ml leche',qty:200,unit:'ml',k:50,p:2,c:5,f:2,fi:0,ingredients:{milk_id:'milk',milk_ml:100,sugar_g:4}};
const half=resizeDiaryFood(drink,100);assert.equal(half.k,25);assert.equal(half.ingredients.milk_ml,50);assert.equal(half.ingredients.sugar_g,2);assert.equal(drink.ingredients.milk_ml,100);assert.doesNotMatch(half.name,/100 ml leche/);
const zero={qty:200,unit:'ml',k:0,p:0,c:0,f:0,fi:0};assert.equal(resizeDiaryFood(zero,300).k,0);
console.log('PASS recorded portion editing: immutable snapshot, whole units, recipe servings, personalized drink ratios, bounds and zero calories');

const halfUnit=resizeDiaryFood(food,0.5);assert.equal(halfUnit.displayQty,0.5);assert.equal(halfUnit.qty,food.qty*0.5/food.displayQty);assert.equal(halfUnit.k,Math.round(food.k*0.5/food.displayQty*100)/100);
