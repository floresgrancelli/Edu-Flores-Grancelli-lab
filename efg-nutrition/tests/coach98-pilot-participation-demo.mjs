// COACH98: synthetic consent choice only; no real hosted data or false legal authorization.
import assert from 'node:assert/strict';
import {
 PILOT_PARTICIPATION_ENABLED,PILOT_PARTICIPATION_VERSION,
 PILOT_PARTICIPATION_TEXT,renderPilotParticipationNotice,readPilotParticipationSelection
} from '../pilot/pilot-participation-demo.js';
assert.equal(PILOT_PARTICIPATION_ENABLED,false);
assert.equal(PILOT_PARTICIPATION_VERSION,'coach_pilot_2026_demo1');
assert.equal(PILOT_PARTICIPATION_TEXT.paragraphs.length,4);
const html=renderPilotParticipationNotice();
assert.match(html,/DOCUMENTO PROVISIONAL/);
assert.match(html,/versión de prueba/i);
assert.match(html,/no reemplazan la atención/i);
assert.match(html,/No ingreses diagnósticos/i);
assert.match(html,/No equivale a términos legales definitivos/i);
assert.match(html,/id="efgPilotParticipate"/);
assert.match(html,/id="efgPilotShare"/);
assert.ok(!/checked(?:\s|>)/i.test(html),'No checkbox can be preselected');
assert.throws(()=>renderPilotParticipationNotice({version:'old'}),/Versión piloto no verificada/);
const doc=(participate,share)=>({getElementById:id=>
 id==='efgPilotParticipate'?{checked:participate}:
 id==='efgPilotShare'?{checked:share}:null});
assert.throws(()=>readPilotParticipationSelection(doc(true,true)),/acción expresa/);
assert.throws(()=>readPilotParticipationSelection(doc(false,true),{explicitClick:true}),/No se confirmó/);
assert.deepEqual(readPilotParticipationSelection(doc(true,false),{explicitClick:true}),{
 version:PILOT_PARTICIPATION_VERSION,participationRequested:true,
 sharingRequested:false,persisted:false,legalAcceptance:false
});
assert.deepEqual(readPilotParticipationSelection(doc(true,true),{explicitClick:true}),{
 version:PILOT_PARTICIPATION_VERSION,participationRequested:true,
 sharingRequested:true,persisted:false,legalAcceptance:false
});
console.log('PASS COACH98: optional pilot demo, independent unchecked choices, no simulated legal agreement or persistence.');
