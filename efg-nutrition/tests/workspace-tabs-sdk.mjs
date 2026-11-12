// Loopback only, synthetic message rows; never imported by production.
import {createClient as base,bindApp,fixture} from './student-day-visual-sdk.mjs';
export {bindApp,fixture};
const state={writes:[],rows:[{id:'msg-a',student_id:'pupil-a',coach_id:'mentor',sender_id:'pupil-a',body:'Hola, quería consultar las opciones para el almuerzo.',created_at:'2026-11-12T10:00:00Z',read_at:null},{id:'msg-b',student_id:'pupil-b',coach_id:'mentor',sender_id:'mentor',body:'Ya tenés disponible tu informe.',created_at:'2026-11-11T10:00:00Z',read_at:'2026-11-11T10:01:00Z'}]};
globalThis.__NCC_WORKSPACE_FIXTURE__=state;
export function createClient(url){
 const sdk=base(url),from=sdk.from;
 sdk.from=table=>{
  if(table!=='efg_messages')return from(table);
  const filters=[];let op='read',payload;
  const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},limit(){return q},or(){return q},update(v){op='update';payload=v;return q},insert(v){op='insert';payload=v;return q},then(resolve){
   if(op==='insert'){state.writes.push(payload);state.rows.push({...payload,id:'sent-'+state.writes.length,created_at:new Date().toISOString(),read_at:null});}
   const rows=state.rows.filter(r=>filters.every(f=>f(r)));if(op==='update')rows.forEach(r=>Object.assign(r,payload));
   resolve({data:structuredClone(rows).sort((a,b)=>b.created_at.localeCompare(a.created_at)),error:null});
  }};return q;
 };return sdk;
}
