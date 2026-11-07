// Candidate-only durable metadata. No legal text, tokens, session IDs, or mutation retry API.
const FIELDS = ['claimId', 'key', 'namespace', 'operation', 'requestId', 'bindingSha256',
  'termsVersion', 'privacyVersion', 'termsSha256', 'privacySha256'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const version = value => typeof value === 'string' && value.length > 0 && new TextEncoder().encode(value).length <= 1024;
const fail = code => { throw Object.assign(new Error(code), {code}); };
export const PROFESSIONAL_TERMS_FIXTURE_ORIGIN = 'https://ncc-professional-terms-fixture.invalid';

export function professionalTermsScope({backendOrigin, userId, organizationId} = {}) {
  let url;
  try { url = new URL(backendOrigin); } catch { fail('INVALID_TERMS_SCOPE'); }
  if (url.origin !== backendOrigin || url.protocol !== 'https:' || url.username || url.password ||
      url.port || url.hostname === 'localhost' || url.hostname.endsWith('.invalid') && backendOrigin !== PROFESSIONAL_TERMS_FIXTURE_ORIGIN ||
      /^\[|^[\d.]+$/.test(url.hostname) || !uuid(userId) || !uuid(organizationId)) fail('INVALID_TERMS_SCOPE');
  const namespace = JSON.stringify([backendOrigin, userId, organizationId]);
  return Object.freeze({namespace, key: JSON.stringify([namespace, 'acceptTerms'])});
}

function validScope(record) {
  try {
    const parts = JSON.parse(record.namespace);
    if (!Array.isArray(parts) || parts.length !== 3) return false;
    const scope = professionalTermsScope({backendOrigin: parts[0], userId: parts[1], organizationId: parts[2]});
    return scope.namespace === record.namespace;
  } catch { return false; }
}
const ledgerKey = record => JSON.stringify([record.namespace, 'request', record.requestId]);
const laneKey = record => JSON.stringify([record.namespace, 'acceptTerms']);
function valid(record, stored = false, ledger = false) {
  return !!record && typeof record === 'object' && !Array.isArray(record) &&
    Object.keys(record).length === FIELDS.length + (stored ? 1 : 0) &&
    Object.keys(record).every(key => FIELDS.includes(key) || stored && key === 'state') &&
    FIELDS.every(key => typeof record[key] === 'string') && uuid(record.claimId) && uuid(record.requestId) &&
    record.operation === 'acceptTerms' && validScope(record) &&
    record.key === (ledger ? ledgerKey(record) : laneKey(record)) &&
    [record.bindingSha256, record.termsSha256, record.privacySha256].every(hash) &&
    [record.termsVersion, record.privacyVersion].every(version) &&
    (!stored || ['uncertain', 'confirmed'].includes(record.state));
}
export function validateProfessionalTermsRecord(record) {
  if (!valid(record, true)) fail('INVALID_TERMS_JOURNAL_RECORD');
  return structuredClone(record);
}

export function createProfessionalTermsJournal(indexedDB = globalThis.indexedDB) {
  let opening;
  function open() {
    if (!indexedDB) return Promise.reject(new Error('DURABLE_STORAGE_REQUIRED'));
    return opening ||= new Promise((resolve, reject) => {
      let rejected = false;
      const deny = code => { rejected = true; reject(new Error(code)); };
      const request = indexedDB.open('ncc-professional-terms-journal-v1', 1);
      request.onupgradeneeded = event => {
        if (event.oldVersion !== 0) { request.transaction.abort(); return; }
        request.result.createObjectStore('claims', {keyPath: 'key'});
      };
      request.onerror = () => deny('TERMS_JOURNAL_UNAVAILABLE');
      request.onblocked = () => deny('TERMS_JOURNAL_BLOCKED');
      request.onsuccess = () => {
        const db = request.result;
        if (rejected) { db.close(); return; }
        if (db.objectStoreNames.length !== 1 || !db.objectStoreNames.contains('claims')) {
          db.close(); deny('TERMS_JOURNAL_SCHEMA'); return;
        }
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }
  async function transaction(work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('claims', 'readwrite', {durability: 'strict'});
      const store = tx.objectStore('claims');
      let value;
      if (tx.durability !== 'strict' || store.keyPath !== 'key' || store.indexNames.length !== 0) {
        tx.abort(); reject(new Error('TERMS_JOURNAL_SCHEMA_OR_DURABILITY')); return;
      }
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(new Error('TERMS_JOURNAL_FAILED'));
      try { work(store, result => { value = result; }, () => tx.abort()); } catch { tx.abort(); }
    });
  }
  function exactClaim(actual, expected, ledger = false) {
    return valid(actual, true, ledger) && FIELDS.every(key =>
      actual[key] === (ledger && key === 'key' ? ledgerKey(expected) : expected[key]));
  }
  return Object.freeze({
    reserve(input) {
      if (!valid(input)) fail('INVALID_TERMS_JOURNAL_RECORD');
      const record = structuredClone(input);
      return transaction((store, done, abort) => {
        const lane = store.get(record.key);
        lane.onsuccess = () => {
          const prior = lane.result;
          if (prior && (!valid(prior, true) || prior.namespace !== record.namespace)) return abort();
          // Neither an uncertain operation nor an already confirmed binding can be sent again.
          if (prior && (prior.state === 'uncertain' || prior.bindingSha256 === record.bindingSha256)) return done(false);
          const reserveNew = () => {
            const ledger = store.get(ledgerKey(record));
            ledger.onsuccess = () => {
              if (ledger.result) return done(false);
              store.put({...record, state: 'uncertain'});
              store.put({...record, key: ledgerKey(record), state: 'uncertain'});
              done(true);
            };
          };
          if (!prior) return reserveNew();
          const priorLedger = store.get(ledgerKey(prior));
          priorLedger.onsuccess = () => {
            if (!exactClaim(priorLedger.result, prior, true) || priorLedger.result.state !== prior.state) return abort();
            reserveNew();
          };
        };
      });
    },
    get(scope) {
      const checked = professionalTermsScope(scope);
      return transaction((store, done, abort) => {
        const lane = store.get(checked.key);
        lane.onsuccess = () => {
          const record = lane.result;
          if (!record) return done(null);
          if (!valid(record, true) || record.key !== checked.key || record.namespace !== checked.namespace) return abort();
          const ledger = store.get(ledgerKey(record));
          ledger.onsuccess = () => {
            if (!exactClaim(ledger.result, record, true) || ledger.result.state !== record.state) return abort();
            done(structuredClone(record));
          };
        };
      });
    },
    settle(input) {
      if (!valid(input) && !valid(input, true)) fail('INVALID_TERMS_JOURNAL_RECORD');
      const expected = structuredClone(input);
      return transaction((store, done, abort) => {
        const lane = store.get(expected.key);
        lane.onsuccess = () => {
          if (!lane.result || !valid(lane.result, true)) return abort();
          if (!exactClaim(lane.result, expected)) return done(false);
          const ledger = store.get(ledgerKey(expected));
          ledger.onsuccess = () => {
            if (!exactClaim(ledger.result, expected, true) || ledger.result.state !== lane.result.state) return abort();
            store.put({...lane.result, state: 'confirmed'});
            store.put({...ledger.result, state: 'confirmed'});
            done(true);
          };
        };
      });
    }
  });
}
