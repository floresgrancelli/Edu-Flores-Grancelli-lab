import test from 'node:test';
import assert from 'node:assert/strict';
import {mountProfessionalTermsFixturePanel} from '../pilot/professional-terms-fixture-panel.mjs';
import {rootElement, descendants, textContent, button} from './professional-terms-test-support.mjs';
import {createTermsFixture} from './professional-terms-v2-fixture.mjs';
const inputs = root => descendants(root).filter(node => node.tag === 'input');
const check = (root, index) => { const input = inputs(root)[index]; input.checked = true; input.listeners.change(); };

test('fixture panel OFF does not touch root, storage or injected functions', async () => {
  const bomb = new Proxy({}, {get() { throw Error('must not touch'); }});
  const panel = mountProfessionalTermsFixturePanel({root: bomb, transport: bomb, journal: bomb});
  assert.deepEqual(await panel.ready, {disabled: true}); panel.dispose();
});
test('fixture panel shows exact inline body, separate unchecked boxes and explicit acceptance', async () => {
  const f = createTermsFixture(), root = rootElement(), panel = mountProfessionalTermsFixturePanel({root, ...f.options()});
  await panel.ready; assert.equal(inputs(root).length, 2); assert.equal(inputs(root).every(input => !input.checked), true);
  assert.equal(button(root, 'Confirmar ambos avisos ficticios').disabled, true);
  const bodies = descendants(root).filter(node => node.tag === 'pre');
  assert.equal(bodies[0].textContent, f.state.bundle.documents[0].body);
  assert.equal(descendants(root).some(node => node.tag === 'img' || node.tag === 'a'), false);
  check(root, 0); assert.equal(button(root, 'Confirmar ambos avisos ficticios').disabled, true);
  check(root, 1); assert.equal(button(root, 'Confirmar ambos avisos ficticios').disabled, false);
  await button(root, 'Confirmar ambos avisos ficticios').listeners.click();
  assert.match(textContent(root), /Aceptación ficticia confirmada para estas versiones/);
  assert.equal(inputs(root).every(input => !input.checked && input.disabled), true); assert.equal(f.state.writes, 1);
  button(root, 'Cerrar ensayo').listeners.click(); assert.equal(root.children.length, 0); panel.dispose();
});
test('lost reply remount discovers pending receipt and never reenables blind submit', async () => {
  const f = createTermsFixture(), root = rootElement(); let panel = mountProfessionalTermsFixturePanel({root, ...f.options()});
  await panel.ready; check(root, 0); check(root, 1); f.state.loss = true;
  await button(root, 'Confirmar ambos avisos ficticios').listeners.click();
  assert.match(textContent(root), /resultado incierto/); panel.dispose();
  panel = mountProfessionalTermsFixturePanel({root, ...f.options()}); await panel.ready;
  assert.equal(button(root, 'Confirmar ambos avisos ficticios').disabled, true);
  assert.equal(inputs(root).every(input => input.disabled), true);
  await button(root, 'Verificar aceptación anterior').listeners.click();
  assert.match(textContent(root), /Aceptación ficticia confirmada para estas versiones/);
  assert.equal(f.state.writes, 1); panel.dispose(); assert.deepEqual(root.listeners, {});
});
test('refresh clears checks and external revalidation immediately removes documents', async () => {
  const f = createTermsFixture(), root = rootElement(), panel = mountProfessionalTermsFixturePanel({root, ...f.options()});
  await panel.ready; check(root, 0); check(root, 1);
  await button(root, 'Volver a consultar documentos').listeners.click();
  assert.equal(inputs(root).every(input => !input.checked), true); assert.equal(f.state.writes, 0);
  assert.equal(panel.revalidate(), true); assert.equal(root.children.length, 0); panel.dispose();
});
test('close during pending CAS removes text and cannot be reversed by late receipt', async () => {
  const f = createTermsFixture(), root = rootElement(), panel = mountProfessionalTermsFixturePanel({root, ...f.options()});
  await panel.ready; check(root, 0); check(root, 1);
  let release, enter; const entered = new Promise(resolve => { enter = resolve; });
  f.state.beforeAccept = async () => { enter(); await new Promise(resolve => { release = resolve; }); };
  const pending = button(root, 'Confirmar ambos avisos ficticios').listeners.click(); await entered;
  button(root, 'Cerrar ensayo').listeners.click(); assert.equal(root.children.length, 0);
  release(); await pending; assert.equal(root.children.length, 0); assert.equal(f.state.writes, 1); panel.dispose();
});
