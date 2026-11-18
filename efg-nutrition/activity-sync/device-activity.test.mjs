import assert from 'node:assert/strict';
import test from 'node:test';
import {activityDay,syncDeviceActivity} from '../pilot/device-activity-sync.js';

const date = '2026-11-19T03:00:00.000Z';
const settings = {
 day:'2026-11-19',owner:'account-a',action:'read',isCurrent:()=>true,
};
const snapshot = {
 status:'available',measuredAt:date,steps:0,activeKcal:null,source:'health_connect',
};

test('uses Argentina midnight and sends the intended account and nullable metrics',async()=>{
 assert.equal(activityDay(new Date('2026-11-19T02:59:59.999Z')),'2026-11-18');
 assert.equal(activityDay(new Date(date)),'2026-11-19');
 const db = {rpc:async(name,payload)=>{
  assert.equal(name,'efg_sync_device_activity');
  assert.deepEqual(payload,{
   p_expected_owner:'account-a',p_source:'health_connect',p_measured_at:date,
   p_steps:0,p_distance_m:null,p_active_kcal:null,
  });
  return {data:{steps:0,active_kcal:null}};
 }};
 assert.deepEqual(await syncDeviceActivity({...settings,db,bridge:{request:async()=>snapshot}}),{
  data:{steps:0,active_kcal:null},
 });
});

test('does not write after a session change, when the day differs, or without data',async()=>{
 const db={rpc:()=>assert.fail('unexpected write')};
 const bridge={request:async()=>snapshot};
 assert.equal(await syncDeviceActivity({...settings,db,bridge,isCurrent:()=>false}),null);
 assert.match((await syncDeviceActivity({...settings,db,bridge,day:'2026-11-18'})).message,/Sin datos/);
 const ask={request:async action=>{
  assert.equal(action,'connect');
  return {status:'permission'};
 }};
 assert.match((await syncDeviceActivity({...settings,db,action:'connect',bridge:ask})).message,/autorizar/);
});
