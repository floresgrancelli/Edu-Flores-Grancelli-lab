import {SELF_MANAGEMENT_URL,SELF_PUBLISHABLE_KEY} from './self-management-config.js?v=ncc-self-live-r1-20261113';
// Only an authenticated server decision can route an account without a legacy profile.
export async function resolveIndependentEntry(sb,{userId,current,fetcher=fetch}={}){
 const session=await sb.auth.getSession();
 if(!current()||session.error||session.data?.session?.user?.id!==userId)return false;
 const response=await fetcher(SELF_MANAGEMENT_URL,{method:'POST',cache:'no-store',headers:{
  'Content-Type':'application/json',Authorization:'Bearer '+session.data.session.access_token,apikey:SELF_PUBLISHABLE_KEY},
  body:JSON.stringify({action:'status'})});
 const value=await response.json();
 if(!current())return false;
 if(!response.ok){if(['access_required','mode_mismatch'].includes(value.error))return false;throw Error('No pudimos verificar tu acceso a autogestión. Reintentá.');}
 if(value.userId!==userId)throw Error('Cambió la cuenta. Volvé a ingresar.');
 return true;
}
