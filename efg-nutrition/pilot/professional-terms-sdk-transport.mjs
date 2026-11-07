import {createProfessionalReleaseAdapter} from './professional-release-adapter.mjs?v=ncc-dual-role-release-r3-20261107';

// SDK seam only. The proposed v2 backend is UNIMPLEMENTED; nothing mounts this transport.
export const PROFESSIONAL_TERMS_SDK_ENABLED = false;
const RPC = Object.freeze({bundle: 'ncc_pilot_workspace_legal_bundle_v2',
  accept: 'ncc_pilot_workspace_accept_terms_v2', receipt: 'ncc_pilot_workspace_receipt_v1'});
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const fail = code => { throw Object.assign(new Error(code), {code}); };
function origin(value) {
  if (typeof value !== 'string') fail('INVALID_BACKEND');
  let url; try { url = new URL(value); } catch { fail('INVALID_BACKEND'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      url.port || url.hostname === 'localhost' || url.hostname.endsWith('.invalid') || /^\[|^[\d.]+$/.test(url.hostname)) fail('INVALID_BACKEND');
  return url.origin;
}
const WIRE = new Map([
  ['55000', new Set(['NCC_LEGAL_BINDING_UNBOUND'])],
  ['22023', new Set(['NCC_LEGAL_BINDING_CHANGED', 'NCC_LEGAL_REQUEST_INVALID', 'Idempotency conflict'])],
  ['55P03', new Set(['NCC_LEGAL_BINDING_BUSY'])]
]);
function sdkFailure(error) {
  const code = typeof error?.code === 'string' && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code) ? error.code : 'SDK_REJECTED';
  const serverMessage = WIRE.get(code)?.has(error.message) ? error.message : null;
  throw Object.assign(new Error(serverMessage || code), {code, serverMessage});
}
const same = (a, b) => a && b && a.userId === b.userId && a.sessionId === b.sessionId;
function resultMatches(result, scope, requestId, binding) {
  return exact(result, ['contract_version', 'actor_id', 'organization_id', 'request_id', 'legal_ready', 'legal_binding_sha256']) &&
    result.contract_version === 2 && result.actor_id === scope.userId && result.organization_id === scope.organizationId &&
    result.request_id === requestId && result.legal_ready === true && hash(result.legal_binding_sha256) &&
    (!binding || result.legal_binding_sha256 === binding);
}

export function createProfessionalTermsSdkTransport({sdk, config, enabled = PROFESSIONAL_TERMS_SDK_ENABLED} = {}) {
  const backendOrigin = enabled === true ? config?.backendOrigin : undefined;
  const explicit = enabled === true ? config?.explicitReleaseConfiguration : undefined;
  let reader = null, selected = null, navigation = 0, disposed = false, subscription = null;
  // Instance-local defense only. A future caller MUST reserve the durable journal before rpc().
  const attempted = new Map(), uncertainLanes = new Set();
  function gate() {
    if (disposed) fail('DISPOSED');
    if (enabled !== true || explicit !== true) fail('FEATURE_DISABLED');
    const expected = origin(backendOrigin);
    if (origin(sdk?.supabaseUrl) !== expected) fail('BACKEND_MISMATCH');
    if (typeof sdk?.auth?.onAuthStateChange !== 'function') fail('AUTH_OBSERVER_REQUIRED');
    subscription ||= sdk.auth.onAuthStateChange(event => {
      if (event !== 'INITIAL_SESSION') { selected = null; navigation++; reader?.invalidate(); }
    });
    return expected;
  }
  function check(ticket) { gate(); if (ticket !== navigation) fail('STALE_CONTEXT'); }
  async function authorize(ticket, organizationId, expected = null) {
    gate();
    // Bootstrap is read-only. An explicit inert journal avoids its default IndexedDB getter.
    reader ||= createProfessionalReleaseAdapter({sdk, enabled: true, journal: Object.freeze({}),
      config: {backendOrigin, explicitReleaseConfiguration: explicit}});
    const state = await reader.bootstrap(); check(ticket);
    if (expected && !same(state.who, expected)) fail('STALE_AUTH');
    const own = state.contexts.coach_contexts.filter(context => context.id === organizationId && context.coach_id === state.who.userId);
    if (own.length !== 1 || !['trial', 'active'].includes(own[0].status) ||
        state.contexts.student_context?.organization_id === organizationId) fail('DENIED');
    // legal_ready is deliberately not authority here: this seam prepares acceptance itself,
    // never clinical reads, invitations or an elevation of the user's personal role.
    return {...state.who, organizationId};
  }
  async function selectOrganization(organizationId) {
    gate(); selected = null; const ticket = ++navigation;
    if (!uuid(organizationId)) fail('INVALID_WORKSPACE');
    const scope = await authorize(ticket, organizationId); check(ticket);
    selected = scope; return structuredClone(scope);
  }
  function validateArgs(name, args, scope) {
    const keys = name === RPC.bundle ? ['p_org'] : name === RPC.accept
      ? ['p_org', 'p_expected_binding_sha256', 'p_request_id'] : name === RPC.receipt ? ['p_request_id'] : null;
    if (!keys) fail('RPC_NOT_ALLOWED');
    if (!exact(args, keys) || keys.includes('p_org') && (!uuid(args.p_org) || args.p_org !== scope.organizationId) ||
        keys.includes('p_request_id') && !uuid(args.p_request_id) ||
        name === RPC.accept && !hash(args.p_expected_binding_sha256)) fail('INVALID_LEGAL_ARGS');
  }
  function validateAttribution(name, data, args, scope) {
    if (name === RPC.bundle) {
      if (!exact(data, ['contract_version', 'actor_id', 'organization_id', 'scope', 'binding_sha256', 'documents']) ||
          data.contract_version !== 2 || data.actor_id !== scope.userId || data.organization_id !== scope.organizationId ||
          data.scope !== 'professional_workspace_acceptance_v2' || !hash(data.binding_sha256) ||
          !Array.isArray(data.documents) || data.documents.length !== 2) fail('INVALID_LEGAL_BUNDLE');
      // Full document/body/canon verification belongs to the future durable flow before display.
    } else if (name === RPC.accept) {
      if (!resultMatches(data, scope, args.p_request_id, args.p_expected_binding_sha256)) fail('INVALID_LEGAL_RESULT');
    } else if (data !== null) {
      if (!exact(data, ['operation', 'payload', 'result']) || data.operation !== 'acceptTerms' ||
          !exact(data.payload, ['p_org', 'p_expected_binding_sha256']) || data.payload.p_org !== scope.organizationId ||
          !hash(data.payload.p_expected_binding_sha256) ||
          !resultMatches(data.result, scope, args.p_request_id, data.payload.p_expected_binding_sha256)) fail('INVALID_LEGAL_RECEIPT');
      const prior = attempted.get(args.p_request_id);
      if (prior && (prior.organizationId !== scope.organizationId || prior.userId !== scope.userId ||
          prior.binding !== data.payload.p_expected_binding_sha256)) fail('INVALID_LEGAL_RECEIPT');
    }
  }
  async function rpc(name, input) {
    let dispatched = false;
    try {
      const backend = gate(), scope = selected && {...selected}, ticket = navigation;
      if (!scope) fail('WORKSPACE_REQUIRED');
      const args = structuredClone(input); validateArgs(name, args, scope);
      const lane = JSON.stringify([backend, scope.userId, scope.organizationId]);
      if (name === RPC.accept && (attempted.has(args.p_request_id) || uncertainLanes.has(lane))) fail('ACCEPTANCE_ALREADY_ATTEMPTED');
      await authorize(ticket, scope.organizationId, scope); check(ticket);
      if (name === RPC.accept) {
        // Recheck after asynchronous authorization to cover two concurrent calls.
        if (attempted.has(args.p_request_id) || uncertainLanes.has(lane)) fail('ACCEPTANCE_ALREADY_ATTEMPTED');
        attempted.set(args.p_request_id, {userId: scope.userId, organizationId: scope.organizationId, binding: args.p_expected_binding_sha256});
        uncertainLanes.add(lane); dispatched = true;
      }
      const response = await sdk.rpc(name, args); check(ticket);
      if (!response || response.error) sdkFailure(response?.error);
      const data = structuredClone(response.data); validateAttribution(name, data, args, scope);
      await authorize(ticket, scope.organizationId, scope); check(ticket);
      if (name === RPC.accept) uncertainLanes.delete(lane);
      return {data, error: null};
    } catch (error) {
      throw Object.assign(new Error(error.serverMessage || error.code || 'LEGAL_TRANSPORT_FAILED'), {code: error.code || 'LEGAL_TRANSPORT_FAILED',
        serverMessage: error.serverMessage || null,
        outcome: dispatched || name === RPC.receipt || error.code === 'ACCEPTANCE_ALREADY_ATTEMPTED' ? 'uncertain' : 'not_applied'});
    }
  }
  return Object.freeze({kind: 'ncc-professional-terms-v2-sdk-candidate', selectOrganization, rpc,
    currentContext() { gate(); return selected ? {...selected, active:true} : null; },
    invalidate() { selected = null; navigation++; reader?.invalidate(); },
    dispose() { if (disposed) return; disposed = true; selected = null; navigation++; reader?.dispose(); subscription?.data?.subscription?.unsubscribe?.(); }});
}
