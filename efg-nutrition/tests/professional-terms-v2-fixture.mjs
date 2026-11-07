import {createHash, webcrypto} from 'node:crypto';
import {IDS, fakeIDB} from './professional-terms-test-support.mjs';
import {PROFESSIONAL_TERMS_FIXTURE_ORIGIN, createProfessionalTermsJournal} from '../pilot/professional-terms-journal.mjs';
import {createProfessionalTermsFixtureFlow, PROFESSIONAL_TERMS_V2_RPC, PROFESSIONAL_TERMS_V2_SCOPE} from '../pilot/professional-terms-fixture-flow.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
export function fixtureBinding(bundle) {
  const t = bundle.documents.find(d => d.kind === 'terms'), p = bundle.documents.find(d => d.kind === 'privacy');
  const values = [bundle.actor_id.toLowerCase(), bundle.organization_id.toLowerCase(), bundle.scope,
    t.document_id.toLowerCase(), t.version, t.sha256.toLowerCase(), p.document_id.toLowerCase(), p.version, p.sha256.toLowerCase()];
  return sha(Buffer.concat([Buffer.from('NCC-PROFESSIONAL-LEGAL-BUNDLE-V2\n'), ...values.flatMap(value =>
    [Buffer.from(`${Buffer.byteLength(value, 'utf8')}:`), Buffer.from(value, 'utf8')])]));
}
export function createTermsFixture({database = fakeIDB()} = {}) {
  const document = kind => ({kind, document_id: IDS[kind], version: `synthetic-${kind}-v2`,
    body: `TEXTO FICTICIO ${kind}. Prueba técnica de bytes: <img src=x> ñ 🧪. Sin validez legal.\r\n`,
    published_at: '2026-11-07T00:00:00.000Z', is_current: true, url: null});
  const state = {calls: [], writes: 0, receipts: new Map(), loss: false, unbound: false,
    context: {userId: IDS.user, sessionId: IDS.session, organizationId: IDS.org, active: true, isTest: true},
    bundle: {contract_version: 2, actor_id: IDS.user, organization_id: IDS.org, scope: PROFESSIONAL_TERMS_V2_SCOPE,
      binding_sha256: '', documents: [document('terms'), document('privacy')]}};
  function rehash() {
    for (const doc of state.bundle.documents) doc.sha256 = sha(doc.body);
    state.bundle.binding_sha256 = fixtureBinding(state.bundle);
  }
  rehash();
  const error = (code, message) => ({error: {code, message}, data: null});
  const transport = {kind: 'ncc-professional-terms-v2-fixture', backendOrigin: PROFESSIONAL_TERMS_FIXTURE_ORIGIN,
    async rpc(name, args) {
      state.calls.push({name, args: structuredClone(args)});
      if (state.onCall) await state.onCall(name, args);
      if (state.context.userId !== IDS.user || state.context.organizationId !== IDS.org || state.context.active !== true || !state.context.isTest) return error('42501', 'DENIED');
      if (name === PROFESSIONAL_TERMS_V2_RPC.receipt) return {data: structuredClone(state.receipts.get(args.p_request_id) ?? null)};
      if (args.p_org !== IDS.org) return error('42501', 'DENIED');
      if (state.unbound) return error('55000', 'NCC_LEGAL_BINDING_UNBOUND');
      if (name === PROFESSIONAL_TERMS_V2_RPC.bundle) return {data: structuredClone(state.bundle)};
      if (name !== PROFESSIONAL_TERMS_V2_RPC.accept) throw Error('Unexpected RPC');
      if (state.beforeAccept) await state.beforeAccept(args);
      if (state.unbound) return error('55000', 'NCC_LEGAL_BINDING_UNBOUND');
      // Fixture model of the proposed serialized transaction, not PostgreSQL concurrency proof.
      if (args.p_expected_binding_sha256 !== state.bundle.binding_sha256) return error('22023', 'NCC_LEGAL_BINDING_CHANGED');
      const payload = {p_org: args.p_org, p_expected_binding_sha256: args.p_expected_binding_sha256};
      const prior = state.receipts.get(args.p_request_id);
      if (prior) {
        if (JSON.stringify(prior.payload) !== JSON.stringify(payload)) return error('22023', 'REQUEST_ID_CONFLICT');
        return {data: structuredClone(prior.result)};
      }
      state.writes++;
      const result = {contract_version: 2, actor_id: IDS.user, organization_id: IDS.org, request_id: args.p_request_id,
        legal_ready: true, legal_binding_sha256: args.p_expected_binding_sha256};
      state.receipts.set(args.p_request_id, {operation: 'acceptTerms', payload, result});
      if (state.loss) throw Error('Fictitious lost response after commit');
      return {data: structuredClone(result)};
    }};
  const options = () => ({enabled: true, fixtureEnvironment: () => true, transport, readContext: () => ({...state.context}),
    journal: createProfessionalTermsJournal(database), crypto: webcrypto});
  return {state, database, transport, rehash, options, make: () => createProfessionalTermsFixtureFlow(options())};
}
