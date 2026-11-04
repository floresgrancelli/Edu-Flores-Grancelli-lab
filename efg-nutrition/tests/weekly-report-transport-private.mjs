// RAM-only transport for the actual report/message UI. NOT a database/RLS test.
export function weeklyReportTransportSource(){
 return 'export const createClient = '+createClient.toString()+';';
}
function createClient(){
 const db={efg_weekly_reports:[],efg_messages:[]};
 const controls={writes:[],failInsert:false,failRead:false,holdInsert:false,release:null};
 window.__WEEKLY_RAM__={db,controls};
 function from(table){
  let action='select',payload=null;const filters=[];
  const q={select(){return q},insert(value){action='insert';payload=value;return q},
   update(value){action='update';payload=value;return q},eq(k,v){filters.push(r=>r[k]===v);return q},
   in(k,values){filters.push(r=>values.includes(r[k]));return q},order(){return q},limit(){return q},
   maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:null,error:null}),
   then(resolve,reject){return execute().then(resolve,reject)}};
  async function execute(){
   if(!Object.hasOwn(db,table)){
    if(action!=='select')throw Error('Unexpected fixture mutation: '+table);
    return {data:[],error:null};
   }
   if(action==='insert'){
    controls.writes.push({table,payload:structuredClone(payload)});
    if(controls.holdInsert){controls.holdInsert=false;await new Promise(r=>controls.release=r);}
    if(controls.failInsert){controls.failInsert=false;return {data:null,error:{message:'SYNTHETIC_INSERT_FAILURE'}};}
    if(table==='efg_weekly_reports'&&db[table].some(r=>r.student_id===payload.student_id&&r.week_ending===payload.week_ending))
     return {data:null,error:{code:'23505',message:'SYNTHETIC_UNIQUE_WEEK'}};
    db[table].unshift({...structuredClone(payload),id:'synthetic-'+table+'-'+db[table].length,created_at:new Date().toISOString()});
    return {data:null,error:null};
   }
   if(table==='efg_weekly_reports'&&controls.failRead){controls.failRead=false;return {data:null,error:{message:'SYNTHETIC_REFRESH_FAILURE'}};}
   const rows=db[table].filter(r=>filters.every(f=>f(r)));
   if(action==='update')rows.forEach(r=>Object.assign(r,payload));
   return {data:structuredClone(rows),error:null};
  }
  return q;
 }
 return {from,rpc:async()=>({data:null,error:null}),auth:{getSession:async()=>({data:{session:null},error:null}),
  getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
}
