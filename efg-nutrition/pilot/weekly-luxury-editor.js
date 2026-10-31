// REPORT-LUX-76: non-persistent, coach-scoped approval of exact weekly preview.
// No localStorage, sessionStorage, network calls, automatic approval or publication.
export function createLuxuryWeeklyEditor(){
 let draft=null;
 const clean=value=>String(value??"").trim();
 const valid=({coachId,studentId,weekEnding,model})=>
  typeof coachId==='string'&&coachId.length>0&&
  typeof studentId==='string'&&studentId.length>0&&
  /^\d{4}-\d{2}-\d{2}$/.test(String(weekEnding||''))&&
  model?.kind==='efg_luxury_weekly_v1'&&model.friday===weekEnding;
 function scope(context){
  if(!valid(context))throw Error('Informe semanal sin coach, alumno o período válido.');
  const key=[context.coachId,context.studentId,context.weekEnding].join('|');
  const baseline=JSON.stringify(context.model);
  if(!draft||draft.key!==key){
   draft={key,baseline,conclusion:clean(context.model.conclusion),
    flexibleNote:clean(context.model.flexibleNote),previewProof:null,sourceChanged:false};
  }else if(draft.baseline!==baseline){
   // Keep the coach's unsent text but require a fresh preview of the new data.
   draft.baseline=baseline;
   draft.previewProof=null;
   draft.sourceChanged=true;
  }
  return {
   conclusion:draft.conclusion,flexibleNote:draft.flexibleNote,
   sourceChanged:draft.sourceChanged,
   ready:!!draft.previewProof
  };
 }
 function update(context,field,value){
  scope(context);
  if(!['conclusion','flexibleNote'].includes(field))throw Error('Campo de edición de informe no permitido.');
  const limit=field==='conclusion'?2200:750;
  const content=String(value??'');
  if(content.length>limit)throw Error('El texto del informe excede el límite permitido.');
  if(draft[field]!==content){draft[field]=content;draft.previewProof=null;}
  return {ready:!!draft.previewProof};
 }
 function snapshot(context,conclusion,flexibleNote){
  scope(context);
  const c=clean(conclusion),f=clean(flexibleNote);
  if(!c||c.length>2200||f.length>750)throw Error('Revisá la conclusión y el texto de flexibilidad.');
  return {conclusion:c,flexibleNote:f,proof:JSON.stringify([draft.baseline,c,f])};
 }
 function preview(context,conclusion,flexibleNote){
  const p=snapshot(context,conclusion,flexibleNote);
  draft.conclusion=p.conclusion;draft.flexibleNote=p.flexibleNote;
  draft.previewProof=p.proof;
  draft.sourceChanged=false;
  return {...context.model,conclusion:p.conclusion,flexibleNote:p.flexibleNote};
 }
 function requirePreview(context,conclusion,flexibleNote){
  const p=snapshot(context,conclusion,flexibleNote);
  if(draft.previewProof!==p.proof){
   throw Error('Actualizá la vista previa Luxury Pro después de cada cambio antes de compartir el informe.');
  }
  return {...context.model,conclusion:p.conclusion,flexibleNote:p.flexibleNote};
 }
 function reset(){draft=null;}
 return {scope,update,preview,requirePreview,reset};
}
