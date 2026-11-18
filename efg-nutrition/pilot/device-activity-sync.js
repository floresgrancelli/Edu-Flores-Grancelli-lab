const localDay = new Intl.DateTimeFormat('en-CA', {
 timeZone:'America/Argentina/Buenos_Aires', year:'numeric', month:'2-digit', day:'2-digit',
});

export function activityDay(now = new Date()) {
 const parts = Object.fromEntries(localDay.formatToParts(now).map(({type,value})=>[type,value]));
 return [parts.year,parts.month,parts.day].join('-');
}

export function deviceActivityBridge(host = globalThis) {
 const ios = host.webkit?.messageHandlers?.nccActivity;
 if (ios) return {request:action=>ios.postMessage(action)};
 const android = host.nccActivity;
 if (!android) return null;
 return {request:action=>new Promise((resolve,reject)=>{
  const id = host.crypto.randomUUID();
  function finish(error,result) {
   host.clearTimeout(timer);
   android.removeEventListener('message',receive);
   if (error) reject(error);
   else resolve(result);
  }
  function receive(event) {
   try {
    const reply = JSON.parse(event.data);
    if (reply.id===id) finish(null,reply.result);
   } catch { /* Ignore unrelated messages. */ }
  }
  const timer = host.setTimeout(()=>finish(new Error('Device response timed out')),90000);
  android.addEventListener('message',receive);
  try { android.postMessage(JSON.stringify({id,action})); }
  catch (error) { finish(error); }
 })};
}

const statuses = {
 permission:'Falta autorizar el acceso a los datos de actividad.',
 no_data:'Sin datos de actividad para hoy.',
 no_data_or_permission:'Sin datos disponibles. Revisá el acceso en Apple Salud.',
 unavailable:'La fuente de actividad no está disponible en este dispositivo.',
 error:'No se pudo sincronizar la actividad. Volvé a intentar.',
};

export async function syncDeviceActivity({db,bridge,action,owner,day,isCurrent}) {
 const snapshot = await bridge.request(action);
 if (!isCurrent()) return null;
 if (Object.hasOwn(statuses,snapshot?.status)) return {message:statuses[snapshot.status]};
 const measured = new Date(snapshot?.measuredAt);
 const {steps,activeKcal,source} = snapshot ?? {};
 if (snapshot?.status!=='available' || !Number.isFinite(measured.getTime()) ||
  activityDay(measured)!==day || !['apple_health','health_connect'].includes(source) ||
  (steps!=null && (!Number.isSafeInteger(steps) || steps<0 || steps>2147483647)) ||
  (activeKcal!=null && (!Number.isFinite(activeKcal) || activeKcal<0 || activeKcal>=100000)) ||
  (steps==null && activeKcal==null)) return {message:statuses.no_data};
 const {data,error} = await db.rpc('efg_sync_device_activity',{
  p_expected_owner:owner,p_source:source,p_measured_at:measured.toISOString(),
  p_steps:steps??null,p_distance_m:null,p_active_kcal:activeKcal??null,
 });
 if (error) throw error;
 return isCurrent()?{data}:null;
}

export function mountDeviceActivity(section,{db,owner,isCurrent}) {
 if (!owner) return;
 const bridge = deviceActivityBridge();
 const button = section.querySelector('[data-atlas-connect]');
 const source = section.querySelector('[data-atlas-source]');
 const steps = section.querySelector('[data-atlas-steps]');
 const energy = section.querySelector('[data-atlas-energy]');
 const format = new Intl.NumberFormat('es-AR',{maximumFractionDigits:0});
 const consentKey = 'ncc-device-activity-consent:'+owner;
 let connected = false;
 try { connected = localStorage.getItem(consentKey)==='1'; } catch { /* Allow this tab only. */ }
 const active = ()=>section.isConnected&&isCurrent();
 let pending = false;
 let displayedDay;
 function show(data) {
  steps.textContent = data?.steps==null?'—':format.format(data.steps);
  energy.textContent = data?.active_kcal==null?'—':format.format(data.active_kcal)+' kcal';
  source.textContent = !data?'Sin datos sincronizados para hoy.':
   data.source==='apple_health'?'Apple Salud':'Health Connect';
 }
 async function refresh(ask = false) {
  if (!active() || pending) return;
  pending = true;
  button.disabled = true;
  const day = activityDay();
  if (displayedDay!==day) { displayedDay=day; show(null); }
  const current = ()=>active()&&activityDay()===day;
  try {
   const {data,error} = await db.from('efg_daily_device_activity')
    .select('steps,active_kcal,source').eq('user_id',owner).eq('activity_day',day).maybeSingle();
   if (error) throw error;
   if (!current()) return;
   show(data);
   if (!bridge || (!ask && !connected)) return;
   const result = await syncDeviceActivity({db,bridge,action:ask?'connect':'read',owner,day,isCurrent:current});
   if (!result || !current()) return;
   if (result.data) show(result.data);
   else {
    show(null);
    source.textContent = result.message;
   }
   if (ask) {
    connected = result.message!==statuses.permission && result.message!==statuses.unavailable && result.message!==statuses.error;
    if (connected) {
     try { localStorage.setItem(consentKey,'1'); } catch { /* Allow this tab only. */ }
    }
   }
  } catch {
   if (current()) source.textContent = statuses.error;
  } finally {
   pending = false;
   button.disabled = false;
  }
 }
 if (bridge) {
  button.hidden = false;
  button.addEventListener('click',()=>void refresh(true));
 }
 void refresh();
 const update = setInterval(()=>{
  if (!active()) { clearInterval(update); return; }
  if (!document.hidden || displayedDay!==activityDay()) void refresh();
 },60000);
}
