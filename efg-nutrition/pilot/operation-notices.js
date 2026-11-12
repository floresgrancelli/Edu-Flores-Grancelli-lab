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
  const dialog=document.querySelector('.meal-popup');
  const inline=current.kind==='success'||!!dialog;e.classList.toggle('ncc-inline-notice',inline);
  e.querySelector('button').textContent=inline?'×':'Cerrar';
  // An error stays available in its editor, on a separate line before actions.
  // Both persistent messages and confirmed successes leave retry/save reachable.
  if(dialog){
   const actions=dialog.querySelector('[data-act=saveSelectedMeal],[data-savefood]')?.closest('.ncc-meal-save')||
    [...dialog.querySelectorAll('.ncc-meal-save')].find(node=>node.getClientRects().length);
   if(actions)actions.before(e);else (dialog.querySelector('h2')||dialog.firstElementChild)?.after(e);
  }else if(current.kind==='success'){
   const anchor=(current.slot&&document.querySelector('[data-daymealpanel="'+current.slot+'"] .student-meal-heading'))||
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
 e.addEventListener('focusin',pause);e.addEventListener('focusout',()=>queueMicrotask(resume));
 e.addEventListener('mouseenter',pause);e.addEventListener('mouseleave',resume);
 document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
 notify.clear=hide;notify.mount=mount;return notify;
}

// Button presentation follows the existing awaited operation; no timer, queue,
// persistence or claim of success. The caller settles only after its real await.
export function showSavingFeedback(button,{retryLabel='Reintentar guardado'}={}){
 if(!button)return ()=>{};
 const label=button.textContent,disabled=button.disabled;
 button.textContent='Guardando…';button.disabled=true;button.setAttribute('aria-busy','true');
 return ({failed=false}={})=>{
  if(!button.isConnected)return;
  button.disabled=disabled;button.removeAttribute('aria-busy');button.textContent=failed?retryLabel:label;
 };
}
