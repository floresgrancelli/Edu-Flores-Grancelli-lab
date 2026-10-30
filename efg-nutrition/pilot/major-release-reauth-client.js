// UX35 · Deliberately NOT connected to production, until signed release
// manifest/receipt RPCs and legal/privacy/health onboarding are approved.
// Only the exceptional MAJOR relaunch may request the new-OTP reauthentication.
// PREVIEW and minor updates must never sign users out.
import {RELEASE_COMMUNICATIONS_ENABLED} from './release-communications.js';
import {signOutCurrentDevice} from './logout-session.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function confirmMajorRelaunchAndExit(sb,{
 profile,userId,releaseId,currentBuild,
 explicitClick=false,
 enabled=RELEASE_COMMUNICATIONS_ENABLED,
 hasUnsavedChanges=()=>false,
 confirmDiscard=()=>false
}={}){
 if(enabled!==true||explicitClick!==true||!UUID.test(userId||'')||
  !profile||profile.user_id!==userId||
  !['student','coach','admin','personal'].includes(profile.role)||
  profile.active!==true||typeof sb?.auth?.getUser!=='function'||
  typeof sb?.auth?.signOut!=='function'||typeof sb?.rpc!=='function'||
  typeof releaseId!=='string'||!/^major_[a-z0-9_-]{6,48}$/.test(releaseId)||
  typeof currentBuild!=='string'||currentBuild.length<6)
  throw Error('El relanzamiento todavía no permite cerrar la sesión desde este aviso.');
 const auth=await sb.auth.getUser();
 if(auth.error||auth.data?.user?.id!==userId)
  throw Error('La identidad de esta sesión no está verificada.');
 // A stale/cached UI can never decide that the MAJOR release is live.
 // The future backend must report this state for THIS signed user only.
 const status=await sb.rpc('efg_major_release_current');
 if(status.error||status.data?.phase!=='reauth_required'||
  status.data?.release_id!==releaseId||
  status.data?.build!==currentBuild||
  status.data?.published!==true||
  !Array.isArray(status.data?.roles)||!status.data.roles.includes(profile.role))
  throw Error('La Gran Actualización todavía no fue confirmada por el servidor.');
 // Only after a signed, explicit acknowledgment receipt does local OTP exit.
 // This receipt is NOT acceptance of legal documents or medical sharing.
 const ack=await sb.rpc('efg_major_release_acknowledge',{
  p_release_id:releaseId,p_kind:'reauth_notice_acknowledged'
 });
 if(ack.error||ack.data?.release_id!==releaseId||
  ack.data?.acknowledgment_kind!=='reauth_notice_acknowledged')
  throw Error('No se confirmó el aviso de actualización. La sesión sigue activa.');
 return signOutCurrentDevice({auth:sb.auth,
  explicitClick:true,hasUnsavedChanges,confirmDiscard});
}
