// UX35 · Deliberately NOT connected to production, until signed release
// manifest/receipt RPCs and legal/privacy/health onboarding are approved.
// Only the exceptional MAJOR relaunch may request the new-OTP reauthentication.
// PREVIEW and minor updates must never sign users out.
import {RELEASE_COMMUNICATIONS_ENABLED} from './release-communications.js';
import {signOutCurrentDevice} from './logout-session.js';
import {readMajorRelease,acknowledgeMajorRelease} from './major-release-client.js';
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
 // Reuse COACH120's canonical verified major-release status, not a second
 // incompatible set of RPC names. Require the SAME published build.
 const status=await readMajorRelease(sb,{profile,explicitlyEnabled:enabled});
 if(status.phase!=='reauth_required'||status.id!==releaseId||
   status.build!==currentBuild||status.published!==true)
  throw Error('La Gran Actualización todavía no fue confirmada por el servidor.');
 // If the user cancels the unsaved-changes warning, do not even record
 // acknowledgment. No server signal and no session closure may occur.
 if(hasUnsavedChanges()&&(await confirmDiscard())!==true)
  return Object.freeze({signedOut:false,cancelled:true});
 // Only after a signed, explicit acknowledgment receipt does local OTP exit.
 // This receipt is NOT acceptance of legal documents or medical sharing.
 await acknowledgeMajorRelease(sb,{
  profile,release:status,kind:'reauth_notice_acknowledged',
  explicitClick:true,explicitlyEnabled:enabled
 });
 return signOutCurrentDevice({auth:sb.auth,explicitClick:true,
  hasUnsavedChanges:()=>false}); // already confirmed before recording receipt
}
