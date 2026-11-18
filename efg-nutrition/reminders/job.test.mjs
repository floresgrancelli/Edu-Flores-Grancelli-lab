import test from 'node:test';
import assert from 'node:assert/strict';
import { runMealReminderJob } from './job.mjs';

test('uses persisted local time, checks the diary, and claims each delivery once', async () => {
 const endpoint = 'https://fcm.googleapis.com/fcm/send/test';
 const notifications = [];
 const claims = new Set();
 let logged = true;
 const db = {
  from(table) {
   return { select: () => ({ eq: async () => ({ data: table.endsWith('preferences')
    ? [{ user_id: 'test-a', time_zone: 'America/Argentina/Buenos_Aires', meal: 'cena', remind_at: '21:00:00' }]
    : [{ endpoint, p256dh: 'test-key', auth_key: 'test-auth' }] }) }) };
  },
  async rpc(name, args) {
   assert.equal(name, 'efg_claim_meal_reminder');
   assert.deepEqual(args, { p_user: 'test-a', p_endpoint: endpoint, p_day: '2026-11-18', p_meal: 'cena' });
   const key = JSON.stringify(args);
   if (logged || claims.has(key)) return { data: false };
   claims.add(key);
   return { data: true };
  },
 };
 const input = { db, now: new Date('2026-11-19T00:00:00Z'), send: async (_, message) => { notifications.push(message); } };
 assert.equal((await runMealReminderJob(input)).skipped, 1);
 logged = false;
 assert.equal((await runMealReminderJob(input)).sent, 1);
 assert.equal((await runMealReminderJob(input)).skipped, 1);
 assert.deepEqual(notifications, [{ kind: 'meal-reminder', meal: 'cena', deliveryKey: '2026-11-18:cena' }]);
});
