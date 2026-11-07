import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfessionalTermsCandidate, PROFESSIONAL_TERMS_RELEASE_ENABLED} from '../pilot/professional-terms-candidate.mjs';
import {mountProfessionalTermsPanel} from '../pilot/professional-terms-panel.mjs';
import {rootElement, descendants, textContent, button} from './professional-terms-test-support.mjs';

test('default OFF touches no DOM, SDK, storage or observer', async () => {
  assert.equal(PROFESSIONAL_TERMS_RELEASE_ENABLED, false);
  const bomb = new Proxy({}, {get() { throw Error('must not touch'); }});
  const panel = mountProfessionalTermsPanel({root: bomb, sdk: bomb, journal: bomb});
  assert.deepEqual(await panel.ready, {disabled: true}); assert.equal(panel.revalidate(), false); panel.dispose();
  const client = createProfessionalTermsCandidate({sdk: bomb, journal: bomb});
  assert.throws(() => client.open(), /FEATURE_DISABLED/);
  assert.throws(() => client.accept({accepted: true}), /FEATURE_DISABLED/);
});
test('UNBOUND cannot be overridden by checked boxes, student acceptance or invented metadata', () => {
  const candidate = createProfessionalTermsCandidate({enabled: true, binding: 'reviewed', legal_ready: true});
  candidate.open();
  assert.equal(candidate.snapshot().canAccept, false); assert.equal(candidate.snapshot().accepted, false);
  assert.throws(() => candidate.accept({terms: true, privacy: true, studentAccepted: true}), /PROFESSIONAL_BINDING_UNBOUND/);
  assert.throws(() => candidate.setSelection('terms', true), /PROFESSIONAL_BINDING_UNBOUND/);
});
test('separate panel shows unavailable, no checkboxes or executable accept handler', async () => {
  const root = rootElement(), panel = mountProfessionalTermsPanel({root, enabled: true});
  assert.equal((await panel.ready).binding, 'UNBOUND');
  assert.match(textContent(root), /propuestas para participantes del piloto/);
  assert.match(textContent(root), /alumna o alumno se gestiona por separado/);
  assert.equal(descendants(root).filter(node => node.tag === 'input').length, 0);
  assert.equal(button(root, 'Confirmar avisos profesionales').disabled, true);
  assert.equal(button(root, 'Confirmar avisos profesionales').listeners.click, undefined);
  button(root, 'Volver').listeners.click(); assert.equal(root.children.length, 0);
  panel.dispose(); assert.deepEqual(root.listeners, {}); assert.equal(panel.revalidate(), false);
});
test('context invalidation, repeated close and dispose cannot reopen stale acceptance', () => {
  const root = rootElement(), panel = mountProfessionalTermsPanel({root, enabled: true});
  assert.equal(panel.revalidate(), true); assert.equal(root.children.length, 0);
  panel.dispose(); panel.dispose(); assert.equal(panel.revalidate(), false);
  const client = createProfessionalTermsCandidate({enabled: true}); client.open(); client.close(); client.close();
  assert.equal(client.snapshot().status, 'closed'); client.dispose();
  assert.throws(() => client.open(), /DISPOSED/); assert.throws(() => client.accept(), /DISPOSED/);
});
