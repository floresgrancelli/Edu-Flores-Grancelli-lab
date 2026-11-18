import {activityAtlasHTML,mountActivityAtlas} from './activity-atlas-preview.js';
import {deviceActivityBridge} from './device-activity-sync.js';
const host = document.querySelector('#activity');
host.innerHTML = activityAtlasHTML();
document.querySelector('#browser-help').hidden = Boolean(deviceActivityBridge());
let last = null;
const db = {
 from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:last})})})})}),
 rpc:async(_,payload)=>{
  last = {steps:payload.p_steps,active_kcal:payload.p_active_kcal,source:payload.p_source};
  return {data:last};
 },
};
mountActivityAtlas(host,{db,owner:'device-qa',isCurrent:()=>true,enabled:true});
