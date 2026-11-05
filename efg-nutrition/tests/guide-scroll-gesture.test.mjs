// Real touch controller, synthetic DOM; does not certify a physical Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../pilot/pull-refresh.js',import.meta.url),'utf8').replace('export function','function');
function fixture(selector){
 const events={},panel={setAttribute(){},querySelector:()=>({}),style:{setProperty(){}},remove(){}};
 const target={closest:s=>s.includes(selector)?{}:null,parentElement:null};
 const c={document:{createElement:()=>panel,body:{append(){}},documentElement:{scrollTop:0},querySelector:()=>null,addEventListener:(name,fn)=>events[name]=fn},window:{scrollY:0,innerHeight:850},HTMLElement:class{},getComputedStyle:()=>({overflowY:'visible'}),setTimeout,clearTimeout,console};
 vm.createContext(c);vm.runInContext(source,c);c.createPullToRefresh({canRefresh:()=>true,refresh:async()=>{}});
 let prevented=false;
 events.touchstart({target,touches:[{clientX:100,clientY:50}]});
 events.touchmove({target,touches:[{clientX:100,clientY:180}],cancelable:true,preventDefault(){prevented=true;}});
 return prevented;
}
for(const selector of ['#coachGuidedSlot','.efg-coach-atomic-draft','.efg-guide-preview'])test(selector+' keeps downward touch native at top edge',()=>assert.equal(fixture(selector),false));
test('top-edge pull outside guide still claims deliberate refresh gesture',()=>assert.equal(fixture('unmatched-target'),true));
