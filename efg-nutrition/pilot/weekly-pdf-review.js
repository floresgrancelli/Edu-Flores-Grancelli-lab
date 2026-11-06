import {readPdfPageText} from './pdf-page-text.js?v=ncc-weekly-preview-r11-20261106';
// One in-memory viewer. PDF.js draws the actual downloadable bytes, not an HTML facsimile.
// No upload, persistent storage, print(), popup, credentials or remote dependency.
import {buildWeeklyReportPdf} from './weekly-report-pdf.js?v=ncc-report-share-return-r12-20261106';
async function loadPdf(bytes){
 const pdfjs=await import('./vendor/pdfjs-5.6.205/pdf.min.mjs?v=ncc-weekly-preview-r11-20261106');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs-5.6.205/pdf.worker.min.mjs?v=ncc-weekly-preview-r11-20261106',import.meta.url).href;
 return pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false,useSystemFonts:false,enableXfa:false,useWasm:false});
}
export function createWeeklyPdfReview({root,buildPdf=buildWeeklyReportPdf,loadDocument=loadPdf,mode='weekly'}){
 let active=null;
 function close(force=false){
  const view=active;if(!view||view.submitting&&!force)return;
  active=null;view.reviewed=false;view.ticket=null;
  view.renderTask?.cancel();
  Promise.resolve(view.textReader?.cancel()).catch(()=>{});view.textReader=null;
  Promise.resolve(view.loadingTask?.destroy()).catch(()=>{});
  if(view.url)URL.revokeObjectURL(view.url);
  view.dialog.remove();view.onClose?.(view);
  if(!force&&view.opener?.isConnected)view.opener.focus();
 }
 function current(view){return active===view&&!!view.ticket&&view.dialog.isConnected&&view.isCurrent();}
 // Delivery may invalidate the draft/snapshot predicate. Return only to the still-owned
 // origin, never to a newer view, and never infer success from a settled promise.
 function canReturn(view){
  return active===view&&!!view.ticket&&view.dialog.isConnected&&view.dialog.open&&
   view.editable&&view.ready&&view.reviewed&&view.isOriginCurrent();
 }
 function complete(view,refreshOrigin=()=>view.opener){
  if(!canReturn(view))return false;
  const focus=refreshOrigin();
  close(true);
  if(focus?.isConnected)focus.focus({preventScroll:true});
  globalThis.scrollTo?.({left:view.originX,top:view.originY,behavior:'instant'});
  return true;
 }
 function requireReviewed(serialized){
  const view=active;
  if(!view||!current(view)||!view.dialog.open||!view.ready||!view.reviewed||view.serialized!==serialized||JSON.stringify(view.snapshot)!==serialized)
   throw Error('Abrí el PDF y revisá todas sus páginas antes de compartir este informe.');
  return view;
 }
 function setSubmitting(view,pending){
  if(active!==view)return;
  view.submitting=pending;sync(view);
  if(pending)view.status.textContent='Compartiendo el informe revisado… No vuelvas a enviarlo.';
 }
 function sync(view){
  const valid=current(view),busy=view.submitting||view.rendering;
  view.prev.disabled=busy||!view.ready||view.page<=1;
  view.next.disabled=busy||!view.ready||view.page>=view.pdf?.numPages;
  view.zoom.disabled=busy||!view.ready;
  view.close.disabled=view.submitting;
  view.retry.disabled=view.submitting;
  if(view.check){
   view.check.disabled=view.frozen||view.completed||!valid||busy||!view.ready||view.seen.size!==view.pdf?.numPages||!view.snapshot.daysRecorded;
   view.send.disabled=view.completed||!valid||busy||!view.ready||view.seen.size!==view.pdf?.numPages||!view.snapshot.daysRecorded||!view.reviewed;
  }
 }
 async function draw(view,pageNumber){
  if(!current(view)){if(active===view)close(true);return;}
  view.rendering=true;view.ready=false;sync(view);
  try{
   const page=await view.pdf.getPage(pageNumber);
   if(!current(view)){if(active===view)close(true);return;}
   const unit=page.getViewport({scale:1});
   const displayWidth=Math.max(240,Math.min(900,view.stage.clientWidth-4))*view.zoomFactor;
   const ratio=Math.min(2,globalThis.devicePixelRatio||1);
   const viewport=page.getViewport({scale:displayWidth/unit.width*ratio});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   canvas.style.width=Math.round(displayWidth)+'px';canvas.style.height=Math.round(viewport.height/ratio)+'px';
   canvas.setAttribute('aria-label','Página '+pageNumber+' de '+view.pdf.numPages+' del PDF');canvas.setAttribute('role','img');
   view.renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});
   await view.renderTask.promise;
   const text=await readPdfPageText(page,{isCurrent:()=>current(view),onReader:reader=>{view.textReader=reader;return ()=>{if(view.textReader===reader)view.textReader=null;};}});
   if(!current(view)){if(active===view)close(true);return;}
   if(!text)return;
   view.stage.replaceChildren(canvas);view.stage.scrollTop=0;view.stage.scrollLeft=0;
   view.transcript.textContent=text.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('');
   view.page=pageNumber;view.seen.add(pageNumber);view.ready=true;
   view.counter.textContent='Página '+pageNumber+' de '+view.pdf.numPages;
   view.status.textContent=view.editable?
    (!view.snapshot.daysRecorded?'No hay registros para compartir. Podés consultar el PDF o volver y elegir otras fechas.':view.seen.size===view.pdf.numPages?'Todas las páginas están disponibles para tu revisión. Confirmá abajo para compartir este mismo PDF.':'Revisá cada página con «Siguiente». Todavía no se envió el informe.'):
    view.snapshot.pdfRendererVersion?'PDF de la versión compartida. El historial está protegido.':'Informe anterior: conversión a PDF del contenido guardado. No es un PDF histórico conservado.';
  }finally{view.rendering=false;if(current(view))sync(view);}
 }
 async function prepare(view){
  view.ready=false;view.reviewed=false;view.error=null;view.check&&(view.check.checked=false);view.retry.hidden=true;sync(view);
  view.status.textContent='Preparando el PDF…';
  try{
   const bytes=await buildPdf(view.snapshot);
   if(!current(view)){if(active===view)close(true);return;}
   if(view.url)URL.revokeObjectURL(view.url);
   view.url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   view.download.href=view.url;view.download.download=mode==='period'?'informe-'+view.snapshot.from+'-'+view.snapshot.to+'.pdf':'informe-semanal-'+view.snapshot.friday+'.pdf';view.download.hidden=false;
   const task=await loadDocument(bytes);
   if(!current(view)){await task.destroy();if(active===view)close(true);return;}
   view.loadingTask=task;view.pdf=await task.promise;
   if(!current(view)){if(active===view)close(true);return;}
   view.seen.clear();await draw(view,1);
  }catch(error){
   if(current(view)){
    view.ready=false;view.reviewed=false;view.error=error;
    view.status.textContent='No se pudo abrir el PDF. No se envió el informe. Podés volver a editar o reintentar. '+error.message;
    view.retry.hidden=false;sync(view);
   }
  }
 }
 function open({snapshot,serialized=JSON.stringify(snapshot),isCurrent,editable=false,opener,onSend,onClose,isOriginCurrent=isCurrent}){
  if(active?.submitting)throw Error('Esperá a que termine el envío.');
  close(true);
  // Show synchronously in the original tap, before any import, generation or PDF decode.
  const dialog=document.createElement('dialog');dialog.className='weekly-pdf-dialog';dialog.setAttribute('aria-labelledby','weeklyPdfTitle');
  dialog.innerHTML='<header><div><p>LUXURY PRO · INFORME SEMANAL</p><h2 id="weeklyPdfTitle">'+(editable?'Revisar antes de compartir':'Informe compartido')+'</h2></div><button type="button" class="btn light" data-weekly-close>'+(editable?'Volver y editar':'Cerrar')+'</button></header><p data-weekly-identity></p><p data-weekly-review-note role="note" hidden></p><p data-weekly-status role="status"></p><nav aria-label="Páginas del PDF"><button type="button" class="btn light" data-weekly-prev>Anterior</button><span data-weekly-counter>Página…</span><button type="button" class="btn light" data-weekly-next>Siguiente</button><button type="button" class="btn light" data-weekly-zoom>Ampliar</button><a class="btn light" data-weekly-download hidden>Descargar PDF</a></nav><div class="weekly-pdf-stage" data-weekly-stage tabindex="0" aria-label="Página del PDF, desplazamiento horizontal al ampliar"></div><details class="weekly-pdf-text"><summary>Texto accesible de esta página</summary><p data-weekly-text></p></details><button type="button" class="btn light" data-weekly-retry hidden>Reintentar PDF</button>'+(editable?'<footer><label><input type="checkbox" id="weeklyPdfReviewed" disabled> Revisé todas las páginas y el alumno destinatario.</label><button type="button" class="btn" id="weeklyLuxuryPublishButton" disabled>Aprobar y compartir con alumno</button></footer>':'');
  if(mode==='period'){
   dialog.classList.add('period-pdf-dialog');
   dialog.innerHTML=dialog.innerHTML.replaceAll('INFORME SEMANAL','INFORME POR PERÍODO').replaceAll('weeklyPdfTitle','periodPdfTitle').replaceAll('weeklyPdfReviewed','periodReportReviewed').replaceAll('weeklyLuxuryPublishButton','periodPublishButton');
   dialog.setAttribute('aria-labelledby','periodPdfTitle');
   dialog.querySelector('[data-weekly-close]').setAttribute('data-pdf-close','');
   dialog.querySelector('[data-weekly-status]').setAttribute('data-pdf-status','');
   dialog.querySelector('[data-weekly-download]').setAttribute('data-pdf-download','');
   if(editable)dialog.querySelector('#periodPublishButton').dataset.act='publishPeriodLuxury';
  }
  const q=s=>dialog.querySelector(mode==='period'?s.replace('#weeklyPdfReviewed','#periodReportReviewed').replace('#weeklyLuxuryPublishButton','#periodPublishButton'):s);
  const view={dialog,snapshot:JSON.parse(serialized),serialized,isCurrent,isOriginCurrent,editable,opener,onClose,originX:globalThis.scrollX||0,originY:globalThis.scrollY||0,ticket:Symbol(),seen:new Set(),page:0,zoomFactor:1,ready:false,reviewed:false,rendering:false,submitting:false,
   close:q('[data-weekly-close]'),status:q('[data-weekly-status]'),prev:q('[data-weekly-prev]'),next:q('[data-weekly-next]'),zoom:q('[data-weekly-zoom]'),counter:q('[data-weekly-counter]'),stage:q('[data-weekly-stage]'),download:q('[data-weekly-download]'),transcript:q('[data-weekly-text]'),retry:q('[data-weekly-retry]'),check:q('#weeklyPdfReviewed'),send:q('#weeklyLuxuryPublishButton')};
  active=view;root.appendChild(dialog);
  q('[data-weekly-identity]').textContent=view.snapshot.studentName+' · '+view.snapshot.from+' al '+view.snapshot.to+(view.snapshot.coachVoiceVersion?' · '+view.snapshot.coachName+(view.snapshot.coachName==='Tu coach'?'':' · Tu coach'):'');
  if(editable&&view.snapshot.coachVoiceVersion){
   const m=view.snapshot,notes=[];
   if(m.coachName==='Tu coach')notes.push('No hay un nombre verificado para la firma. El informe mostrará «Tu coach».');
   if([m.studentName,m.coachName,m.conclusion,m.flexibleNote,...(m.focus||[]),...(m.topFoods||[]).map(f=>f.name),m.evidence?.rule].some(text=>/\bEFG\b/i.test(text||'')))
    notes.push('El contenido incluye «EFG». Revisá si corresponde a un nombre o texto que querés conservar; no lo cambiamos automáticamente.');
   const note=q('[data-weekly-review-note]');note.textContent=notes.join(' ');note.hidden=!notes.length;
  }
  view.close.addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(active===view)close(true);});
  const turn=number=>draw(view,number).catch(error=>{if(current(view)){view.status.textContent='No se pudo mostrar esta página. '+error.message;view.retry.hidden=false;sync(view);}});
  view.prev.addEventListener('click',()=>turn(view.page-1));view.next.addEventListener('click',()=>turn(view.page+1));
  view.zoom.addEventListener('click',()=>{view.zoomFactor=view.zoomFactor===1?1.7:1;view.zoom.textContent=view.zoomFactor===1?'Ampliar':'Ajustar';turn(view.page);});
  view.retry.addEventListener('click',async()=>{await view.loadingTask?.destroy();if(current(view))prepare(view);});
  if(editable){
   view.check.addEventListener('change',()=>{view.reviewed=view.check.checked&&!view.check.disabled;sync(view);});
   if(onSend)view.send.addEventListener('click',async()=>{
    try{requireReviewed(serialized);await onSend();}
    catch(error){if(current(view)){view.status.textContent=error.message;sync(view);}}
   });
  }
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  sync(view);view.prepared=prepare(view);
  return view;
 }
 return {open,close,requireReviewed,setSubmitting,canReturn,complete};
}
