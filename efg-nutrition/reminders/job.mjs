import { dispatchMealReminders } from './dispatch.mjs';

export async function runMealReminderJob({ db, send, now = new Date() }) {
 async function read(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
 }

 const preferences = await read(db.from('efg_meal_reminder_preferences')
  .select('user_id,meal,remind_at,time_zone').eq('enabled', true));
 const accounts = new Map();
 for (const row of preferences) {
  // A removed or invalid zone must not abort deliveries for other users.
  try { new Intl.DateTimeFormat('en', { timeZone: row.time_zone }); }
  catch { continue; }
  const id = JSON.stringify([row.user_id, row.time_zone]);
  if (!accounts.has(id)) accounts.set(id, {
   userId: row.user_id, timeZone: row.time_zone, preferences: [], devices: [],
  });
  accounts.get(id).preferences.push({
   meal: row.meal, enabled: true, at: row.remind_at.slice(0, 5),
  });
 }

 const devices = new Map();
 for (const account of accounts.values()) {
  if (!devices.has(account.userId)) {
   const rows = await read(db.from('efg_meal_reminder_devices')
    .select('endpoint,p256dh,auth_key').eq('user_id', account.userId));
   devices.set(account.userId, rows);
  }
  account.devices = devices.get(account.userId);
 }

 return dispatchMealReminders({
  now, accounts: accounts.values(),
  storage: {
   claimIfUnlogged: ({ userId, endpoint, date, meal }) =>
    read(db.rpc('efg_claim_meal_reminder', { p_user: userId, p_endpoint: endpoint, p_day: date, p_meal: meal })),
   removeDevice: ({ userId, endpoint }) =>
    read(db.from('efg_meal_reminder_devices').delete().eq('user_id', userId).eq('endpoint', endpoint)),
  },
  send,
 });
}
