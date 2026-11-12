import {createClient as baseClient,bindApp,fixture} from './student-day-visual-sdk.mjs';
export {bindApp,fixture};
const control={enabled:false,reads:[],hold:false,release:null};globalThis.__NCC_MACRO_FIXTURE__=control;
export function createClient(url){const sdk=baseClient(url),from=sdk.from;sdk.from=table=>{
 if(!control.enabled||!['efg_daily_logs','efg_goals'].includes(table))return from(table);
 const filters=[];let cap=100,offset=0;
 const query={select(){return query;},eq(k,v){filters.push(['eq',k,v]);return query;},gte(k,v){filters.push(['gte',k,v]);return query;},gt(k,v){filters.push(['gt',k,v]);return query;},lte(k,v){filters.push(['lte',k,v]);return query;},order(){return query;},limit(n){cap=n;return query;},range(a,b){offset=a;cap=b-a+1;return query;},async then(resolve){
 const id=filters.find(([op,k])=>op==='eq'&&k==='student_id')?.[2];if(!id)throw Error('Unscoped synthetic stats read');
 control.reads.push({table,id});
 if(control.hold)await new Promise(r=>control.release=r);
 const rows=table==='efg_goals'?[{student_id:id,start_on:'2026-11-01',approved_at:'2026-11-01T12:00:00Z',kcal:2100,protein_g:150,fat_g:60,carb_g:240}]:[{student_id:id,log_day:'2026-11-09',meals:{almuerzo:[{name:'Registro ficticio',k:1900,p:130,c:210,f:50}]},sports:[],skipped:{}},{student_id:id,log_day:'2026-11-10',meals:{almuerzo:[{name:'Registro ficticio',k:2000,p:140,c:230,f:65}]},sports:[],skipped:{}}];
 resolve({data:rows.filter(row=>filters.every(([op,k,v])=>op==='eq'?row[k]===v:op==='gte'?row[k]>=v:op==='gt'?row[k]>v:row[k]<=v)).slice(offset,offset+cap),error:null});}};return query;};return sdk;}
