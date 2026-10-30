// UX35-SESSION01 · Verified explicit session exit; major release OFF.
// Local fixtures never call Supabase and never log out real user accounts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {signOutCurrentDevice} from '../pilot/logout-session.js';
const calls=[];
const auth={signOut:async args=>{calls.push(args);return {error:null}}};
await assert.rejects(signOutCurrentDevice({auth}),/acción explícita/);
assert.equal(calls.length,0,'No automatic version or timer sign-out');
let confirmCalls=0;
const cancel=await signOutCurrentDevice({auth,explicitClick:true,
 hasUnsavedChanges:()=>true,
 confirmDiscard:()=>{confirmCalls++;return false;}
});
assert.equal(cancel.cancelled,true);
assert.equal(cancel.signedOut,false);
assert.equal(calls.length,0,'Draft cancellation cannot sign out');
const saved=await signOutCurrentDevice({auth,explicitClick:true,
 hasUnsavedChanges:()=>false,
 confirmDiscard:()=>{throw Error('Do not confirm without dirty data');}
});
assert.equal(saved.signedOut,true);
assert.deepEqual(calls[0],{scope:'local'});
const discarded=await signOutCurrentDevice({auth,explicitClick:true,
 hasUnsavedChanges:()=>true,confirmDiscard:()=>{confirmCalls++;return true;}
});
assert.equal(discarded.signedOut,true);
assert.equal(confirmCalls,2);
assert.equal(calls.length,2);
await assert.rejects(signOutCurrentDevice({auth:{signOut:async()=>({error:{message:'offline'}})},explicitClick:true}),/No pudimos cerrar/);
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../pilot/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../pilot/release-session.css',import.meta.url),'utf8');
const code=readFileSync(new URL('../pilot/version-notice.js',import.meta.url),'utf8');
const comm=readFileSync(new URL('../pilot/release-communications.js',import.meta.url),'utf8');
assert.match(app,/class="efg-mobile-logout" data-act="logout"/,'Student/Coach/Admin mobile header has logout');
assert.match(css,/@media\(max-width:720px\)/);
assert.match(css,/min-height:44px/,'Touch targets accessible');
assert.match(html,/release-session\.css\?v=20261030-ux35-mobile1/);
assert.match(html,/meta name="efg-build" content="20261030-ux35-major2"/);
assert.match(html,/pilot\.js\?v=20261030-ux35-major2/);
assert.match(app,/auth:sb\.auth,explicitClick:true,hasUnsavedChanges:hasPendingUnsavedEdits/);
assert.match(app,/if\(!result\.signedOut\)return/);
assert.match(app,/function resetPrivateSession\(\)/);
assert.match(app,/resetPrivateSession\(\);loginView\(\)/,'Remote/session auth signout clears role memory');
assert.match(app,/state\.roster=\[\];state\.coachLogs=\[\]/);
assert.match(app,/state\.diary=null;state\.progressLogs=\[\]/);
assert.match(app,/announceMinorUpdates:false/,'Only the exceptional relaunch may show notice');
assert.match(code,/announceMinorUpdates=false/,'New detector defaults silent');
assert.match(code,/const canPresent=announceMinorUpdates===true/);
assert.match(code,/getStatus:\(\)=>\(\{/,'Manual version check still works');
assert.match(comm,/RELEASE_COMMUNICATIONS_ENABLED=false/,'No early major signouts');
assert.match(comm,/data-act="ackReleasePreview"/);
assert.match(comm,/data-act="ackReleaseAndSignOut"/);
assert.match(comm,/data-act="markReleaseSeen"/);
assert.doesNotMatch(code,/\.signOut\(/,'PWA polling never logs out a user');
assert.doesNotMatch(code,/location\.reload\(/,'Minor patches never reload without user decision');
console.log('PASS UX35: mobile sign-out safe and local, dirty drafts confirmed, signed-out RAM reset, minor versions silent and major notice separately gated.');
