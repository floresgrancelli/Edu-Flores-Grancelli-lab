// CI-only client facade: every authorization/table/RPC result comes from real localhost HTTP.
export function createClient(){
 const config=()=>{const c=window.__PERSISTED_LOCAL__;if(!c||c.url!=='http://127.0.0.1:54321')throw Error('LOCAL_CONFIG_REQUIRED');return c;};
 async function send(path,method='GET',body){const c=config();const r=await fetch(c.url+path,{method,headers:{apikey:c.key,Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();return {data:r.ok?data:null,error:r.ok?null:data};}
 return {auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>{const r=await send('/auth/v1/user');return {data:{user:r.data},error:r.error};},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 rpc:(name,args)=>send('/rest/v1/rpc/'+encodeURIComponent(name),'POST',args),
 from(table){if(!/^efg_[a-z_]+$/.test(table))throw Error('TABLE_REJECTED');const p=new URLSearchParams();let single=false;
 const query={select(v='*'){p.set('select',v);return query;},eq(k,v){p.set(k,'eq.'+v);return query;},not(k,operator,v){p.set(k,'not.'+operator+'.'+v);return query;},in(k,v){p.set(k,'in.('+v.join(',')+')');return query;},gte(k,v){p.set(k,'gte.'+v);return query;},lte(k,v){p.set(k,'lte.'+v);return query;},order(k,o={}){p.set('order',k+'.'+(o.ascending===false?'desc':'asc'));return query;},limit(n){p.set('limit',n);return query;},maybeSingle(){single=true;return query;},then(resolve,reject){return send('/rest/v1/'+table+'?'+p).then(r=>{if(single&&!r.error){if(r.data.length>1)throw Error('MULTIPLE_ROWS');r.data=r.data[0]||null;}return resolve(r);},reject);}};return query;}};
}
