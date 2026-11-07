// Passive CDP observer. Never enables interception or creates/modifies traffic.
// Retains only counters, fixed codes and synthetic receipt identity, never headers/tokens/bodies.
import {assertBrowserRequest,mutationAction,UUID} from '../professional-browser-api/policy.mjs';
export function createNetworkObserver({config,assetPaths}) {
  const pending=new Map(),violations=[],receiptReads=[];
  const mutationDispatches={sendMessage:0,setAlias:0,markRead:0};
  const cors={preflightRequests:0,optionsResponses:0,optionsCompleted:0,wildcardResponses:0,exactOriginResponses:0};
  function request(event) {
    try {
      const r=event.request,u=new URL(r.url);
      if(event.redirectResponse)throw new Error();
      // Chromium reports preflights on the same page CDP session. Do not retain headers.
      if(r.method==='OPTIONS'){
        const headers=Object.fromEntries(Object.entries(r.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
        const method=headers['access-control-request-method'];
        if(assertBrowserRequest(r.url,method,config,assetPaths).kind!=='api')throw new Error();
        cors.preflightRequests++;pending.set(event.requestId,{kind:'preflight',responded:false});return;
      }
      const checked=assertBrowserRequest(r.url,r.method,config,assetPaths);
      if(checked.kind!=='api')return;
      const action=mutationAction(r.method,u.pathname);if(action)mutationDispatches[action]++;
      if(r.method==='GET'&&u.pathname==='/rest/v1/efg_messages'&&u.searchParams.has('id')) {
        const values=['id','student_id','coach_id'].map(k=>u.searchParams.get(k));
        if(!values.every(v=>v?.startsWith('eq.')&&UUID.test(v.slice(3))))throw new Error();
        pending.set(event.requestId,{kind:'receipt',identity:{id:values[0].slice(3),studentId:values[1].slice(3),coachId:values[2].slice(3)},responded:false});
      }
    }catch{violations.push('CDP_REQUEST_REJECTED');}
  }
  function response(event) {
    const p=pending.get(event.requestId);if(!p)return;
    const r=event.response;
    if(r.status<200||r.status>=300){violations.push('CDP_RESPONSE_REJECTED');return;}
    if(p.kind==='preflight'){
      const h=Object.fromEntries(Object.entries(r.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
      const origin=h['access-control-allow-origin'];
      if(origin!=='*'&&origin!==config.frontendOrigin){violations.push('CDP_CORS_REJECTED');return;}
      cors.optionsResponses++;if(origin==='*')cors.wildcardResponses++;else cors.exactOriginResponses++;
    }
    p.responded=true;
  }
  function finished(event){const p=pending.get(event.requestId);if(!p)return;pending.delete(event.requestId);if(!p.responded){violations.push('CDP_RESPONSE_MISSING');return;}if(p.kind==='preflight')cors.optionsCompleted++;else receiptReads.push(p.identity);}
  function failed(event){if(pending.delete(event.requestId))violations.push('CDP_REQUEST_FAILED');}
  return {request,response,finished,failed,async settle(){const end=Date.now()+5000;while(pending.size&&Date.now()<end)await new Promise(r=>setTimeout(r,10));if(pending.size)violations.push('CDP_REQUESTS_PENDING');},snapshot:()=>structuredClone({cors,mutationDispatches,receiptReads,violations,pending:pending.size})};
}
let nextSession=0;
export async function attachNetworkObserver(context,page,observer) {
  const cdp=await context.newCDPSession(page);
  const prefix=++nextSession+':';
  const scoped=fn=>event=>fn({...event,requestId:prefix+event.requestId});
  cdp.on('Network.requestWillBeSent',scoped(observer.request));
  cdp.on('Network.responseReceived',scoped(observer.response));
  cdp.on('Network.loadingFinished',scoped(observer.finished));
  cdp.on('Network.loadingFailed',scoped(observer.failed));
  await cdp.send('Network.enable');
  return cdp;
}
