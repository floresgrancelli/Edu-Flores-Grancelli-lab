import {createProfessionalTermsCandidate, PROFESSIONAL_TERMS_RELEASE_ENABLED} from './professional-terms-candidate.mjs';

// Unmounted candidate UI. Default OFF is a true no-op, including DOM and storage.
export function mountProfessionalTermsPanel({root, enabled = PROFESSIONAL_TERMS_RELEASE_ENABLED} = {}) {
  if (enabled !== true) return Object.freeze({ready: Promise.resolve({disabled: true}),
    revalidate() { return false; }, dispose() {}});
  if (!root?.ownerDocument?.createElement || typeof root.replaceChildren !== 'function') throw new Error('ROOT_REQUIRED');
  const doc = root.ownerDocument, candidate = createProfessionalTermsCandidate({enabled});
  let disposed = false;
  const stop = event => event.stopPropagation();
  for (const type of ['click', 'input', 'change', 'submit']) root.addEventListener(type, stop);
  const node = (tag, text) => { const element = doc.createElement(tag); element.textContent = text; return element; };
  function render() {
    if (disposed) return;
    const state = candidate.snapshot();
    root.replaceChildren();
    if (state.status === 'closed') return;
    const section = node('section', '');
    section.setAttribute('aria-label', 'Aceptación del espacio profesional');
    section.setAttribute('data-ncc-professional-terms', 'unavailable');
    section.append(node('h3', 'Aceptación del espacio profesional'));
    const status = node('p', state.reason);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    section.append(status);
    section.append(node('p', 'Los avisos existentes son propuestas para participantes del piloto. No constituyen por sí solos una aceptación profesional.'));
    section.append(node('p', 'La aceptación como alumna o alumno se gestiona por separado y no habilita este paso.'));
    const confirm = node('button', 'Confirmar avisos profesionales');
    confirm.type = 'button';
    confirm.disabled = true;
    confirm.setAttribute('aria-disabled', 'true');
    // No click handler, checkbox, hidden submit, or action dispatched from this button.
    section.append(confirm);
    const close = node('button', 'Volver');
    close.type = 'button';
    close.addEventListener('click', () => { if (!disposed) { candidate.close(); render(); } });
    section.append(close);
    root.append(section);
  }
  candidate.open(); render();
  return Object.freeze({
    ready: Promise.resolve({disabled: false, available: false, binding: 'UNBOUND', cas: 'NOT_IMPLEMENTED'}),
    revalidate() { if (disposed) return false; candidate.invalidate(); render(); return true; },
    dispose() {
      if (disposed) return;
      disposed = true; candidate.dispose();
      for (const type of ['click', 'input', 'change', 'submit']) root.removeEventListener(type, stop);
      root.replaceChildren();
    }
  });
}
