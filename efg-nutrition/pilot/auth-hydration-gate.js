// Coalesces auth changes. Identity still comes from getUser, never from this gate.
export function createAuthHydrationGate({readIdentity,invalidate,schedule,refresh}){
 let epoch=0,active=null,target=null,pending=false,queued=false;
 const stale=()=>Object.assign(new Error('STALE_AUTH_CONTEXT'),{code:'STALE_AUTH_CONTEXT'});
 const queue=()=>{
  if(queued||active||!pending||!target)return;
  queued=true;schedule(()=>{queued=false;if(!active&&pending&&target)refresh();});
 };
 return {
  change(id){
   const next=id||null;
   if(next&&(target===next||(!target&&readIdentity()===next))){target=next;return false;}
   if(!next&&!target&&!readIdentity()&&!active)return false;
   target=next;epoch++;pending=!!next;invalidate(epoch,next);queue();return true;
  },
  begin(){if(active)return null;pending=false;active={epoch};return active;},
  current(ticket){return !!ticket&&ticket.epoch===epoch;},
  async read(ticket,promise){const value=await promise;if(ticket.epoch!==epoch)throw stale();return value;},
  verified(ticket,id){if(ticket.epoch!==epoch||(target&&target!==id))throw stale();target=id;},
  finish(ticket){if(active!==ticket)return;active=null;queue();},
  epoch:()=>epoch
 };
}
