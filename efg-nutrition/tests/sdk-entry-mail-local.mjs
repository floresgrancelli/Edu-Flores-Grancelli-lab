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

// For disposable CI browsers only: tolerate short LOCAL GoTrue mail throttling.
// Never auto-retry on a hosted endpoint, unknown status or real account.
export async function requestLocalBrowserOtp(page,{email,apiUrl,clock=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 assert.match(email,/^[a-z0-9-]+@example\.invalid$/i);
 const endpoint=new URL(apiUrl);
 assert.equal(endpoint.protocol,'http:');
 assert.ok(['127.0.0.1','localhost'].includes(endpoint.hostname));
 assert.equal(endpoint.port,'54321');
 assert.equal(endpoint.pathname,'/');
 for(let attempt=1;attempt<=3;attempt++){
  await page.locator('#loginEmail').fill(email);
  const after=clock();
  const responsePromise=page.waitForResponse(response=>{
   const target=new URL(response.url());
   return target.origin===endpoint.origin&&target.pathname==='/auth/v1/otp'&&
    response.request().method()==='POST';
  },{timeout:20000});
  await page.locator('#pilot-login-form button[type=submit]').click();
  const response=await responsePromise;
  if(response.status()===200){
   await page.locator('#loginOtp').waitFor();
   return {after,attempts:attempt};
  }
  assert.equal(response.status(),429,'Unexpected fictional local OTP response');
  if(attempt===3)throw Error('Fictional local OTP rate limit persisted; refuse further retries');
  // GoTrue's local one-second frequency gate, with an extra margin.
  await sleep(1800*attempt);
  await page.locator('#loginEmail').waitFor();
 }
 throw Error('Fictional local OTP unavailable');
}
