import assert from 'node:assert/strict';
import {createAuthHydrationGate} from '../pilot/auth-hydration-gate.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(){
 let identity='A',invalidations=0,refreshes=0;const tasks=[];
 const gate=createAuthHydrationGate({readIdentity:()=>identity,invalidate:()=>{identity=null;invalidations++;},schedule:fn=>tasks.push(fn),refresh:()=>refreshes++});
 return {gate,tasks,set:id=>identity=id,stats:()=>({identity,invalidations,refreshes}),flush:()=>{while(tasks.length)tasks.shift()();}};
}
{
 const f=fixture(),t=f.gate.begin();f.gate.verified(t,'A');const slow=deferred();
 let applied=false;const response=f.gate.read(t,slow.promise).then(()=>{applied=true;});
 f.gate.change('B');assert.equal(f.stats().identity,null);assert.equal(f.tasks.length,0);
 slow.resolve('old');await assert.rejects(response,{code:'STALE_AUTH_CONTEXT'});assert.equal(applied,false);
 f.gate.finish(t);f.flush();assert.equal(f.stats().refreshes,1);
 const b=f.gate.begin();f.gate.verified(b,'B');assert.equal(await f.gate.read(b,Promise.resolve('B')),'B');f.set('B');f.gate.finish(b);
}
{
 const f=fixture(),t=f.gate.begin();f.gate.verified(t,'A');f.gate.change(null);f.gate.finish(t);f.flush();
 assert.equal(f.stats().identity,null);assert.equal(f.stats().refreshes,0);
}
{
 const f=fixture(),t=f.gate.begin();f.gate.verified(t,'A');f.gate.change('B');f.gate.change('C');
 for(let i=0;i<10;i++)f.gate.change('C');
 assert.equal(f.stats().invalidations,2);assert.equal(f.gate.begin(),null,'No parallel hydration');
 f.gate.finish(t);f.flush();assert.equal(f.stats().refreshes,1);
 const c=f.gate.begin();assert.throws(()=>f.gate.verified(c,'B'),{code:'STALE_AUTH_CONTEXT'});f.gate.verified(c,'C');f.gate.finish(c);
}
{
 const f=fixture(),t=f.gate.begin();f.gate.verified(t,'A');const epoch=f.gate.epoch();
 for(let i=0;i<10;i++)assert.equal(f.gate.change('A'),false);
 assert.equal(f.gate.epoch(),epoch);assert.equal(f.stats().invalidations,0);f.gate.finish(t);f.flush();assert.equal(f.stats().refreshes,0);
}
{
 const f=fixture();f.gate.change('B');f.gate.change('C');assert.equal(f.tasks.length,1);
 f.gate.change(null);f.flush();assert.equal(f.stats().refreshes,0,'Logout cancels queued rehydration');
}
console.log('PASS gate: stale GET, logout, A-B-C, coalescing and unchanged identity (unit only)');
