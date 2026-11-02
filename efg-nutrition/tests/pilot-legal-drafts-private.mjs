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
 {terms:proposedTerms.replace('Nutrición Con-Ciencia','Otra aplicación'),privacy:proposedPrivacy},
 {terms:proposedTerms,privacy:proposedPrivacy.replace('supresión','')},
 {terms:proposedTerms,privacy:proposedPrivacy.replace('Retirar el permiso','Otro cambio')},
 {terms:proposedTerms,privacy:proposedTerms},
 {terms:proposedTerms,privacy:proposedPrivacy,version:'pilot_20261103_v1'}
]){
 assert.equal(inspectPilotLegalDrafts(bad).readyForManualReview,false,
  'Missing brand, rights, withdrawal, distinct text or pinned version must fail closed');
}
// Preserve the public-facing copy exactly as requested. The following
// synthetic enrichment is ONLY for the local review contract: never put
// fictional names/addresses into documents seen by pilot participants.
const filled=(body,kind)=>{
 const src=body.replace(/^BORRADOR INTERNO — NO PUBLICAR\n/,'');
 const heading=kind==='terms'
  ?'# Condiciones para participar en el piloto de Nutrición Con-Ciencia\n'
  :'# Aviso de datos y privacidad del piloto de Nutrición Con-Ciencia\n';
 const fields='Versión propuesta: pilot_20261102_v1\n'+
  'Responsable: Entidad de simulación QA\n'+
  'Domicilio: Domicilio de ejemplo 100, CABA\n'+
  'Contacto: soporte@example.invalid\n';
 const provider=kind==='privacy'
  ?'Conservación: 30 días tras finalizar piloto, sujeto a auditoría.\n'+
   'Infraestructura sintética: Supabase y Render.\n'
  :'';
 return heading+fields+provider+src;
};
const fillTerms=()=>filled(terms,'terms');
const fillPrivacy=()=>filled(privacy,'privacy');
const checked=inspectPilotLegalDrafts({terms:fillTerms(),privacy:fillPrivacy(),version});
assert.deepEqual(checked.blockers,[],'Only synthetic, populated copies pass technical review');
assert.equal(checked.readyForManualReview,true);
assert.equal(checked.publishable,false,'Technical review never activates the hosted app');
assert.equal(checked.uploaded,false);
for(const changed of [
 {privacy:fillPrivacy().replace('Supabase','otro servicio')},
 {terms:fillPrivacy(),privacy:fillTerms()},
 {version:'pilot_20261103_v1'},
 {privacy:fillTerms()}
]){
 const r=inspectPilotLegalDrafts({terms:fillTerms(),privacy:fillPrivacy(),version,...changed});
 assert.ok(r.blockers.length>0,JSON.stringify(changed).slice(0,70));
 assert.equal(r.publishable,false);
}
console.log('PASS 01-03: pilot drafts blocked until real identity, address, contact, retention and distinct versioned documents; no SQL, no publication, no commercial contract required.');
