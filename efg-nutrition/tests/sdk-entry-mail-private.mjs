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
