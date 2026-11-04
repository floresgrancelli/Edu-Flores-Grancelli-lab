import assert from 'node:assert/strict';
import {buildLuxuryPeriodReport,renderLuxuryPeriodReport,periodReportAsStoredText,parseLuxuryPeriodReport} from '../pilot/period-luxury-report.js';
const days=[{date:'2026-10-26',hasData:true,closed:true,mealCount:2,k:2000,p:150,c:230,f:60,fi:30},{date:'2026-11-04',hasData:true,closed:false,mealCount:1,k:2100,p:140,c:250,f:65,fi:32}];
const m=buildLuxuryPeriodReport({from:'2026-10-26',to:'2026-11-04',friday:'2026-11-05',days,goals:[{start_on:'2026-10-01',kcal:2500,protein_g:150,carb_g:322,fat_g:68,fiber_g:35},{start_on:'2026-11-01',kcal:2100,protein_g:140,carb_g:250,fat_g:65,fiber_g:30}]});
assert.equal(m.days.length,10);assert.equal(m.daysRecorded,2);assert.equal(m.averages.k,2050);assert.equal(m.targets.k,2300);assert.equal(m.targets.fi,32.5);
const html=renderLuxuryPeriodReport(m);assert.match(html,/2 \/ 10/);assert.match(html,/Espacio para disfrutar/);assert.match(html,/Tus alimentos más elegidos/);assert.doesNotMatch(html,/de 7 días/);
assert.equal(parseLuxuryPeriodReport(periodReportAsStoredText(m,'Revisado','Disfrutar')).days.length,10);
assert.equal(parseLuxuryPeriodReport('{"kind":"efg_luxury_weekly_v1"}'),null);
console.log('PASS period Luxury: 10 days, historical goals, missing days, sections, serialization isolated from weekly.');
