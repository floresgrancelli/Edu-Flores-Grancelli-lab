import test from 'node:test';
import assert from 'node:assert/strict';
import { workoutPerfumesForDay } from './rotation.mjs';

const catalog = ['hombre','mujer'].flatMap(option =>
  Array.from({length:30},(_,i)=>({option,id:option+'-'+i})));
test('requires 30 unique suggestions per option',()=>{
  assert.equal(workoutPerfumesForDay(catalog.slice(0,-1)),null);
  assert.equal(workoutPerfumesForDay([...catalog,catalog[0]]),null);
});
test('rotates without repeats until both 30-day lists complete',()=>{
  const days=Array.from({length:31},(_,i)=>workoutPerfumesForDay(catalog,new Date(Date.UTC(2026,1,1+i,12))));
  for(const option of ['hombre','mujer']){
    assert.equal(new Set(days.slice(0,30).map(day=>day[option].id)).size,30);
    assert.equal(days[0][option].id,days[30][option].id);
  }
});
test('rotates at midnight in Argentina',()=>{
  const date=value=>workoutPerfumesForDay(catalog,new Date(value)).date;
  assert.equal(date('2026-11-18T02:59:00Z'),'2026-11-17');
  assert.equal(date('2026-11-18T03:00:00Z'),'2026-11-18');
});
