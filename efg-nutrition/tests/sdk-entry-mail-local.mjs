import assert from 'node:assert/strict';
export function createLocalMailReader({origin,fetcher=fetch,clock=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const u=new URL(origin);assert.equal(u.protocol,'http:');assert.ok(['127.0.0.1','localhost'].includes(u.hostname));assert.equal(u.port,'54324');assert.equal(u.username,'');assert.equal(u.password,'');assert.equal(u.pathname,'/');
 const seen=new Set();
 const get=async path=>{const r=await fetcher(u.origin+path,{redirect:'error',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Local mail service unavailable: '+r.status);return r.json();};
 return async({email,after})=>{
  assert.match(email,/^[a-z0-9-]+@example\.invalid$/i);assert.ok(Number.isFinite(after));
  const until=clock()+45000;
  while(clock()<until){
   const list=await get('/api/v1/messages?limit=50');assert.ok(Array.isArray(list.messages),'Expected Mailpit v1 API, no fallback to external mail');
   for(const summary of list.messages){
    if(seen.has(summary.ID)||!Array.isArray(summary.To)||!summary.To.some(a=>a.Address===email)||!Number.isFinite(Date.parse(summary.Created))||Date.parse(summary.Created)<after)continue;
    const message=await get('/api/v1/message/'+encodeURIComponent(summary.ID));
    if(!message.To?.some(a=>a.Address===email))continue;
    const matches=[...String(message.Text||message.HTML||'').matchAll(/NCC_LOCAL_OTP=(\d{6,10})(?!\d)/g)];
    if(matches.length!==1)throw Error('Local OTP template missing or ambiguous');
    seen.add(summary.ID);return matches[0][1]; // In-memory only: never log body/code.
   }
   await sleep(250);
  }
  throw Error('Timed out waiting for exact fictional local OTP');
 };
}
