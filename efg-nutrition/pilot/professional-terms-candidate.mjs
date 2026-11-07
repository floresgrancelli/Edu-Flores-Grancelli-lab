// Separate release candidate. No SDK, legacy legal module, auth, or mutation imports.
export const PROFESSIONAL_TERMS_RELEASE_ENABLED = false;
export const PROFESSIONAL_TERMS_BINDING_STATE = 'UNBOUND';
export const PROFESSIONAL_TERMS_CAS_STATE = 'NOT_IMPLEMENTED';

// Public-source evidence only. These participant proposals are NOT professional terms.
export const PROFESSIONAL_TERMS_SOURCE_EVIDENCE = Object.freeze({
  sourceCommit: '166a03a51c10e82ed0a0d9bea9557b726ec5da25',
  audience: 'pilot_participants',
  publication: 'UNBOUND',
  professionalBinding: PROFESSIONAL_TERMS_BINDING_STATE,
  version: 'pilot_20261102_v1',
  documents: Object.freeze([
    Object.freeze({kind: 'terms', path: 'efg-nutrition/docs/NCC_PILOTO_CONDICIONES_SIMPLES_PROPUESTA_20261102.txt',
      normalizedSha256: '54c4d8ecd5662e90d20be1b4156249e9a567fd31666265c97138f048e1893af3'}),
    Object.freeze({kind: 'privacy', path: 'efg-nutrition/docs/NCC_PILOTO_PRIVACIDAD_SIMPLE_PROPUESTA_20261102.txt',
      normalizedSha256: 'a66e85435f9e8aaa5469785b85ba61e2b3790bb34d8b978f04d1dfe27289adb6'})
  ])
});

export const PROFESSIONAL_TERMS_UNAVAILABLE = 'La aceptación del espacio profesional no está disponible. Falta vincular los avisos revisados a este uso y verificar el contrato de aceptación del servidor.';
const fail = code => { throw Object.assign(new Error(code), {code, outcome: 'not_applied'}); };

// Enabling the UI preview cannot enable acceptance. There is deliberately no injected
// transport/binding override: the reviewed professional binding and server CAS do not exist.
export function createProfessionalTermsCandidate({enabled = PROFESSIONAL_TERMS_RELEASE_ENABLED} = {}) {
  let disposed = false, status = 'closed', revision = 0;
  function gate() {
    if (disposed) fail('DISPOSED');
    if (enabled !== true) fail('FEATURE_DISABLED');
  }
  function snapshot() {
    if (disposed) fail('DISPOSED');
    return Object.freeze({
      status: enabled === true ? status : 'disabled', revision,
      binding: PROFESSIONAL_TERMS_BINDING_STATE, cas: PROFESSIONAL_TERMS_CAS_STATE,
      available: false, canAccept: false, accepted: false,
      reason: PROFESSIONAL_TERMS_UNAVAILABLE
    });
  }
  return Object.freeze({
    snapshot,
    open() { gate(); status = 'unavailable'; revision++; return snapshot(); },
    accept() { gate(); fail('PROFESSIONAL_BINDING_UNBOUND'); },
    setSelection() { gate(); fail('PROFESSIONAL_BINDING_UNBOUND'); },
    invalidate() { if (!disposed) { status = 'closed'; revision++; } },
    close() { if (!disposed) { status = 'closed'; revision++; } },
    dispose() { disposed = true; status = 'closed'; revision++; }
  });
}
