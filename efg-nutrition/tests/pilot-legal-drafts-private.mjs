import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectPilotLegalDrafts} from '../tools/prepare-pilot-legal-review.mjs';
const terms=readFileSync(new URL('../docs/PILOTO_CONDICIONES_BORRADOR_20261102.md',import.meta.url),'utf8');
const privacy=readFileSync(new URL('../docs/PILOTO_PRIVACIDAD_BORRADOR_20261102.md',import.meta.url),'utf8');
const version='pilot_20261102_v1';
const draft=inspectPilotLegalDrafts({terms,privacy,version});
assert.equal(draft.readyForManualReview,false,'Unknown real identity/contact cannot be accepted');
assert.equal(draft.publishable,false);
assert.ok(draft.blockers.includes('TERMS_REVIEW_FIELDS_MISSING'));
assert.ok(draft.blockers.includes('PRIVACY_REVIEW_FIELDS_MISSING'));
assert.equal(draft.documents[0].sha256,createHash('sha256').update(terms.trim()).digest('hex'));
assert.notEqual(draft.documents[0].sha256,draft.documents[1].sha256);
// NCC 01-03: the user-approved scope is two honest, short PILOT notices,
// not a completed commercial contract or fictional name/address/phone.
const proposedTerms=readFileSync(new URL('../docs/NCC_PILOTO_CONDICIONES_SIMPLES_PROPUESTA_20261102.txt',import.meta.url),'utf8');
const proposedPrivacy=readFileSync(new URL('../docs/NCC_PILOTO_PRIVACIDAD_SIMPLE_PROPUESTA_20261102.txt',import.meta.url),'utf8');
const proposed=inspectPilotLegalDrafts({terms:proposedTerms,privacy:proposedPrivacy,version});
assert.equal(proposed.reviewScope,'PILOTO_PRIVADO_MINIMO_NO_COMERCIAL');
assert.equal(proposed.readyForManualReview,true,
 'Minimal pilot notices may be prepared WITHOUT invented commercial address or manager');
assert.deepEqual(proposed.blockers,[]);
assert.equal(proposed.publishable,false,'Approval/GO, server upload and receipts remain separate');
assert.equal(proposed.uploaded,false,'Do not publish pilot documents from unit tests');
assert.ok(proposed.documents.every(x=>x.characters>=300&&x.sha256));
for(const text of [proposedTerms,proposedPrivacy]){
 assert.match(text,/Nutrición Con-Ciencia/);
 assert.doesNotMatch(text,/Responsable:\\s*Entidad de simulación|Domicilio de ejemplo|\\[(?:PENDIENTE|COMPLETAR)\\]|BORRADOR INTERNO — NO PUBLICAR/);
}
for(const bad of [
 // Replace EVERY occurrence of the brand; one surviving mention is not proof
 // that the notice belongs to the right application.
 {terms:proposedTerms.replaceAll('Nutrición Con-Ciencia','Otra aplicación'),privacy:proposedPrivacy},
 {terms:proposedTerms,privacy:proposedPrivacy.replace('acceso, corrección o supresión','consultas generales')},
 {terms:proposedTerms,privacy:proposedPrivacy.replace('Retirar el permiso','Otro cambio')},
 {terms:proposedTerms,privacy:proposedPrivacy.replace('a través del coach que te invitó o del equipo que te invitó al piloto','por otro canal')},
 {terms:proposedTerms,privacy:proposedTerms},
 {terms:proposedTerms,privacy:proposedPrivacy,version:'pilot_20261103_v1'}
]){
 assert.equal(inspectPilotLegalDrafts(bad).readyForManualReview,false,
  'Missing brand, rights, withdrawal, support route, distinct text or pinned version must fail closed');
}
console.log('PASS 01-03: two simple reviewed pilot NOTICES ready for human review; old internal drafts blocked; no fabricated personal address, no SQL, no production publication.');
