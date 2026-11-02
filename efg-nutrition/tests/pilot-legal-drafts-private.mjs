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
const filled=body=>body.replace(/^BORRADOR INTERNO — NO PUBLICAR\n/,'')
 .replace(/\[PENDIENTE: nombre real o razón social\]/g,'Entidad de simulación QA')
 .replace(/\[PENDIENTE: domicilio de contacto\]/g,'Domicilio de ejemplo 100, CABA')
 .replace(/\[PENDIENTE: correo real de soporte y privacidad\]/g,'soporte@example.invalid')
 .replace(/\[PENDIENTE: correo real para ejercer derechos de datos\]/g,'privacidad@example.invalid')
 .replace(/\[PENDIENTE: plazo concreto y tratamiento de copias de respaldo\]/g,'30 días tras finalizar piloto, sujeto a auditoría');
const checked=inspectPilotLegalDrafts({terms:filled(terms),privacy:filled(privacy),version});
assert.deepEqual(checked.blockers,[],'Only synthetic, populated copies pass technical review');
assert.equal(checked.readyForManualReview,true);
assert.equal(checked.publishable,false,'Technical review never activates the hosted app');
assert.equal(checked.uploaded,false);
for(const changed of [
 {privacy:filled(privacy).replace('Supabase','otro servicio')},
 {terms:filled(privacy),privacy:filled(terms)},
 {version:'pilot_20261103_v1'},
 {privacy:filled(terms)}
]){
 const r=inspectPilotLegalDrafts({terms:filled(terms),privacy:filled(privacy),version,...changed});
 assert.ok(r.blockers.length>0,JSON.stringify(changed).slice(0,70));
 assert.equal(r.publishable,false);
}
console.log('PASS 01-03: pilot drafts blocked until real identity, address, contact, retention and distinct versioned documents; no SQL, no publication, no commercial contract required.');
