import {webcrypto} from 'node:crypto';
import {professionalTermsScope} from '../pilot/professional-terms-journal.mjs';
export const IDS = Object.freeze({user: '11111111-1111-4111-8111-111111111111',
  session: '22222222-2222-4222-8222-222222222222', org: '33333333-3333-4333-8333-333333333333',
  request: '44444444-4444-4444-8444-444444444444', next: '55555555-5555-4555-8555-555555555555',
  terms: '66666666-6666-4666-8666-666666666666', privacy: '77777777-7777-4777-8777-777777777777'});
export const SCOPE = Object.freeze({backendOrigin: 'https://ncc.example.com', userId: IDS.user, organizationId: IDS.org});
export const record = (extra = {}) => ({...professionalTermsScope(SCOPE), claimId: webcrypto.randomUUID(),
  operation: 'acceptTerms', requestId: IDS.request, bindingSha256: 'a'.repeat(64),
  termsVersion: 'synthetic-terms-v2', privacyVersion: 'synthetic-privacy-v2',
  termsSha256: 'b'.repeat(64), privacySha256: 'c'.repeat(64), ...extra});

// Asynchronous serialized transactions; snapshot is taken when a transaction starts,
// not when it is enqueued. This is still a double, not real-browser crash/quota QA.
export function fakeIDB({durability = 'strict', blocked = false, schema = false} = {}) {
  const rows = new Map(); let chain = Promise.resolve(), opens = 0;
  const db = {objectStoreNames: {length: schema ? 2 : 1, contains: key => key === 'claims'},
    close() {}, createObjectStore() {}, transaction() {
      let release; const previous = chain; chain = new Promise(resolve => { release = resolve; });
      let local, done = false, pending = 0;
      const started = previous.then(() => { local = structuredClone(rows); });
      const finish = () => {
        if (done || pending || !local) return;
        done = true; rows.clear(); for (const [key, value] of local) rows.set(key, value);
        tx.oncomplete?.(); release();
      };
      const request = action => {
        const req = {}; pending++;
        started.then(() => queueMicrotask(() => {
          if (done) return;
          try { req.result = action(); req.onsuccess?.(); } catch { tx.abort(); }
          pending--; queueMicrotask(finish);
        }));
        return req;
      };
      const tx = {durability, objectStore() { return {keyPath: 'key', indexNames: [],
        get: key => request(() => structuredClone(local.get(key))),
        put: value => request(() => local.set(value.key, structuredClone(value)))}; },
        abort() { if (done) return; done = true; queueMicrotask(() => { tx.onabort?.(); release(); }); }};
      started.then(() => queueMicrotask(finish)); return tx;
    }};
  return {rows, get opens() { return opens; }, open() {
    opens++; const req = {result: db};
    queueMicrotask(() => {
      if (blocked) { req.onblocked?.(); return; }
      if (opens === 1) req.onupgradeneeded?.({oldVersion: 0}); req.onsuccess?.();
    }); return req;
  }};
}

export class Element {
  constructor(tag, ownerDocument) { Object.assign(this, {tag, ownerDocument, children: [], listeners: {}, attributes: {}, textContent: ''}); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  removeEventListener(name, fn) { if (this.listeners[name] === fn) delete this.listeners[name]; }
}
export function rootElement() { const doc = {createElement: tag => new Element(tag, doc)}; return new Element('main', doc); }
export const descendants = root => root.children.flatMap(child => [child, ...descendants(child)]);
export const textContent = root => [root.textContent, ...root.children.map(textContent)].join('\n');
export const button = (root, text) => descendants(root).find(node => node.tag === 'button' && node.textContent === text);
