// UX35 / SESSION01 · explicit local session exit for every signed-in role.
// Not the 23:59 diary cutoff. A major release can request this ONLY after
// the user sees the server-verified "reauth_required" notice and taps its CTA.
// No invisible logout on minor code builds or a background version poll.
export async function signOutCurrentDevice({
 auth, hasUnsavedChanges=()=>false, confirmDiscard=()=>false,
 explicitClick=false
}={}){
 if(explicitClick!==true||typeof auth?.signOut!=='function')
  throw Error('El cierre requiere una acción explícita del usuario.');
 // Confirmation may be asynchronous (e.g. a custom mobile modal).
 if(hasUnsavedChanges()&&(await confirmDiscard())!==true)
  return Object.freeze({signedOut:false,cancelled:true});
 // Supabase local scope signs out only the device that requested it. Never
 // invalidate other people's accounts or force remote sessions on a minor patch.
 const answer=await auth.signOut({scope:'local'});
 if(answer?.error)throw Error('No pudimos cerrar tu sesión. Revisá la conexión y reintentá.');
 return Object.freeze({signedOut:true,cancelled:false});
}
