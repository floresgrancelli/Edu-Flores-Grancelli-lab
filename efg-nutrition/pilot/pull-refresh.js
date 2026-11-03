// EFG Nutrition Pro: iPhone/Android pull-to-refresh without reloading the document.
// Only intercept a single-finger downward drag from the top of the page.
// The supplied callback performs a user-scoped, authenticated data sync.
export function createPullToRefresh({canRefresh,refresh,threshold=82}){
 const panel=document.createElement("div");
 panel.id="efgPullRefresh";
 panel.className="efg-pull-refresh";
 panel.setAttribute("role","status");
 panel.setAttribute("aria-live","polite");
 panel.setAttribute("aria-atomic","true");
 panel.innerHTML='<span class="efg-pull-symbol" aria-hidden="true">↻</span><span class="efg-pull-label">Deslizá para actualizar</span>';
 document.body.append(panel);
 const label=panel.querySelector(".efg-pull-label");
 let y0=0,x0=0,distance=0,tracking=false,claimed=false,busy=false,endTimer=null,lastSuccess=null;
 function paint(message,amount=0,mode=""){
  panel.className="efg-pull-refresh"+(amount>0||mode?" is-visible":"")+(mode?" is-"+mode:"");
  panel.style.setProperty("--efg-pull-progress",String(Math.min(1,amount/threshold)));
  panel.style.transform="translate(-50%, "+(amount>0?Math.min(24,amount-68):-68)+"px)";
  label.textContent=message;
 }
 function clearDelayed(){
  if(endTimer!==null){clearTimeout(endTimer);endTimer=null;}
 }
 function reset(){
  tracking=false;claimed=false;distance=0;
  if(!busy)paint(lastSuccess?"Actualizado hace unos segundos":"Deslizá para actualizar");
 }
 function isEditable(el){
  return !!el?.closest?.('input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="dialog"],dialog[open],.efg-notify-popup,.efg-message-history,.efg-inbox-full');
 }
 function hasNestedScroll(el){
  for(let node=el;node&&node!==document.body&&node!==document.documentElement;node=node.parentElement){
   if(!(node instanceof HTMLElement))continue;
   const style=getComputedStyle(node),overflow=style.overflowY;
   if(/auto|scroll/.test(overflow)&&node.scrollHeight>node.clientHeight+3)return true;
  }
  return false;
 }
 function atTop(){return (window.scrollY||document.documentElement.scrollTop||0)<=2;}
 function start(e){
  if(busy||!canRefresh()||e.touches.length!==1||!atTop()||isEditable(e.target)||hasNestedScroll(e.target)||document.querySelector("dialog[open]"))return;
  clearDelayed();
  x0=e.touches[0].clientX;y0=e.touches[0].clientY;
  distance=0;tracking=true;claimed=false;
 }
 function move(e){
  if(!tracking||busy)return;
  if(e.touches.length!==1||!canRefresh()||!atTop()){reset();return;}
  const dx=e.touches[0].clientX-x0,dy=e.touches[0].clientY-y0;
  if(dy<0||Math.abs(dx)>Math.abs(dy)*.8){reset();return;}
  if(dy<8)return;
  if(e.cancelable)e.preventDefault(); // Prevent the browser refresh gesture only while owned.
  claimed=true;
  distance=Math.min(160,dy*.72);
  paint(distance>=threshold?"Soltá para actualizar":"Deslizá para actualizar",distance);
 }
 async function run(){
  if(busy||!canRefresh())return false;
  clearDelayed();
  busy=true;tracking=false;claimed=false;distance=0;
  paint("Actualizando EFG Nutrition…",threshold,"loading");
  try{
   await refresh();
   lastSuccess=Date.now();
   paint("✓ Actualizado hace unos segundos",threshold,"success");
   return true;
  }catch(err){
   console.warn("EFG refresh",err);
   paint("No se pudo actualizar. Deslizá otra vez.",threshold,"error");
   return false;
  }finally{
   busy=false;
   endTimer=setTimeout(()=>{endTimer=null;reset();},1900);
  }
 }
 function end(){
  if(!tracking)return;
  const shouldUpdate=claimed&&distance>=threshold;
  tracking=false;claimed=false;distance=0;
  if(shouldUpdate)void run();
  else reset();
 }
 document.addEventListener("touchstart",start,{passive:true});
 document.addEventListener("touchmove",move,{passive:false});
 document.addEventListener("touchend",end,{passive:true});
 document.addEventListener("touchcancel",reset,{passive:true});
 return {run,isBusy:()=>busy,lastUpdated:()=>lastSuccess,dispose(){
  clearDelayed();document.removeEventListener("touchstart",start);
  document.removeEventListener("touchmove",move);
  document.removeEventListener("touchend",end);
  document.removeEventListener("touchcancel",reset);panel.remove();
 }};
}
