import {createProfessionalTermsJournal, professionalTermsScope, validateProfessionalTermsRecord,
  PROFESSIONAL_TERMS_FIXTURE_ORIGIN} from './professional-terms-journal.mjs';

// Coordinated v2 proposal, NOT an implemented/approved backend. Only synthetic .invalid fixtures.
// This flow cannot replace the real UNBOUND candidate or use a production SDK.
export const PROFESSIONAL_TERMS_FIXTURE_ENABLED = false;
export const PROFESSIONAL_TERMS_V2_SCOPE = 'professional_workspace_acceptance_v2';
export const PROFESSIONAL_TERMS_V2_RPC = Object.freeze({
  bundle: 'ncc_pilot_workspace_legal_bundle_v2', accept: 'ncc_pilot_workspace_accept_terms_v2',
  receipt: 'ncc_pilot_workspace_receipt_v1'
});
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const version = value => typeof value === 'string' && value.length > 0 && new TextEncoder().encode(value).length <= 1024;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const clone = value => structuredClone(value);
const fail = code => { throw Object.assign(new Error(code), {code}); };
const stamp = value => {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day] = match.map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
};
const sha = async (value, crypto) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
export async function professionalTermsBindingSha256(bundle, crypto = globalThis.crypto) {
  const terms = bundle.documents.find(doc => doc.kind === 'terms');
  const privacy = bundle.documents.find(doc => doc.kind === 'privacy');
  const fields = [bundle.actor_id.toLowerCase(), bundle.organization_id.toLowerCase(), bundle.scope,
    terms.document_id.toLowerCase(), terms.version, terms.sha256.toLowerCase(),
    privacy.document_id.toLowerCase(), privacy.version, privacy.sha256.toLowerCase()];
  return sha('NCC-PROFESSIONAL-LEGAL-BUNDLE-V2\n' + fields.map(field =>
    `${new TextEncoder().encode(field).length}:${field}`).join(''), crypto);
}
async function verifiedBundle(input, context, crypto) {
  const bundle = clone(input);
  if (!exact(bundle, ['contract_version', 'actor_id', 'organization_id', 'scope', 'binding_sha256', 'documents']) ||
      bundle.contract_version !== 2 || bundle.actor_id !== context.userId || bundle.organization_id !== context.organizationId ||
      bundle.scope !== PROFESSIONAL_TERMS_V2_SCOPE || !hash(bundle.binding_sha256) || !Array.isArray(bundle.documents) ||
      bundle.documents.length !== 2 || ['terms', 'privacy'].some(kind => bundle.documents.filter(doc => doc?.kind === kind).length !== 1)) fail('INVALID_LEGAL_BUNDLE');
  for (const doc of bundle.documents) {
    if (!exact(doc, ['kind', 'document_id', 'version', 'sha256', 'body', 'published_at', 'is_current', 'url']) ||
        !uuid(doc.document_id) || !version(doc.version) || !hash(doc.sha256) || !stamp(doc.published_at) ||
        doc.is_current !== true || typeof doc.body !== 'string' || !doc.body.trim() || doc.body.length > 200000 ||
        /\[(?:PENDIENTE|POR COMPLETAR)[^\]]*\]|BORRADOR\s+(?:INTERNO\s*[—–:-]?\s*)?NO\s+PUBLICAR|NO\s+EN\s+VIGENCIA|ESTADO:\s*NO\s+APROBADO|PROPUESTA\s+PRIVADA|NO\s+PUBLICAD[OA]\s+NI\s+ACEPTAD[OA]/i.test(doc.body)) fail('INVALID_LEGAL_DOCUMENT');
    // Optional URL is never interpreted as the document or evidence. Rendering stays inline.
    if (doc.url !== null) {
      let url; try { url = new URL(doc.url); } catch { fail('INVALID_LEGAL_DOCUMENT'); }
      if (url.protocol !== 'https:' || url.username || url.password) fail('INVALID_LEGAL_DOCUMENT');
    }
    if (await sha(doc.body, crypto) !== doc.sha256) fail('LEGAL_BODY_HASH_MISMATCH');
  }
  if (bundle.documents[0].document_id === bundle.documents[1].document_id ||
      await professionalTermsBindingSha256(bundle, crypto) !== bundle.binding_sha256) fail('LEGAL_BINDING_HASH_MISMATCH');
  bundle.documents.sort((a, b) => a.kind === 'terms' ? -1 : b.kind === 'terms' ? 1 : 0);
  return bundle;
}
function verifyResult(result, record, context) {
  if (!exact(result, ['contract_version', 'actor_id', 'organization_id', 'request_id', 'legal_ready', 'legal_binding_sha256']) ||
      result.contract_version !== 2 || result.actor_id !== context.userId || result.organization_id !== context.organizationId ||
      result.request_id !== record.requestId || result.legal_ready !== true || result.legal_binding_sha256 !== record.bindingSha256) fail('INVALID_LEGAL_RECEIPT');
}
function verifyReceipt(receipt, record, context) {
  if (!exact(receipt, ['operation', 'payload', 'result']) || receipt.operation !== 'acceptTerms' ||
      !exact(receipt.payload, ['p_org', 'p_expected_binding_sha256']) || receipt.payload.p_org !== context.organizationId ||
      receipt.payload.p_expected_binding_sha256 !== record.bindingSha256) fail('INVALID_LEGAL_RECEIPT');
  verifyResult(receipt.result, record, context);
}
const same = (a, b) => a && b && ['userId', 'sessionId', 'organizationId'].every(key => a[key] === b[key]);

export function createProfessionalTermsFixtureFlow({enabled = PROFESSIONAL_TERMS_FIXTURE_ENABLED,
  fixtureEnvironment, transport, readContext, journal, crypto = globalThis.crypto} = {}) {
  let durableJournal = journal;
  const storage = () => durableJournal ||= createProfessionalTermsJournal();
  let disposed = false, epoch = 0, context = null, bundle = null, pending = null, historical = null;
  let status = 'closed', busy = false, checked = {terms: false, privacy: false};
  function clear() { epoch++; context = null; bundle = null; pending = null; historical = null; busy = false;
    checked = {terms: false, privacy: false}; status = 'closed'; }
  function gate() {
    if (disposed) fail('DISPOSED');
    if (enabled !== true) fail('FEATURE_DISABLED');
    if (fixtureEnvironment?.() !== true || transport?.kind !== 'ncc-professional-terms-v2-fixture' ||
        transport.backendOrigin !== PROFESSIONAL_TERMS_FIXTURE_ORIGIN || typeof transport.rpc !== 'function') fail('SYNTHETIC_FIXTURE_REQUIRED');
    const next = readContext?.();
    if (!next || !uuid(next.userId) || !uuid(next.sessionId) || !uuid(next.organizationId) || next.isTest !== true || next.active !== true) {
      clear(); fail('FIXTURE_CONTEXT_REQUIRED');
    }
    if (context && !same(context, next)) { clear(); fail('STALE_CONTEXT'); }
    return {...next};
  }
  function ticket() { const next = gate(); return {epoch, context: next}; }
  function check(t) { const next = gate(); if (t.epoch !== epoch || !same(next, t.context)) fail('STALE_CONTEXT'); }
  function scope(t) { return {backendOrigin: PROFESSIONAL_TERMS_FIXTURE_ORIGIN, userId: t.context.userId, organizationId: t.context.organizationId}; }
  async function rpc(name, args, t) {
    check(t); const response = await transport.rpc(name, clone(args)); check(t);
    if (!response || response.error) {
      if (response?.error?.code === '22023' && response.error.message === 'NCC_LEGAL_BINDING_CHANGED') fail('LEGAL_BINDING_CHANGED');
      if (response?.error?.code === '55000' && response.error.message === 'NCC_LEGAL_BINDING_UNBOUND') fail('PROFESSIONAL_BINDING_UNBOUND');
      fail(response?.error?.code || 'LEGAL_RPC_FAILED');
    }
    return response.data;
  }
  async function loadBundle(t) {
    const result = await rpc(PROFESSIONAL_TERMS_V2_RPC.bundle, {p_org: t.context.organizationId}, t);
    const verified = await verifiedBundle(result, t.context, crypto); check(t); return verified;
  }
  function snapshot() {
    if (enabled !== true) return {status: 'disabled', available: false, canAccept: false};
    gate();
    const accepted = !!historical && bundle?.binding_sha256 === historical.bindingSha256;
    const blocked = pending?.state === 'uncertain' || pending?.bindingSha256 === bundle?.binding_sha256;
    return clone({status, available: !!bundle, busy, bundle, checked, accepted,
      historicalAccepted: !!historical, canAccept: status === 'ready' && !busy && !accepted && !blocked && checked.terms && checked.privacy,
      pending: pending ? {requestId: pending.requestId, state: pending.state, bindingSha256: pending.bindingSha256} : null});
  }
  async function open() {
    gate(); clear(); const t = ticket(); context = {...t.context}; status = 'loading'; busy = true;
    try {
      const stored = await storage().get(scope(t)); check(t);
      if (stored) {
        const record = validateProfessionalTermsRecord(stored);
        const expected = professionalTermsScope(scope(t));
        if (record.key !== expected.key || record.namespace !== expected.namespace) fail('INVALID_TERMS_JOURNAL_RECORD');
        pending = record;
      }
      const loaded = await loadBundle(t); check(t); bundle = loaded;
      status = pending?.state === 'uncertain' ? 'uncertain' : 'ready'; busy = false;
      return snapshot();
    } catch (error) { if (t.epoch === epoch) { bundle = null; checked = {terms: false, privacy: false}; status = 'unavailable'; } throw error; }
    finally { if (t.epoch === epoch) busy = false; }
  }
  function setSelection(kind, value) {
    gate();
    if (!['terms', 'privacy'].includes(kind) || typeof value !== 'boolean') fail('INVALID_SELECTION');
    if (busy || status !== 'ready' || !bundle || pending?.state === 'uncertain' ||
        pending?.bindingSha256 === bundle.binding_sha256 || historical?.bindingSha256 === bundle.binding_sha256) fail('ACCEPTANCE_UNAVAILABLE');
    checked[kind] = value; return snapshot();
  }
  async function confirm(record, receipt, t) {
    verifyReceipt(receipt, record, t.context); check(t);
    if (!await storage().settle(record)) fail('TERMS_JOURNAL_CHANGED'); check(t);
    pending = {...record, state: 'confirmed'}; historical = {bindingSha256: record.bindingSha256};
    checked = {terms: false, privacy: false};
    // A receipt is only historical. A fresh complete bundle determines current applicability.
    const loaded = await loadBundle(t); check(t); bundle = loaded;
    status = bundle.binding_sha256 === record.bindingSha256 ? 'accepted' : 'ready'; busy = false;
    return snapshot();
  }
  async function accept() {
    const t = ticket();
    if (!snapshot().canAccept) fail('EXPLICIT_ACCEPTANCE_REQUIRED');
    const shown = clone(bundle), terms = shown.documents.find(doc => doc.kind === 'terms'), privacy = shown.documents.find(doc => doc.kind === 'privacy');
    const record = {...professionalTermsScope(scope(t)), claimId: crypto.randomUUID(), operation: 'acceptTerms', requestId: crypto.randomUUID(),
      bindingSha256: shown.binding_sha256, termsVersion: terms.version, privacyVersion: privacy.version,
      termsSha256: terms.sha256, privacySha256: privacy.sha256};
    let reserved = false; busy = true;
    try {
      reserved = await storage().reserve(record); check(t);
      if (!reserved) fail('OPERATION_ALREADY_RECORDED');
      pending = {...record, state: 'uncertain'}; status = 'uncertain'; checked = {terms: false, privacy: false};
      // No silent refresh: compare-and-set receives exactly the binding whose text was displayed.
      const result = await rpc(PROFESSIONAL_TERMS_V2_RPC.accept, {p_org: t.context.organizationId,
        p_expected_binding_sha256: record.bindingSha256, p_request_id: record.requestId}, t);
      verifyResult(result, record, t.context);
      const receipt = await rpc(PROFESSIONAL_TERMS_V2_RPC.receipt, {p_request_id: record.requestId}, t);
      if (receipt === null) fail('UNRESOLVED');
      return await confirm(record, receipt, t);
    } catch (error) {
      const confirmed = pending?.requestId === record.requestId && pending.state === 'confirmed' && historical?.bindingSha256 === record.bindingSha256;
      if (t.epoch === epoch) { checked = {terms: false, privacy: false}; status = confirmed ? 'unavailable' : reserved ? 'uncertain' : 'unavailable';
        if (confirmed) bundle = null;
        // Show the new complete pair, but never discard a durable claim merely because
        // a current value changed. This candidate has no unsafe unlock/retry escape hatch.
        if (error.code === 'LEGAL_BINDING_CHANGED') { try { const loaded = await loadBundle(t); check(t); bundle = loaded; } catch { if (t.epoch === epoch) bundle = null; } }
      }
      throw Object.assign(new Error(error.code || error.message), {code: error.code || 'LEGAL_ACCEPTANCE_FAILED',
        outcome: confirmed ? 'confirmed_historical' : reserved ? 'uncertain' : 'not_applied'});
    } finally { if (t.epoch === epoch) busy = false; }
  }
  async function reconcile() {
    const t = ticket(); if (busy || !pending) fail('NO_PENDING_ACCEPTANCE');
    const record = clone(pending); busy = true;
    try {
      const receipt = await rpc(PROFESSIONAL_TERMS_V2_RPC.receipt, {p_request_id: record.requestId}, t);
      if (receipt === null) fail('UNRESOLVED');
      return await confirm(record, receipt, t);
    } catch (error) {
      const confirmed = pending?.requestId === record.requestId && pending.state === 'confirmed' && historical?.bindingSha256 === record.bindingSha256;
      if (t.epoch === epoch) { checked = {terms: false, privacy: false}; status = confirmed ? 'unavailable' : 'uncertain'; if (confirmed) bundle = null; }
      throw Object.assign(new Error(error.code || error.message), {code: error.code || 'LEGAL_RECEIPT_FAILED',
        outcome: confirmed ? 'confirmed_historical' : 'uncertain'});
    } finally { if (t.epoch === epoch) busy = false; }
  }
  return Object.freeze({kind: 'ncc-professional-terms-v2-fixture', open, snapshot, setSelection, accept, reconcile,
    invalidate: clear, close: clear, dispose() { disposed = true; clear(); }});
}
