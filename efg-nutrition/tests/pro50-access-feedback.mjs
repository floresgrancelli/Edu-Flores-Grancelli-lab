// PRO-50 — regression guard: authorized private access UX never enumerates email accounts.
// Static client contract only; actual GoTrue/OTP and organization tests remain required.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const unauthStart=source.indexOf("function unauthorized(_msg){");
const unauthEnd=source.indexOf("function macroCard(",unauthStart);
assert.ok(unauthStart>0&&unauthEnd>unauthStart,"Authorization failure screen missing");
const noAccess=source.slice(unauthStart,unauthEnd);
assert.match(noAccess,/Necesitamos verificar tu habilitación/);
assert.match(noAccess,/Si recibiste una invitación/);
assert.match(noAccess,/No se muestran datos de ninguna otra persona/);
assert.match(noAccess,/Cómo solicitar acceso/);
assert.match(noAccess,/data-act="showAccessInstructions" aria-controls="efgAccessInstructions" aria-expanded="false"/);
assert.match(noAccess,/data-act="logout"/);
assert.doesNotMatch(noAccess,/escapeHTML\(_msg\)|\+\s*_msg|\$\{_msg\}/,
 "Provider errors and invitation presence cannot appear in UI");
const otp=source.slice(source.indexOf("async function requestOtp(email){"),source.indexOf("async function confirmOtp(token){"));
assert.match(otp,/Si tu correo está habilitado, recibirás un código/);
assert.match(otp,/console\.warn\("EFG OTP request",err\?\.code/);
assert.doesNotMatch(otp,/loginView\(.*?err\.message/,
 "Do not echo backend error text in the login card");
const handler=source.indexOf('if(action==="showAccessInstructions"){');
assert.ok(handler>0);
assert.match(source.slice(handler,handler+370),/el\.setAttribute\("aria-expanded",String\(!instructions\.hidden\)\)/);
assert.match(source,/if\(!state\.profile\.active\).*?unauthorized\(/);
console.log("PASS PRO50 static: generic non-invited message, no backend enumeration, accessible contact instructions and safe OTP copy. Physical/server E2E still pending.");
