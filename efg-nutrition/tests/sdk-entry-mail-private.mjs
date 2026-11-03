import assert from 'node:assert/strict';
import {createLocalMailReader} from './sdk-entry-mail-local.mjs';
const email='sdk-unit@example.invalid',after=Date.parse('2026-11-01T00:00:00Z'),seen=[];
const summary={ID:'fictional',Created:'2026-11-01T00:00:01Z',To:[{Address:email}]};
const reader=createLocalMailReader({origin:'http://127.0.0.1:54324',clock:()=>after+2000,fetcher:async(url,options)=>{
 seen.push({url,options});return {ok:true,json:async()=>url.includes('/messages?')?{messages:[summary]}:{To:[{Address:email}],Text:'NCC_LOCAL_OTP=123456'}};
}});
assert.equal(await reader({email,after}),'123456');assert.ok(seen.every(x=>x.options.redirect==='error'&&x.url.startsWith('http://127.0.0.1:54324/')));
assert.throws(()=>createLocalMailReader({origin:'https://mail.example.com'}));
assert.throws(()=>createLocalMailReader({origin:'http://127.0.0.1:54321'}));
await assert.rejects(reader({email:'real@example.com',after}));
const ambiguous=createLocalMailReader({origin:'http://localhost:54324',clock:()=>after+2000,fetcher:async url=>({ok:true,json:async()=>url.includes('/messages?')?{messages:[summary]}:{To:[{Address:email}],Text:'NCC_LOCAL_OTP=123456 NCC_LOCAL_OTP=654321'}})});
await assert.rejects(ambiguous({email,after}),/ambiguous/);
console.log('PASS Mailpit reader unit contract; no actual mail service or OTP used.');

// A 429 from the LOCAL fictitious GoTrue service may be retried with a bounded
// backoff. Unknown failures, real accounts or external URLs never retry.
import {requestLocalBrowserOtp} from './sdk-entry-mail-local.mjs';
function fictionalPage(statuses){
 let pending=null,attempts=0;
 const page={
  locator(selector){
   if(selector==='#loginEmail')return {fill:async()=>{},waitFor:async()=>{}};
   if(selector==='#loginOtp')return {waitFor:async()=>{}};
   if(selector==='#pilot-login-form button[type=submit]')return {click:async()=>{
    const status=statuses[attempts++];
    const cb=pending;pending=null;
    cb({status:()=>status,url:()=> 'http://127.0.0.1:54321/auth/v1/otp',
     request:()=>({method:()=> 'POST'})});
   }};
   throw Error('Unexpected local fixture control: '+selector);
  },
  waitForResponse(pred){
   assert.equal(pred({url:()=> 'http://127.0.0.1:54321/auth/v1/otp',
    request:()=>({method:()=> 'POST'})}),true);
   return new Promise(resolve=>{pending=resolve});
  }
 };
 return {page,get attempts(){return attempts}};
}
const mock=fictitious=>(fictionalPage(fictitious));
const throttled=mock([429,200]),delays=[];
const answer=await requestLocalBrowserOtp(throttled.page,{
 email:'sdk-unit@example.invalid',apiUrl:'http://127.0.0.1:54321',
 clock:()=>after+3000,sleep:async t=>delays.push(t)});
assert.equal(answer.attempts,2);
assert.equal(throttled.attempts,2);
assert.deepEqual(delays,[1800]);
const wrong=mock([400,200]);
await assert.rejects(requestLocalBrowserOtp(wrong.page,{
 email:'sdk-unit@example.invalid',apiUrl:'http://127.0.0.1:54321',sleep:async()=>{}}),/Unexpected fictional local OTP response/);
assert.equal(wrong.attempts,1);
const endless=mock([429,429,429,200]);
await assert.rejects(requestLocalBrowserOtp(endless.page,{
 email:'sdk-unit@example.invalid',apiUrl:'http://127.0.0.1:54321',sleep:async()=>{}}),/rate limit persisted/);
assert.equal(endless.attempts,3);
await assert.rejects(requestLocalBrowserOtp(mock([200]).page,{
 email:'sdk-unit@example.invalid',apiUrl:'https://cyjvddhimbsfipjfctsl.supabase.co',sleep:async()=>{}}));
await assert.rejects(requestLocalBrowserOtp(mock([200]).page,{
 email:'someone@gmail.com',apiUrl:'http://127.0.0.1:54321',sleep:async()=>{}}));
console.log('PASS disposable local OTP browser retry: 429 bounded, 400 rejected, hosted and non-fictional accounts blocked');
