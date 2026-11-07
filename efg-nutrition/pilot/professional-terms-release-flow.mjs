import {createProfessionalTermsJournal, professionalTermsScope, validateProfessionalTermsRecord} from './professional-terms-journal.mjs?v=ncc-dual-role-release-r3-20261107';
import {verifiedBundle, verifyResult, verifyReceipt} from './professional-terms-validation.mjs?v=ncc-dual-role-release-r3-20261107';
export const PROFESSIONAL_TERMS_RELEASE_FLOW_ENABLED = false;
const PROFESSIONAL_TERMS_V2_RPC = Object.freeze({bundle:'ncc_pilot_workspace_legal_bundle_v2',accept:'ncc_pilot_workspace_accept_terms_v2',receipt:'ncc_pilot_workspace_receipt_v1'});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const clone=v=>structuredClone(v);
const fail=code=>{throw Object.assign(new Error(code),{code});};
const same=(a,b)=>a&&b&&['userId','sessionId','organizationId'].every(k=>a[k]===b[k]);
// Release flow uses the existing durable acceptance journal and never falls back to v1.
export function createProfessionalTermsReleaseFlow({enabled = PROFESSIONAL_TERMS_RELEASE_FLOW_ENABLED,
  transport, backendOrigin, readContext, journal, crypto = globalThis.crypto} = {}) {
  let durableJournal = journal;
  const storage = () => durableJournal ||= createProfessionalTermsJournal();
  let disposed = false, epoch = 0, context = null, bundle = null, pending = null, historical = null;
  let status = 'closed', busy = false, checked = {terms: false, privacy: false};
  function clear() { epoch++; context = null; bundle = null; pending = null; historical = null; busy = false;
    checked = {terms: false, privacy: false}; status = 'closed'; }
  function gate() {
    if (disposed) fail('DISPOSED');
    if (enabled !== true) fail('FEATURE_DISABLED');
    if (transport?.kind !== 'ncc-professional-terms-v2-sdk-candidate' || typeof transport.rpc !== 'function') fail('RELEASE_TRANSPORT_REQUIRED');
    professionalTermsScope({backendOrigin, userId: readContext?.()?.userId, organizationId: readContext?.()?.organizationId});
    const next = readContext?.();
    if (!next || !uuid(next.userId) || !uuid(next.sessionId) || !uuid(next.organizationId) || next.active !== true) {
      clear(); fail('RELEASE_CONTEXT_REQUIRED');
    }
    if (context && !same(context, next)) { clear(); fail('STALE_CONTEXT'); }
    return {...next};
  }
  function ticket() { const next = gate(); return {epoch, context: next}; }
  function check(t) { const next = gate(); if (t.epoch !== epoch || !same(next, t.context)) fail('STALE_CONTEXT'); }
  function scope(t) { return {backendOrigin, userId: t.context.userId, organizationId: t.context.organizationId}; }
  async function rpc(name, args, t) {
    check(t); let response;
    try { response = await transport.rpc(name, clone(args)); } catch(error) {
      if(error.serverMessage==='NCC_LEGAL_BINDING_CHANGED') fail('LEGAL_BINDING_CHANGED');
      if(error.serverMessage==='NCC_LEGAL_BINDING_UNBOUND') fail('PROFESSIONAL_BINDING_UNBOUND');
      throw error;
    }
    check(t);
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
  return Object.freeze({kind: 'ncc-professional-terms-v2-release', open, snapshot, setSelection, accept, reconcile,
    invalidate: clear, close: clear, dispose() { disposed = true; clear(); }});
}
