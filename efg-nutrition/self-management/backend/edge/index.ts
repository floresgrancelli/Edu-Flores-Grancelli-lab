import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {createHostedSelfHandler} from '../hosted-adapter.mjs';
import catalog from '../../../catalog/guide-catalog.json' with {type:'json'};
const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!key)throw new Error('Missing server configuration');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const handler=createHostedSelfHandler({client,catalog,allowedOrigins:['https://efg-nutrition.onrender.com']});
Deno.serve(handler);
