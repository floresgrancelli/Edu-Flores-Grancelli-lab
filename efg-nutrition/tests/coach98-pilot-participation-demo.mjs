// COACH98: synthetic consent choice only; no real hosted data or false legal authorization.
import assert from 'node:assert/strict';
import {
 PILOT_PARTICIPATION_ENABLED,PILOT_PARTICIPATION_VERSION,
 PILOT_PARTICIPATION_TEXT,renderPilotParticipationNotice,readPilotParticipationSelection,syncPilotParticipationContinueButton,bindPilotParticipationDemo
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
assert.match(html,/id="efgPilotShare" required/);
assert.match(html,/id="efgPilotParticipate" required/);
assert.match(html,/id="efgPilotContinue"[^>]*disabled/);
assert.ok(!/checked(?:\s|>)/i.test(html),'No checkbox can be preselected');
assert.throws(()=>renderPilotParticipationNotice({version:'old'}),/Versión piloto no verificada/);
const doc=(participate,share)=>({getElementById:id=>
 id==='efgPilotParticipate'?{checked:participate}:
 id==='efgPilotShare'?{checked:share}:null});
assert.throws(()=>readPilotParticipationSelection(doc(true,true)),/acción expresa/);
assert.throws(()=>readPilotParticipationSelection(doc(false,true),{explicitClick:true}),/No se confirmó/);
assert.throws(()=>readPilotParticipationSelection(doc(true,false),{explicitClick:true}),/requiere autorización expresa/);
for(const a of [false,true]) for(const b of [false,true]){
 const button={disabled:false};
 const fixture={getElementById:id=>
 id==='efgPilotParticipate'?{checked:a}:
 id==='efgPilotShare'?{checked:b}:
 id==='efgPilotContinue'?button:null};
 assert.equal(syncPilotParticipationContinueButton(fixture),a&&b);
 assert.equal(button.disabled,!(a&&b));
}
assert.deepEqual(readPilotParticipationSelection(doc(true,true),{explicitClick:true}),{
 version:PILOT_PARTICIPATION_VERSION,participationRequested:true,
 sharingRequested:true,persisted:false,legalAcceptance:false
});
// Simulate browser change and click events without production data or network.
const listeners={};
const makeElement=(id,checked=false)=>({
 checked,disabled:true,addEventListener(event,fn){listeners[id+':'+event]=fn;}
});
const controls={
 efgPilotParticipate:makeElement('efgPilotParticipate'),
 efgPilotShare:makeElement('efgPilotShare'),
 efgPilotContinue:makeElement('efgPilotContinue')
};
const fakeDoc={getElementById:id=>controls[id]||null};
const acceptedEvents=[];
bindPilotParticipationDemo(fakeDoc,{onContinue:value=>acceptedEvents.push(value)});
assert.equal(controls.efgPilotContinue.disabled,true);
controls.efgPilotParticipate.checked=true;
listeners['efgPilotParticipate:change']();
assert.equal(controls.efgPilotContinue.disabled,true);
assert.throws(()=>listeners['efgPilotContinue:click'](),/requiere autorización expresa/);
controls.efgPilotShare.checked=true;
listeners['efgPilotShare:change']();
assert.equal(controls.efgPilotContinue.disabled,false);
listeners['efgPilotContinue:click']();
assert.equal(acceptedEvents.length,1);
assert.deepEqual(acceptedEvents[0],{
 version:PILOT_PARTICIPATION_VERSION,participationRequested:true,
 sharingRequested:true,persisted:false,legalAcceptance:false
});
controls.efgPilotShare.checked=false;
listeners['efgPilotShare:change']();
assert.equal(controls.efgPilotContinue.disabled,true);
assert.throws(()=>listeners['efgPilotContinue:click'](),/requiere autorización expresa/);
assert.equal(acceptedEvents.length,1);
console.log('PASS COACH99: both pilot and coach-sharing boxes mandatory and unchecked, Continue disabled unless both checked; no fictitious acceptance or persistence.');
