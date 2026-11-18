import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { runMealReminderJob } from './job.mjs';

function required(name) {
 const value = Deno.env.get(name);
 if (!value) throw new Error('Missing configuration: ' + name);
 return value;
}

const db = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
 auth: { autoRefreshToken: false, persistSession: false },
});
const secret = required('NCC_REMINDER_CRON_SECRET');
webpush.setVapidDetails(required('NCC_VAPID_SUBJECT'), required('NCC_VAPID_PUBLIC_KEY'), required('NCC_VAPID_PRIVATE_KEY'));

Deno.serve(async (request) => {
 if (request.method !== 'POST') return new Response(null, { status: 405 });
 if (request.headers.get('authorization') !== 'Bearer ' + secret)
  return new Response(null, { status: 401 });
 try {
  const result = await runMealReminderJob({
   db,
   send: ({ endpoint, p256dh, auth_key }, message) =>
    webpush.sendNotification({ endpoint, keys: { p256dh, auth: auth_key } }, JSON.stringify(message), {
     TTL: 300, timeout: 10000,
    }),
  });
  return Response.json(result);
 } catch {
  return Response.json({ error: 'Meal reminder job failed' }, { status: 500 });
 }
});
