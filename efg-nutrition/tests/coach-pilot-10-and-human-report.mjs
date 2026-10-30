import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildLuxuryWeeklyReport,renderLuxuryWeeklyReport} from '../pilot/weekly-luxury-report.js';
const src=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../pilot/weekly-luxury-report.css',import.meta.url),'utf8');
const staged=readFileSync(new URL('../docs/COACH_PILOT_10_EXISTING_STUDENT_PROMOTION_STAGING_ONLY.sql',import.meta.url),'utf8');
assert.match(src,/const COACH_PILOT_PROMOTION_ENABLED=false/,'Pilot conversion stays OFF until verified release');
assert.match(src,/data-act="promoteExistingPilotCoach"/,'EFG admin has controlled pilot activation button');
assert.match(src,/state\.profile\?\.role!=="admin"\|\|!COACH_PILOT_PROMOTION_ENABLED/,'Never perform conversion from student/coach role or before launch');
assert.match(src,/sb\.rpc\("efg_promote_existing_student_to_pilot_coach",\{p_email:email\}\)/,'Use server-owned admin RPC and verified existing email');
assert.match(src,/MI DÍA/);
assert.match(src,/const isTest=!!org\?\.is_test/,'Trial coaches must be recognized as test spaces');
assert.match(src,/commercialReady=isTest\|\|\["active","grace"\]/,'Pilot coach can invite despite trial license');
assert.match(src,/state\.profile\.role==="admin"&&isTest\?state\.testInvitations:state\.invitations/,'Pilot coach uses their own invitations');
assert.match(src,/state\.org\?\.is_test\?\[\]:\[\["payments"/,'Pilot coach has no payment navigation');
assert.match(src,/role==="coach"&&org\?\.is_test/,'Pilot coach cannot be billed as commercial coach');
assert.match(src,/state\.orgs=\(o\.data\|\|\[\]\)\.filter\(o=>!o\.is_test\|\|o\.coach_id!==state\.session\.user\.id\)/,
 'EFG admin must see test coaches not admin own trial org');
assert.match(staged,/if not efg_private\.is_admin\(\)/);
assert.match(staged,/p\.role='student'/);
assert.match(staged,/seat_limit,status,is_test,license_fee_ars/);
assert.match(staged,/values\('Piloto EFG · '\|\|v_user\.nickname,v_user\.user_id,10,'trial',true,null\)/);
assert.match(staged,/update public\.efg_profiles set role='coach',organization_id=null/);
assert.doesNotMatch(staged,/\bdelete\s+from\s+public\.efg_(?:daily_logs|goals|weights|personal_recipes|habitual_meals)/i,'Never delete diaries');
assert.match(staged,/nut57_isolated_staging_marker/);
assert.match(staged,/revoke all on function public\.efg_promote_existing_student_to_pilot_coach/);
assert.match(css,/\.lux-report-flex\{[^}]*#dff5ff/i,'Joy panel must be pastel sky-blue');
assert.match(css,/\.lux-report-cover,\.lux-report-conclusion,\.lux-report-flex,\.lux-report-column i\{-webkit-print-color-adjust:exact/,
 'Sky blue should survive print/PDF');
const days=['2026-10-23','2026-10-24','2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29'];
const input={
 from:'2026-10-23',to:'2026-10-29',friday:'2026-10-30',
 studentName:'Sofía DEMO',coachName:'Coach DEMO',
 days:days.map(date=>({date,k:1900,p:120,c:220,f:55,closed:true,hasData:true,mealCount:3})),
 goals:[{start_on:'2026-10-22',kcal:2300,protein_g:150,carb_g:270,fat_g:75}],logs:[]
};
const model=buildLuxuryWeeklyReport(input);
const html=renderLuxuryWeeklyReport(model,{demo:true});
assert.match(model.conclusion,/¡Hola, Sofía!/);
assert.match(model.conclusion,/1\.900 kcal frente a 2\.300 kcal/);
assert.match(model.conclusion,/no miden por sí solos todo lo que comiste/);
assert.ok(model.focus.some(s=>/proteínas registradas/.test(s)));
assert.match(html,/Espacio para disfrutar/);
assert.match(html,/MODELO · DATOS FICTICIOS/);
assert.ok(!/\bculpa por comer|comida trampa|te la ganaste|comida prohibida/i.test(model.conclusion+' '+model.flexibleNote));
const low=buildLuxuryWeeklyReport({...input,days:input.days.slice(0,2)});
assert.match(low.conclusion,/todavía nos falta información/);
assert.doesNotMatch(low.conclusion,/1\.900 kcal/,'Incomplete records must not imply nutrient deficits');
console.log('PASS COACH-PILOT-10 / REPORT-LUX-77: disabled admin promotion UI, 10 free test seats role continuity, blue PDF block and humane evidence-based wording.');
