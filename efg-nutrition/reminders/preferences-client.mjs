// This adapter is only called after the user opts in from Settings.
export async function subscribeMealReminderDevice(registration, applicationServerKey) {
 const current = await registration.pushManager.getSubscription();
 const subscription = current ?? await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey,
 });
 const { endpoint, keys } = subscription.toJSON();
 if (!endpoint || !keys?.p256dh || !keys?.auth) {
  throw new Error('El navegador no devolvió una suscripción completa.');
 }
 return { endpoint, p256dh: keys.p256dh, auth_key: keys.auth };
}

export function createMealReminderPreferencesClient(supabase) {
 const preferences = () => supabase.from('efg_meal_reminder_preferences');
 const devices = () => supabase.from('efg_meal_reminder_devices');
 async function checked(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
 }
 return {
  list: () => checked(preferences().select('meal,remind_at,time_zone,enabled')),
  save: ({ meal, remindAt, timeZone, enabled }) => checked(preferences().upsert({
   meal, remind_at: remindAt, time_zone: timeZone, enabled,
  }, { onConflict: 'user_id,meal' })),
  addDevice: device => checked(devices().upsert(device, { onConflict: 'user_id,endpoint' })),
  removeDevice: endpoint => checked(devices().delete().eq('endpoint', endpoint)),
 };
}
