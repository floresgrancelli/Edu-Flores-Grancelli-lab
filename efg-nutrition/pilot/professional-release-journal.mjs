// Stable per-user/workspace lanes + permanent message UUID ledger. No payloads/tokens/sessions.
const keys=['claimId','key','namespace','operation','id','studentId','senderId','digest'];
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function valid(r,state=false){return r&&Object.keys(r).every(k=>[...keys,...(state?['state']:[])].includes(k))&&keys.every(k=>typeof r[k]==='string')&&uuid(r.claimId)&&uuid(r.studentId)&&uuid(r.senderId)&&(r.operation==='markRead'?r.id==='':uuid(r.id))&&r.key.length>0&&r.namespace.length>0&&['sendMessage','markRead','create','seats','invite'].includes(r.operation)&&/^[0-9a-f]{64}$/.test(r.digest)&&(!state||['uncertain','confirmed'].includes(r.state));}
const ledger=r=>JSON.stringify(['uuid',r.namespace,r.id]);
export function createReleaseJournal(indexedDB = globalThis.indexedDB) {
 let opening;
 function open(){
  if(!indexedDB)return Promise.reject(new Error('DURABLE_STORAGE_REQUIRED'));
  return opening ||= new Promise((resolve,reject)=>{
   let rejected=false;
   const rejectOpen=code=>{rejected=true;reject(new Error(code));};
   const r=indexedDB.open('ncc-professional-release-journal-v1',1);
   r.onupgradeneeded=e=>{if(e.oldVersion!==0){r.transaction.abort();return;}r.result.createObjectStore('claims',{keyPath:'key'});};
   r.onerror=()=>rejectOpen('JOURNAL_UNAVAILABLE');r.onblocked=()=>rejectOpen('JOURNAL_BLOCKED');r.onsuccess=()=>{
    const db=r.result;
    if(rejected){db.close();return;}
    if(db.objectStoreNames.length!==1||!db.objectStoreNames.contains('claims')){db.close();rejectOpen('JOURNAL_SCHEMA');return;}
    db.onversionchange=()=>db.close();resolve(db);
   };
  });
 }
 async function tx(work){const db=await open();return new Promise((resolve,reject)=>{
  const t=db.transaction('claims','readwrite',{durability:'strict'}),s=t.objectStore('claims');let value;
  if(t.durability!=='strict'||s.keyPath!=='key'||s.indexNames.length!==0){t.abort();reject(new Error('JOURNAL_SCHEMA_OR_DURABILITY'));return;}
  t.oncomplete=()=>resolve(value);t.onabort=t.onerror=()=>reject(new Error('JOURNAL_FAILED'));
  try{work(s,v=>{value=v;},()=>t.abort());}catch{t.abort();}
 });}
 return Object.freeze({
  reserve(record){if(!valid(record))throw new Error('INVALID_JOURNAL_RECORD');return tx((s,done,abort)=>{
   const r=s.get(record.key);r.onsuccess=()=>{
    if(r.result&&(!valid(r.result,true)||r.result.key!==record.key||r.result.namespace!==record.namespace||r.result.operation!==record.operation||r.result.studentId!==record.studentId||r.result.senderId!==record.senderId))return abort();
    if(r.result&&r.result.state!=='confirmed')return done(false);
    const put=()=>{s.put({...record,state:'uncertain'});if(record.operation!=='markRead')s.put({...record,key:ledger(record),state:'uncertain'});done(true);};
    if(record.operation==='markRead')return put();
    const l=s.get(ledger(record));l.onsuccess=()=>{if(l.result)return done(false);put();};
   };
  });},
  get(key){return tx((s,done,abort)=>{const r=s.get(key);r.onsuccess=()=>{if(r.result&&(!valid(r.result,true)||r.result.key!==key))return abort();done(r.result??null);};});},
  settle(expected){if(!valid(expected)&&!valid(expected,true))throw new Error('INVALID_JOURNAL_RECORD');const {key,digest}=expected;return tx((s,done,abort)=>{const r=s.get(key);r.onsuccess=()=>{
   if(!r.result||!valid(r.result,true)||r.result.key!==key)return abort();
   if(!keys.every(k=>r.result[k]===expected[k]))return done(false);
   const put=()=>{s.put({...r.result,state:'confirmed'});done(true);};
   if(r.result.operation==='markRead')return put();
   const l=s.get(ledger(r.result));l.onsuccess=()=>{if(!l.result||!valid(l.result,true)||!keys.filter(k=>k!=='key').every(k=>l.result[k]===r.result[k]))return abort();s.put({...l.result,state:'confirmed'});put();};
  };});}
 });
}
