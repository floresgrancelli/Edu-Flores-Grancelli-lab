// Planning preference only. No clinical eligibility, targets, diary or server writes.
export const COACH_GUIDE_WINDOWS=Object.freeze([
 ['regular','Sin ayuno programado'],['12_12','Ayuno intermitente · 12:12'],
 ['14_10','Ayuno intermitente · 14:10'],['16_8','Ayuno intermitente · 16:8']
].map(x=>Object.freeze(x)));
export const validGuideWindow=id=>COACH_GUIDE_WINDOWS.some(([value])=>value===id);
export function resolveCoachGuideWindow({selection,scope,plan,intakeWindow}={}){
 if(selection?.scope===scope&&scope&&validGuideWindow(selection.windowId))return selection.windowId;
 if(validGuideWindow(plan?.windowId))return plan.windowId;
 return validGuideWindow(intakeWindow)?intakeWindow:'regular';
}
export function guideWindowLabel(id){return COACH_GUIDE_WINDOWS.find(([value])=>value===id)?.[1]||'';}
export function coachGuideWindowControl(windowId){
 return '<div class="field"><label for="coachGuideWindow">Organización horaria / ayuno intermitente</label><select id="coachGuideWindow">'+
  COACH_GUIDE_WINDOWS.map(([id,label])=>'<option value="'+id+'" '+(id===windowId?'selected':'')+'>'+label+'</option>').join('')+
  '</select><p class="pilot-hint">Preferencia horaria para revisión profesional, no indicación clínica. No reduce las metas diarias. Para aplicar un cambio, generá nuevamente la guía y revisá sus porciones.</p><p class="pilot-hint" role="status" id="coachGuideWindowStatus"></p></div>';
}
export function assertGuideWindowApplied(plan,selected,intakeWindow){
 if(plan&&selected!==resolveCoachGuideWindow({plan,intakeWindow}))
  throw Error('La ventana horaria cambió. Regenerá la guía para aplicarla, o volvé a la ventana anterior para conservar tus ediciones.');
}
