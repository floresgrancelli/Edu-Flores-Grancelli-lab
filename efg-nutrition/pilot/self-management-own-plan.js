import {SELF_MANAGEMENT_URL,SELF_PUBLISHABLE_KEY} from './self-management-config.js';
// Shared Mi Día bridge. No selected pupil IDs, no writes and no coach plans.
export async function readOwnSelfManagedPlan(sb,{userId,role,epoch,current,fetcher=fetch}={}){
 if(!['admin','coach'].includes(role)||!userId)return null;
 const account=await sb.from('ncc_self_accounts').select('user_id,mode,active').eq('user_id',userId).maybeSingle();
 if(!current()||account.error||!account.data)return null;
 if(account.data.user_id!==userId||account.data.mode!=='independent'||!account.data.active)return null;
 try{
  const session=await sb.auth.getSession();
  if(!current()||session.error||session.data?.session?.user?.id!==userId)throw Error('session');
  const response=await fetcher(SELF_MANAGEMENT_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.data.session.access_token,apikey:SELF_PUBLISHABLE_KEY},body:JSON.stringify({action:'context'})});
  const context=await response.json();if(!current())return null;
  if(!response.ok||context.userId!==userId||context.intake?.user_id!==userId)throw Error('unverified');
  const saved=context.latestPlan;
  if(!saved||saved.userId!==userId||saved.intakeRevision!==context.intake.revision)return {owner:userId,epoch,pending:true};
  if(saved.result?.guide?.createdFrom!=='self_managed_estimate'||saved.result.guide.coachReviewed!==false)throw Error('guide');
  return {owner:userId,epoch,goal:saved.result.goal,guide:saved.result.guide,fields:context.intake.data};
 }catch{return current()?{owner:userId,epoch,error:true}:null;}
}
export const selfManagementLink=()=>'<a class="btn small light" href="./autogestion.html">Mi ficha y Dieta Guía · Autogestión</a>';
