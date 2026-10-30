// COACH120/UX35: signed, once-only major release. Synthetic JWT transport;
// NO user logout, legal signing or production activation in this test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAJOR_RELEASE_FLOW_ENABLED,readMajorRelease,acknowledgeMajorRelease} from '../pilot/major-release-client.js';
import {RELEASE_COMMUNICATIONS_ENABLED,renderMajorReleaseAnnouncement,renderWhatsNew}
 from '../pilot/release-communications.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const profile={user_id:uid,role:'student',active:true};
const base={id:'major_2026_01',version:'2026.11.1',
 title:'Relanzamiento Nutrición Con-Ciencia',phase:'preview',
 roles:['student','coach','admin','personal'],
 highlights:['Plan alimentario con coach','Ficha con permisos específicos','Nuevas herramientas']};
let payload=base,calls=[];
const sb={auth:{getUser:async()=>({data:{user:{id:uid}},error:null})},
 rpc:async(name,args)=>{calls.push([name,args]);return {
  data:name==='efg_major_release_status'?structuredClone(payload):true,error:null
 }}};
assert.equal(MAJOR_RELEASE_FLOW_ENABLED,false);
assert.equal(RELEASE_COMMUNICATIONS_ENABLED,false);
assert.equal((await readMajorRelease(sb,{profile})).phase,'none');
assert.equal(calls.length,0,'Flag OFF must make zero server calls');
let state=await readMajorRelease(sb,{profile,explicitlyEnabled:true});
assert.equal(state.phase,'preview');
assert.match(renderMajorReleaseAnnouncement(state,'student'),/Entendido<\/button>/);
assert.doesNotMatch(renderMajorReleaseAnnouncement(state,'student'),/ackReleaseAndSignOut/);
await assert.rejects(acknowledgeMajorRelease(sb,{profile,release:state,
 kind:'announcement_preview_read',explicitClick:false,explicitlyEnabled:true}),
 /aviso aprobado/);
assert.equal(await acknowledgeMajorRelease(sb,{profile,release:state,
 kind:'announcement_preview_read',explicitClick:true,explicitlyEnabled:true}),true);
assert.deepEqual(calls.at(-1),['efg_major_release_ack',{
 p_release:'major_2026_01',p_event_kind:'announcement_preview_read',p_explicit_click:true
}]);
payload={...base,phase:'reauth_required'};
state=await readMajorRelease(sb,{profile,explicitlyEnabled:true});
assert.match(renderMajorReleaseAnnouncement(state,'student'),/Entendido, cerrar sesión/);
await assert.rejects(acknowledgeMajorRelease(sb,{profile,release:state,
 kind:'announcement_preview_read',explicitClick:true,explicitlyEnabled:true}),/aviso aprobado/);
assert.equal(await acknowledgeMajorRelease(sb,{profile,release:state,
 kind:'reauth_notice_acknowledged',explicitClick:true,explicitlyEnabled:true}),true);
payload={phase:'legal',id:'major_2026_01'};
assert.equal((await readMajorRelease(sb,{profile,explicitlyEnabled:true})).phase,'legal');
payload={...base,phase:'live'};
state=await readMajorRelease(sb,{profile,explicitlyEnabled:true});
assert.match(renderWhatsNew(state,'student'),/Comenzar/);
assert.equal(await acknowledgeMajorRelease(sb,{profile,release:state,
 kind:'whats_new_seen',explicitClick:true,explicitlyEnabled:true}),true);
payload={phase:'none'};
assert.equal((await readMajorRelease(sb,{profile,explicitlyEnabled:true})).phase,'none');
payload={...base,roles:['coach','coach','admin','personal']};
await assert.rejects(readMajorRelease(sb,{profile,explicitlyEnabled:true}),/Manifiesto/);
await assert.rejects(readMajorRelease(sb,{profile:{...profile,user_id:'bad'},
 explicitlyEnabled:true}),/sesión/);
const sql=readFileSync(new URL('../migrations/20261030_coach120_major_release_signed_server_control_off.sql',import.meta.url),'utf8');
for(const term of [
 'create table efg_private.major_release_manifests',
 'create table efg_private.major_release_receipts',
 'active boolean not null default false',
 'efg_major_release_status()',
 'efg_major_release_ack(',
 "v_session text:=auth.jwt()->>'session_id'",
 'v_old_session=v_session',
 'v_legal_count<>2',
 'p_explicit_click is distinct from true',
 "event_kind='reauth_notice_acknowledged'",
 "event_kind='whats_new_seen'",
 'for share',
 'enable row level security',
 'from public,anon,authenticated'
])assert.ok(sql.includes(term),'Missing server invariant: '+term);
assert.doesNotMatch(sql,/insert into efg_private\.major_release_manifests\s*\(/i,
 'No campaigns can become active implicitly');
assert.doesNotMatch(sql,/\bdelete\s+from\s+public\.efg_daily_logs\b/i,
 'Historical diary preserved');
const app=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
for(const part of [
 'MAJOR_RELEASE_FLOW_ENABLED&&RELEASE_COMMUNICATIONS_ENABLED',
 'readMajorRelease(sb,{profile:state.profile,explicitlyEnabled:true})',
 'renderMajorReleaseAnnouncement(state.majorRelease,state.profile.role)',
 'renderWhatsNew(state.majorRelease,state.profile.role)',
 'state.majorReleaseLegal=await loadCoachPilotLegal',
 'await acknowledgeMajorRelease(sb,{profile,release:current,kind:type,',
 'const out=await confirmMajorRelaunchAndExit(sb,{'
])assert.ok(app.includes(part),'Missing one-time major UI wiring: '+part);
const buildSql=readFileSync(new URL('../migrations/20261030_coach121_major_release_published_build_gate.sql',import.meta.url),'utf8');
assert.match(buildSql,/add column build text not null default 'unconfigured'/);
assert.match(buildSql,/and build<>'unconfigured'/);
assert.match(buildSql,/'build',v_release.build/);
assert.match(buildSql,/'published'/);
assert.doesNotMatch(app,/MAJOR_RELEASE_FLOW_ENABLED\s*=\s*true/i);
assert.doesNotMatch(app,/RELEASE_COMMUNICATIONS_ENABLED\s*=\s*true/i);
console.log('PASS COACH120 UX35: release disabled, signed current preview/reauth/legal/live, explicit per-user ack, no routine logout, non-destructive server default.');
