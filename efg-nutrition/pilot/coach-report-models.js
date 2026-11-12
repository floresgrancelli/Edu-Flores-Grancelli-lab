import {withMacroGaps,validMacroGaps} from './report-macro-gaps.js?v=ncc-report-gaps-r1-20261112';
import {renderMacroGaps} from './report-macro-gaps-view.js?v=ncc-report-gaps-r1-20261112';
// New authored presentation only. Missing version always means unchanged historical HTML.
import * as weeklyLegacy from './weekly-luxury-report.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import * as periodLegacy from './period-luxury-report.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import * as weeklyCurrent from './weekly-luxury-report-v2.js?v=ncc-report-share-return-r12-20261106';
import * as periodCurrent from './period-luxury-report-v2.js?v=ncc-report-share-return-r12-20261106';
export const buildLuxuryWeeklyReport=weeklyCurrent.buildLuxuryWeeklyReport;
export const buildLuxuryPeriodReport=options=>withMacroGaps(periodCurrent.buildLuxuryPeriodReport(options),options?.goals??null);
const current=m=>m?.coachVoiceVersion!==undefined;
export function renderLuxuryWeeklyReport(m,options){return (current(m)?weeklyCurrent:weeklyLegacy).renderLuxuryWeeklyReport(m,options);}
export function renderLuxuryPeriodReport(m,options){if(!validMacroGaps(m))return '';const legacy=(current(m)?periodCurrent:periodLegacy).renderLuxuryPeriodReport(m,options);return legacy&&m.macroGapVersion===1?renderMacroGaps(m,{legacy}):legacy;}
export function reportAsStoredText(m,...text){return (current(m)?weeklyCurrent:weeklyLegacy).reportAsStoredText(m,...text);}
export function periodReportAsStoredText(m,...text){if(!validMacroGaps(m))throw Error('Diferencias del informe inválidas.');return (current(m)?periodCurrent:periodLegacy).periodReportAsStoredText(m,...text);}
export function parseLuxuryWeeklyReport(text){const m=weeklyLegacy.parseLuxuryWeeklyReport(text);return current(m)?weeklyCurrent.parseLuxuryWeeklyReport(text):m;}
export function parseLuxuryPeriodReport(text){const m=periodLegacy.parseLuxuryPeriodReport(text);const parsed=current(m)?periodCurrent.parseLuxuryPeriodReport(text):m;return validMacroGaps(parsed)?parsed:null;}
// Only the authenticated owner profile may supply the new document's byline.
// Never infer a person's name from an email, organization, recipient or another admin.
export function reportCoachName({profile,session,org}){
 const id=session?.user?.id;
 if(!id||profile?.user_id!==id||org?.coach_id!==id||profile.active===false||
  !(profile.role==='coach'||profile.role==='admin'&&org.is_test===true))return 'Tu coach';
 const clean=value=>typeof value==='string'?value.replace(/[\x00-\x1f]/g,' ').trim().slice(0,70):'';
 // Exact system fallback verified in the published weekly builder, not a substring filter.
 return [clean(profile.nickname),clean(profile.full_name)].find(name=>name&&name!=='Entrenador EFG')||'Tu coach';
}
