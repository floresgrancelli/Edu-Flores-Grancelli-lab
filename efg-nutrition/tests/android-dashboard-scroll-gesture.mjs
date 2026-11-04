// UX-ANDROID-01 regression: synthetic touch events for the real pull-refresh controller.
// This is NOT a substitute for Chrome/Gboard on a physical Android device.
import assert from 'node:assert/strict';
import {createPullToRefresh} from '../pilot/pull-refresh.js';
class FakeElement {
 constructor(){this.parentElement=null;this.scrollHeight=200;this.clientHeight=200;this.className='';this.attributes={};this.style={setProperty(){},transform:''};this.innerHTML='';}
 setAttribute(k,v){this.attributes[k]=v;}
 closest(){return null;}
 querySelector(){return {textContent:''};}
 remove(){this.removed=true;}
}
globalThis.HTMLElement=FakeElement;
const handlers={},body=new FakeElement(),documentElement=new FakeElement();
globalThis.document={body,documentElement,
 createElement(){return new FakeElement()},
 querySelector(){return null},
 addEventListener(name,fn){handlers[name]=fn},
 removeEventListener(name){delete handlers[name]}
};
body.append=()=>{};
let scrollY=0;
globalThis.window={innerHeight:800,get scrollY(){return scrollY;}};
globalThis.getComputedStyle=()=>({overflowY:'visible'});
let requests=0;
const refresher=createPullToRefresh({canRefresh:()=>true,refresh:async()=>{requests++},threshold:82});
const target=new FakeElement();target.parentElement=body;
const send=(name,x,y)=>{let prevented=0;
 handlers[name]({target,touches:[{clientX:x,clientY:y}],cancelable:true,preventDefault(){prevented++;}});
 return prevented;
};
// Android complaint: regular swipe over MY DAY mid-panel MUST NOT be captured.
assert.equal(send('touchstart',30,420),0);
assert.equal(send('touchmove',30,580),0,'dashboard swipe must use native scroll');
send('touchend',30,580);assert.equal(requests,0);
// Gboard/editor and nested scroll should not be stolen by the document.
target.closest=()=>({tag:'input'});send('touchstart',30,30);
assert.equal(send('touchmove',30,160),0);
send('touchend',30,160);target.closest=()=>null;
scrollY=400;send('touchstart',30,30);
assert.equal(send('touchmove',30,190),0);
send('touchend',30,190);scrollY=0;
// Horizontal or upward swipe is never claimed.
send('touchstart',30,40);
assert.equal(send('touchmove',170,35),0);
send('touchend',170,35);
// Only deliberate pull from the very top is allowed.
send('touchstart',30,40);
assert.equal(send('touchmove',30,190),1);
send('touchend',30,190);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(requests,1,'top-edge pull should refresh exactly once');
refresher.dispose();
console.log('PASS UX-ANDROID-01: bottom-half and nested/editor gestures preserve native scrolling; only top-edge pull triggers refresh. Physical Android pending.');
