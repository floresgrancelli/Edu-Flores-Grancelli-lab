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
const subject = 'https://efg-nutrition.onrender.com';

Deno.serve(async (request) => {
 if (request.method !== 'POST') return new Response(null, { status: 405 });
 const authorization=request.headers.get('authorization')??'';
 if(!/^Bearer [a-f0-9]{64}$/.test(authorization))return new Response(null,{status:401});
 try {
  const {data: config,error}=await db.rpc('efg_meal_reminder_config');
  if(error||!config)throw Error('Reminder configuration unavailable');
  if(authorization!=='Bearer '+config.ncc_reminder_job_secret)return new Response(null,{status:401});
  webpush.setVapidDetails(subject,config.ncc_reminder_vapid_public,config.ncc_reminder_vapid_private);
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
