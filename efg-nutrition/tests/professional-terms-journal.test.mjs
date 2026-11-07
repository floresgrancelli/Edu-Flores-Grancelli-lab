import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfessionalTermsJournal, professionalTermsScope} from '../pilot/professional-terms-journal.mjs';
import {fakeIDB, record, SCOPE, IDS} from './professional-terms-test-support.mjs';

test('reserve survives reload and changed request/binding cannot resend uncertain lane', async () => {
  const db = fakeIDB(), first = createProfessionalTermsJournal(db), r = record();
  assert.equal(await first.reserve(r), true);
  const reopened = createProfessionalTermsJournal(db);
  assert.deepEqual(await reopened.get(SCOPE), {...r, state: 'uncertain'});
  assert.equal(await reopened.reserve(record({requestId: IDS.next, bindingSha256: 'd'.repeat(64)})), false);
});
test('two concurrent journal instances produce exactly one durable claim', async () => {
  const db = fakeIDB();
  const results = await Promise.all([createProfessionalTermsJournal(db).reserve(record()),
    createProfessionalTermsJournal(db).reserve(record({requestId: IDS.next}))]);
  assert.deepEqual(results.sort(), [false, true]); assert.equal(db.rows.size, 2);
});
test('same confirmed binding is not resubmitted and permanent UUID ledger prevents reuse', async () => {
  const j = createProfessionalTermsJournal(fakeIDB()), a = record();
  await j.reserve(a); assert.equal(await j.settle(a), true);
  assert.equal(await j.reserve(record({requestId: IDS.next})), false);
  const b = record({requestId: IDS.next, bindingSha256: 'd'.repeat(64)});
  assert.equal(await j.reserve(b), true); assert.equal(await j.settle(b), true);
  assert.equal(await j.reserve(record({bindingSha256: 'e'.repeat(64)})), false);
});
test('settlement compares full claim, not digest alone; input mutation cannot change claim', async () => {
  const j = createProfessionalTermsJournal(fakeIDB()), a = record(), expected = structuredClone(a);
  const reserved = j.reserve(a); a.requestId = IDS.next; await reserved;
  assert.equal(await j.settle(a), false);
  assert.equal(await j.settle({...expected, privacyVersion: 'other'}), false);
  assert.equal((await j.get(SCOPE)).state, 'uncertain'); assert.equal(await j.settle(expected), true);
});
test('metadata schema rejects body, token, session and malformed scopes before opening storage', () => {
  const db = fakeIDB(), j = createProfessionalTermsJournal(db);
  for (const key of ['body', 'token', 'sessionId', 'accepted']) assert.throws(() => j.reserve({...record(), [key]: 'private'}), /INVALID_TERMS_JOURNAL_RECORD/);
  assert.throws(() => j.reserve(record({namespace: 'arbitrary'})), /INVALID_TERMS_JOURNAL_RECORD/);
  assert.throws(() => professionalTermsScope({...SCOPE, backendOrigin: 'https://ncc.example.com/path'}), /INVALID_TERMS_SCOPE/);
  assert.equal(db.opens, 0);
});
test('missing storage, blocked storage, weaker durability and bad schema fail closed', async () => {
  await assert.rejects(createProfessionalTermsJournal(null).reserve(record()), /DURABLE_STORAGE_REQUIRED/);
  await assert.rejects(createProfessionalTermsJournal(fakeIDB({blocked: true})).reserve(record()), /TERMS_JOURNAL_BLOCKED/);
  await assert.rejects(createProfessionalTermsJournal(fakeIDB({durability: 'relaxed'})).reserve(record()), /TERMS_JOURNAL_SCHEMA_OR_DURABILITY/);
  await assert.rejects(createProfessionalTermsJournal(fakeIDB({schema: true})).reserve(record()), /TERMS_JOURNAL_SCHEMA/);
});
test('missing, extra-field or different-claim ledger never proves a confirmed operation', async () => {
  for (const mode of ['missing', 'extra', 'wrong']) {
    const db = fakeIDB(), j = createProfessionalTermsJournal(db), r = record(); await j.reserve(r);
    const key = [...db.rows.keys()].find(key => key !== r.key), saved = db.rows.get(key);
    if (mode === 'missing') db.rows.delete(key);
    else db.rows.set(key, mode === 'extra' ? {...saved, body: 'forbidden'} : {...saved, requestId: IDS.next});
    await assert.rejects(j.get(SCOPE), /TERMS_JOURNAL_FAILED/);
    await assert.rejects(j.settle(r), /TERMS_JOURNAL_FAILED/);
    assert.equal(db.rows.get(r.key).state, 'uncertain');
  }
});
test('a confirmed lane with a missing ledger cannot be replaced by a new binding', async () => {
  const db = fakeIDB(), j = createProfessionalTermsJournal(db), r = record(); await j.reserve(r); await j.settle(r);
  db.rows.delete([...db.rows.keys()].find(key => key !== r.key));
  await assert.rejects(j.reserve(record({requestId: IDS.next, bindingSha256: 'd'.repeat(64)})), /TERMS_JOURNAL_FAILED/);
  assert.equal(db.rows.get(r.key).requestId, r.requestId);
});
