// One read-only calculation for coach reports and personal statistics.
import {reportTrendGoals,withReportTrendGoals} from './report-trend-snapshot.js?v=ncc-weekly-preview-r11-20261106';
export const MACRO_GAP_VERSION=1;
export const GAP_MACROS=Object.freeze([['p','Proteínas',1],['f','Grasas',3],['c','Hidratos',2]]);
const value=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=999999;
export function withMacroGaps(model,goals){return {...withReportTrendGoals(model,goals),macroGapVersion:MACRO_GAP_VERSION};}
export function macroGaps(model){
 if(model?.macroGapVersion!==MACRO_GAP_VERSION)throw Error('Versión de diferencias no compatible.');
 const targets=reportTrendGoals(model),summary=Object.fromEntries(GAP_MACROS.map(([k])=>[k,{missing:0,excess:0,below:0,above:0,compared:0}]));
 const days=model.days.map((d,i)=>({date:d.date,hasData:d.hasData===true,closed:d.closed===true,macros:Object.fromEntries(GAP_MACROS.map(([key,,index])=>{
  const target=targets.days[i][index],recorded=d.hasData&&value(d[key])?d[key]:null;
  const comparable=recorded!==null&&target!==null;
  const missing=comparable?Math.max(0,target-recorded):null,excess=comparable?Math.max(0,recorded-target):null;
  if(comparable){const s=summary[key];s.compared++;s.missing+=missing;s.excess+=excess;if(missing>1e-9)s.below++;if(excess>1e-9)s.above++;}
  return [key,{target,recorded,missing,excess}];
 }))}));
 return {summary,days,reason:targets.reason,recorded:days.filter(d=>d.hasData).length};
}
export function validMacroGaps(model){
 if(model?.macroGapVersion===undefined)return true;
 try{macroGaps(model);return true;}catch{return false;}
}
