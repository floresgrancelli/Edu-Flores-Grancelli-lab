import {createProfessionalTermsFixtureFlow, PROFESSIONAL_TERMS_FIXTURE_ENABLED} from './professional-terms-fixture-flow.mjs';

// Explicit synthetic preview only. Never imported by the pilot or the real UNBOUND panel.
export function mountProfessionalTermsFixturePanel({root, enabled = PROFESSIONAL_TERMS_FIXTURE_ENABLED, ...options} = {}) {
  if (enabled !== true) return Object.freeze({ready: Promise.resolve({disabled: true}), revalidate() { return false; }, dispose() {}});
  if (!root?.ownerDocument?.createElement || typeof root.replaceChildren !== 'function') throw new Error('ROOT_REQUIRED');
  const flow = createProfessionalTermsFixtureFlow({...options, enabled}), doc = root.ownerDocument;
  let disposed = false, busy = false, notice = 'Ensayo aislado con documentos ficticios. Sin validez legal.';
  const stop = event => event.stopPropagation();
  for (const kind of ['click', 'input', 'change', 'submit']) root.addEventListener(kind, stop);
  const node = (tag, text = '') => { const element = doc.createElement(tag); element.textContent = text; return element; };
  const button = (parent, label, action, disabled = false) => {
    const element = node('button', label); element.type = 'button'; element.disabled = disabled;
    element.addEventListener('click', action); parent.append(element); return element;
  };
  const messages = {
    UNRESOLVED: 'La aceptación anterior sigue sin recibo verificable. No se volverá a enviar.',
    INVALID_LEGAL_RECEIPT: 'El recibo no coincide con la operación anterior. No se volverá a enviar.',
    LEGAL_BINDING_CHANGED: 'Las versiones cambiaron. Se descartaron las casillas y el intento anterior queda bloqueado para revisión, sin reenvío.',
    PROFESSIONAL_BINDING_UNBOUND: 'No hay avisos vinculados a este uso profesional. La aceptación no está disponible.',
    SYNTHETIC_FIXTURE_REQUIRED: 'Este panel sólo admite el ensayo ficticio aislado.',
    STALE_CONTEXT: 'El contexto cambió. Se cerró la vista anterior.'
  };
  async function run(action) {
    if (disposed || busy) return;
    busy = true; render();
    try {
      const result = await action();
      notice = result?.accepted ? 'Aceptación ficticia confirmada para estas versiones.' : result?.historicalAccepted
        ? 'El recibo confirma versiones anteriores. Las versiones actuales necesitan una aceptación nueva y explícita.'
        : 'Documentos ficticios comprobados. Revisá cada uno antes de marcar su casilla.';
    } catch (error) {
      notice = error.outcome === 'confirmed_historical'
        ? 'El recibo anterior fue verificado, pero no se pudo comprobar la vigencia actual. La aceptación actual sigue bloqueada.'
        : messages[error.code] || 'No se pudo completar la verificación. No se reintentará ninguna aceptación automáticamente.';
    } finally { busy = false; if (!disposed) render(); }
  }
  function render() {
    if (disposed) return;
    let state;
    try { state = flow.snapshot(); } catch { root.replaceChildren(); return; }
    root.replaceChildren();
    if (state.status === 'closed') return;
    const section = node('section'); section.setAttribute('aria-label', 'Ensayo de aceptación profesional');
    section.append(node('h3', 'Aceptación profesional · ensayo ficticio'));
    section.append(node('p', 'Contrato propuesto, todavía no implementado en el servidor. Esta pantalla no habilita producción ni convierte una aceptación de alumno en aceptación profesional.'));
    const status = node('p', notice); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); section.append(status);
    if (state.pending?.state === 'uncertain') section.append(node('p', 'Hay una operación anterior con resultado incierto. Sólo se puede consultar su recibo; no se reenvía.'));
    if (state.bundle) {
      for (const document of state.bundle.documents) {
        const labelText = document.kind === 'terms' ? 'Condiciones del ensayo ficticio' : 'Privacidad del ensayo ficticio';
        const article = node('article'); article.append(node('h4', `${labelText} · ${document.version}`));
        // textContent and pre preserve the exact verified bytes as text, without HTML or URL interpretation.
        const body = node('pre', document.body); body.setAttribute('data-document-kind', document.kind); article.append(body);
        const label = node('label'), input = node('input'); input.type = 'checkbox'; input.checked = state.checked[document.kind];
        input.setAttribute('aria-label', 'Confirmo ' + labelText.toLowerCase());
        input.disabled = busy || state.busy || state.status !== 'ready' || state.accepted ||
          state.pending?.state === 'uncertain' || state.pending?.bindingSha256 === state.bundle.binding_sha256;
        input.addEventListener('change', () => {
          if (disposed || busy) return;
          try { flow.setSelection(document.kind, input.checked === true); } catch { notice = 'La selección ya no está disponible. Volvé a verificar el contexto.'; }
          render();
        });
        label.append(input, node('span', 'Leí y confirmo expresamente este documento ficticio.'));
        article.append(label); section.append(article);
      }
    }
    button(section, 'Confirmar ambos avisos ficticios', () => run(() => flow.accept()), busy || !state.canAccept);
    if (state.pending) button(section, 'Verificar aceptación anterior', () => run(() => flow.reconcile()), busy);
    button(section, 'Volver a consultar documentos', () => run(() => flow.open()), busy);
    // Dismiss is always available, including a response lost or still in flight.
    button(section, 'Cerrar ensayo', () => { if (!disposed) { flow.close(); root.replaceChildren(); } });
    root.append(section);
  }
  const ready = run(() => flow.open()).then(() => ({disabled: false, fixtureOnly: true}));
  return Object.freeze({ready,
    revalidate() { if (disposed) return false; flow.invalidate(); root.replaceChildren(); return true; },
    dispose() {
      if (disposed) return;
      disposed = true; flow.dispose();
      for (const kind of ['click', 'input', 'change', 'submit']) root.removeEventListener(kind, stop);
      root.replaceChildren();
    }
  });
}
