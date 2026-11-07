export const PROFESSIONAL_TERMS_V2_SCOPE = 'professional_workspace_acceptance_v2';
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
export async function verifiedBundle(input, context, crypto) {
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
export function verifyResult(result, record, context) {
  if (!exact(result, ['contract_version', 'actor_id', 'organization_id', 'request_id', 'legal_ready', 'legal_binding_sha256']) ||
      result.contract_version !== 2 || result.actor_id !== context.userId || result.organization_id !== context.organizationId ||
      result.request_id !== record.requestId || result.legal_ready !== true || result.legal_binding_sha256 !== record.bindingSha256) fail('INVALID_LEGAL_RECEIPT');
}
export function verifyReceipt(receipt, record, context) {
  if (!exact(receipt, ['operation', 'payload', 'result']) || receipt.operation !== 'acceptTerms' ||
      !exact(receipt.payload, ['p_org', 'p_expected_binding_sha256']) || receipt.payload.p_org !== context.organizationId ||
      receipt.payload.p_expected_binding_sha256 !== record.bindingSha256) fail('INVALID_LEGAL_RECEIPT');
  verifyResult(receipt.result, record, context);
}
const same = (a, b) => a && b && ['userId', 'sessionId', 'organizationId'].every(key => a[key] === b[key]);
