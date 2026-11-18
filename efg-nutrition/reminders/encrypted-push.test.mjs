import test from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import webpush from 'web-push';
import ece from 'http_ece';

test('an encrypted Web Push decrypts to a reminder that opens Mi Día', async () => {
 const browserKey = createECDH('prime256v1');
 browserKey.generateKeys();
 const auth = randomBytes(16);
 const vapid = webpush.generateVAPIDKeys();
 const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  keys: { p256dh: browserKey.getPublicKey().toString('base64url'), auth: auth.toString('base64url') },
 };
 const payload = JSON.stringify({ kind: 'meal-reminder', meal: 'merienda', deliveryKey: '2026-11-18:merienda' });
 const request = webpush.generateRequestDetails(subscription, payload, {
  vapidDetails: { subject: 'mailto:qa@example.test', ...vapid }, TTL: 300,
 });
 assert.equal(request.headers['Content-Encoding'], 'aes128gcm');
 assert.match(request.headers.Authorization, /^vapid /);
 assert.ok(!request.body.includes(Buffer.from(payload)));

 const decrypted = ece.decrypt(request.body, { version: 'aes128gcm', privateKey: browserKey, authSecret: auth });
 const handlers = new Map();
 let shown, opened, pending;
 const self = {
  addEventListener: (type, handler) => handlers.set(type, handler),
  registration: {
   scope: 'https://test.example/pilot/',
   showNotification: async (_title, options) => { shown = options; },
  },
  clients: { openWindow: async url => { opened = url; } },
 };
 runInNewContext(readFileSync(new URL('../pilot/meal-reminder-worker.js', import.meta.url), 'utf8'), { self, URL });
 const waitUntil = promise => { pending = promise; };
 handlers.get('push')({ data: { json: () => JSON.parse(decrypted.toString('utf8')) }, waitUntil });
 await pending;
 assert.equal(shown.tag, 'ncc-meal-reminder-2026-11-18:merienda');
 assert.equal(opened, undefined);
 handlers.get('notificationclick')({ notification: { data: shown.data, close() {} }, waitUntil });
 await pending;
 assert.equal(opened, 'https://test.example/pilot/?reminderMeal=merienda');
});
