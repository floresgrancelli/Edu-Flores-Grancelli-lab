// Presentation only. Callers explicitly identify confirmed successes; text is
// never inspected to infer whether an operation succeeded or must stay visible.
export function createOperationNotices({element,context}){
 const e=element;let current=null,returnFocus=null;
 const hide=()=>{clearTimeout(notify.timer);e.style.display='none';e.hidden=true;current=null;};
 const pause=()=>clearTimeout(notify.timer);
 const resume=()=>{
  pause();if(!current||current.kind!=='success'||e.contains(document.activeElement)||e.matches(':hover')||document.hidden)return;
  notify.timer=setTimeout(hide,4500);
 };
 function mount(){
  if(!current)return;
  const now=context();
  if(!now.owner||now.owner!==current.owner||(current.kind==='success'&&now.view!==current.view)){hide();return;}
  if(current.kind==='success'){
   // The shared status element occupies its own line in the existing content.
   // No overlay, duplicated toast, extra button row or change to diary data.
   const dialog=document.querySelector('.meal-popup');
   const anchor=dialog?.querySelector('h2')||
    (current.slot&&document.querySelector('[data-daymealpanel="'+current.slot+'"] .student-meal-heading'))||
    document.querySelector('[data-suggestionpanel]:not([hidden]) > summary')||
    document.querySelector('.pilot-main > :first-child');
   if(anchor)anchor.after(e);else document.body.append(e);
  }else document.body.append(e);
 }
 function notify(message,{kind='notice',slot=null}={}){
  pause();const scope=context();returnFocus=document.activeElement;
  current={...scope,kind,slot};e.classList.toggle('ncc-inline-notice',kind==='success');e.dataset.noticeKind=kind;
  e.setAttribute('role',kind==='error'?'alert':'status');e.setAttribute('aria-live',kind==='error'?'assertive':'polite');e.setAttribute('aria-atomic','true');
  const text=document.createElement('span');text.textContent=message;
  const close=document.createElement('button');close.type='button';close.textContent=kind==='success'?'×':'Cerrar';close.setAttribute('aria-label','Cerrar aviso');
  close.onclick=()=>{const previous=returnFocus;hide();if(previous?.isConnected)previous.focus({preventScroll:true});};
  e.replaceChildren(text,close);e.hidden=false;e.style.display='flex';mount();resume();
 }
 e.onfocusin=pause;e.onfocusout=()=>queueMicrotask(resume);e.onmouseenter=pause;e.onmouseleave=resume;
 document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
 notify.clear=hide;notify.mount=mount;return notify;
}
