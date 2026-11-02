import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateGuideFood} from '../reference/guide-compatibility.mjs';
const fixture=JSON.parse(readFileSync(new URL('./common-parity-cases.json',import.meta.url),'utf8'));
const now=Date.parse('2026-11-01T12:00:00Z');
const base={status:'verified',id:'TEST_ONLY-evidence',url:'https://example.invalid/TEST_ONLY',foodId:fixture.food.id,preparation:'raw',productId:null,observedAt:'2026-11-01T00:00:00Z',expiresAt:'2026-11-02T00:00:00Z'};
const food={...fixture.food,composition:{...base,unit:'g',perUnit:Object.fromEntries(['k','p','c','f','fi'].map(k=>[k,fixture.food[k]]))},glutenEvidence:{...base,verdict:'contains',basis:'documented_ingredient',conditions:['TEST_ONLY']}};
const projection=r=>({color:r.color,eligible:r.eligible,reason:r.reason});
export const expectedSqlCases=fixture.cases.map(c=>{
 const actual=evaluateGuideFood(food,{...c,now});assert.deepEqual(projection(actual),c.expected,c.id);
 return {id:c.id,expected:c.expected};
});
// Invoke only with results from the REAL clinical_snapshot SQL, after seeding
// the same TEST_ONLY composition and source tuple in the disposable runner.
// No fallback/success stub if SQL has not run.
export function compareActualSqlCases(actualById){
 assert.deepEqual(Object.keys(actualById).sort(),expectedSqlCases.map(c=>c.id).sort());
 for(const c of expectedSqlCases)assert.deepEqual(projection(actualById[c.id]),c.expected,c.id+' SQL parity');
}
console.log(JSON.stringify({referenceCases:expectedSqlCases,sqlParity:'NOT EXECUTED by this module'}));
