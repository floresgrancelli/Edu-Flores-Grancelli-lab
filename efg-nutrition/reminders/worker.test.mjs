import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function workerFixture() {
 const handlers = new Map(), notifications = [], windows = [];
 const self = {
  addEventListener: (name, handler) => handlers.set(name, handler),
  registration: {
   scope: 'https://test.example/pilot/',
   showNotification: async (title, options) => { notifications.push({ title, ...options }); },
  },
  clients: { openWindow: async url => { windows.push(url); } },
 };
 runInNewContext(readFileSync(new URL('../pilot/meal-reminder-worker.js', import.meta.url), 'utf8'), { self, URL });
 return { handlers, notifications, windows };
}

test('a reminder shows a generic notice and opens the correct meal on explicit click', async () => {
 const {handlers, notifications, windows} = workerFixture();
 let pending;
 const waitUntil = promise => { pending = promise; };
 handlers.get('push')({
  data: { json: () => ({ kind: 'meal-reminder', meal: 'media_tarde', deliveryKey: '2026-11-18:media_tarde', habitual: 'fixture-id' }) },
  waitUntil,
 });
 await pending;
 assert.equal(notifications.length, 1);
 assert.equal(notifications[0].body, '¿Ya comiste? Registralo en Mi Día.');
 assert.equal(windows.length, 0);
 let closed = false;
 handlers.get('notificationclick')({ notification: { data: notifications[0].data, close: () => { closed = true; } }, waitUntil });
 await pending;
 assert.ok(closed);
 assert.deepEqual(windows, ['https://test.example/pilot/?reminderMeal=media_tarde&habitual=fixture-id']);
});

test('malformed or unrelated push messages show no meal reminder', () => {
 const { handlers, notifications } = workerFixture();
 handlers.get('push')({ data: { json() { throw Error('invalid'); } }, waitUntil: assert.fail });
 handlers.get('push')({ data: { json: () => ({ kind: 'unrelated' }) }, waitUntil: assert.fail });
 assert.equal(notifications.length, 0);
});
