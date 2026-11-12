// Presentation only: retain the actual form nodes, draft host and PDF handlers.
export function mountCoachReportFlow(root){
 for(const button of root.querySelectorAll('[data-report-kind]')){
  if(button.hasAttribute('data-report-bound'))continue;button.dataset.reportBound='';
  button.addEventListener('click',()=>{for(const p of root.querySelectorAll('[data-report-kind-panel]'))p.hidden=p.dataset.reportKindPanel!==button.dataset.reportKind;for(const b of root.querySelectorAll('[data-report-kind]'))b.setAttribute('aria-pressed',String(b===button));});
 }
 const card=root.querySelector('#coachPeriodReport');
 if(!card||card.hasAttribute('data-report-flow'))return;
 const host=card.querySelector('#periodReportResult');
 if(!host)return;
 card.dataset.reportFlow='';card.classList.add('ncc-report-flow');
 const nav=document.createElement('nav');nav.className='ncc-chart-tabs ncc-report-steps';nav.setAttribute('aria-label','Etapas del informe');
 const prepare=document.createElement('section');prepare.id='nccReportPrepare';
 for(const node of [...card.children])if(node.matches('.period-report-field,[data-act="generatePeriodReport"]'))prepare.append(node);
 const history=document.createElement('section');history.id='nccReportHistory';
 const originalHistory=card.nextElementSibling;
 if(originalHistory?.querySelector('#periodHistory'))history.append(originalHistory);
 card.insertBefore(nav,host);card.insertBefore(prepare,host);card.append(history);
 let stage='prepare',review='preview';
 const buttons=new Map();
 const ready=()=>!!host.querySelector('[data-act="printPeriodLuxury"]');
 const show=next=>{
  if(next==='review'&&!ready())return;
  stage=next;prepare.hidden=next!=='prepare';history.hidden=next!=='send';
  host.hidden=next==='prepare'&&ready();
  for(const panel of host.querySelectorAll('[data-report-pane]'))panel.hidden=panel.dataset.reportPane!==next;
  for(const [key,button] of buttons){button.setAttribute('aria-pressed',String(key===next));button.disabled=key==='review'&&!ready();}
 };
 for(const [key,label,target] of [['prepare','Preparar','nccReportPrepare'],['review','Revisar','nccReportReview'],['send','Enviar e historial','nccReportHistory']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.reportStage=key;button.setAttribute('aria-controls',target);button.addEventListener('click',()=>show(key));nav.append(button);buttons.set(key,button);
 }
 const organize=()=>{
  if(!ready()){show('prepare');return;}
  if(host.querySelector('[data-report-pane]'))return;
  const reviewPane=document.createElement('section');reviewPane.id='nccReportReview';reviewPane.dataset.reportPane='review';
  const sendPane=document.createElement('section');sendPane.id='nccReportSend';sendPane.dataset.reportPane='send';
  const preview=document.createElement('section'),edit=document.createElement('section');preview.dataset.reportReview='preview';edit.dataset.reportReview='edit';preview.id='nccReportPreviewPanel';edit.id='nccReportEditPanel';
  for(const node of [...host.children]){
   if(node.matches('#periodPublishStatus,[data-act="printPeriodLuxury"]'))sendPane.append(node);
   else if(node.matches('#periodLuxuryPreview'))preview.append(node);
   else edit.append(node);
  }
  const subnav=document.createElement('nav');subnav.className='ncc-chart-tabs';subnav.setAttribute('aria-label','Revisión del informe');
  const subbuttons=[];
  const select=value=>{review=value;preview.hidden=value!=='preview';edit.hidden=value!=='edit';subbuttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reportReviewTab===value)));};
  for(const [key,label,target] of [['preview','Balance y detalle','nccReportPreviewPanel'],['edit','Mi devolución','nccReportEditPanel']]){
   const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.reportReviewTab=key;b.setAttribute('aria-controls',target);b.addEventListener('click',()=>select(key));subbuttons.push(b);subnav.append(b);
  }
  reviewPane.append(subnav,preview,edit);host.append(reviewPane,sendPane);select(review);show('review');
 };
 new MutationObserver(organize).observe(host,{childList:true});
 organize();
}
