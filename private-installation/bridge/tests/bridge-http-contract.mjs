// Test-only exact HTTP contract helpers. No transport or product decisions.
import assert from 'node:assert/strict';
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const same=(a,b)=>stable(a)===stable(b);
export function projection(guide){return {meals:guide.meals.map(m=>({slot:m.slot,items:m.items.map(({id,qty,unit})=>({id,qty,unit}))}))};}
export function matchesRequest(body,{studentId,expectedFrame,expectedProjection,excludedKeys=new Set()}){
 return !!body&&typeof body.p_request_key==='string'&&body.p_request_key.length>0&&!excludedKeys.has(body.p_request_key)&&
 body.p_student===studentId&&same(body.p_expected,expectedFrame)&&same(body.p_recipe,expectedProjection);
}
export function assertReply(body,reply,expected){
 assert.equal(matchesRequest(body,expected),true,'Exact edited request required');
 assert.equal(reply.request_key,body.p_request_key,'Response belongs to this request');
 assert.deepEqual(reply.recipe_projection,expected.expectedProjection,'Exact server projection');
 assert.deepEqual(projection(reply.guide),expected.expectedProjection,'Normalized recipe preserves selection/quantities');
 assert.equal(reply.publishable,false);
}
export function assertReadback(row,{studentId,expectedProjection,expectedRevision}){
 assert.equal(row.student_id,studentId);assert.equal(row.draft_revision,expectedRevision);
 assert.deepEqual(projection(row.guide),expectedProjection,'Persisted recipe/quantities after new read');
 assert.equal(row.publishable,false);
}
