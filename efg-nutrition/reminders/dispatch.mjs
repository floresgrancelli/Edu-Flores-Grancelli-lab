import { dueMealReminders } from './meal-reminder-schedule.mjs';

const pushHosts = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']);

function supportedEndpoint(endpoint) {
 try {
  const url = new URL(endpoint);
  return url.protocol === 'https:' && pushHosts.has(url.hostname) &&
   !url.port && !url.username && !url.password && !url.hash;
 } catch {
  return false;
 }
}

// The sender must use the supplied subscription URL with redirects disabled.
// Storage must claim atomically per account, device, local date and meal.
export async function dispatchMealReminders({ now, accounts, storage, send }) {
 const result = { sent: 0, skipped: 0, failed: 0 };
 for (const { userId, timeZone, preferences, devices } of accounts) {
  const due = dueMealReminders({ now, timeZone, preferences, loggedMeals: {} });
  for (const { date, meal, deliveryKey } of due) {
   for (const device of devices) {
    if (!supportedEndpoint(device.endpoint) ||
        !(await storage.claimIfUnlogged({ userId, endpoint: device.endpoint, date, meal }))) {
     result.skipped++;
     continue;
    }
    try {
     await send(device, { kind: 'meal-reminder', meal, deliveryKey });
     result.sent++;
    } catch (error) {
     result.failed++;
     if (error?.statusCode === 404 || error?.statusCode === 410) {
      await storage.removeDevice({ userId, endpoint: device.endpoint });
     }
    }
   }
  }
 }
 return result;
}
