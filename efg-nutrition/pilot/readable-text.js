// Device preference; no account or clinical data is stored.
const key='ncc-text-size-v1';
const sizes={normal:1,large:1.2,extra:1.4};
let selected='normal';
try{const saved=localStorage.getItem(key);if(Object.hasOwn(sizes,saved))selected=saved;}catch{}
const visited=new WeakSet();
function scaleRules(rules){
 for(const rule of rules){
  if(rule.cssRules)scaleRules(rule.cssRules);
  if(!rule.style||visited.has(rule))continue;
  visited.add(rule);
  const value=rule.style.getPropertyValue('font-size');
  // Absolute units scale once; inherited em/% sizes follow their parent.
  if(value&&/\d(?:px|rem)\b/.test(value)){
   const scaled=value.replace(/(\d*\.?\d+)(px|rem)\b/g,'calc($1$2 * var(--ncc-text-scale, 1))');
   rule.style.setProperty('font-size',scaled,rule.style.getPropertyPriority('font-size'));
  }
 }
}
function scan(){for(const sheet of document.styleSheets){try{scaleRules(sheet.cssRules);}catch{/* External styles remain intact. */}}}
function apply(){
 document.documentElement.style.setProperty('--ncc-text-scale',sizes[selected]);
 document.documentElement.dataset.textSize=selected;
 document.querySelectorAll('[data-text-size]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.textSize===selected)));
 scan();
}
export function textSizeCard(){return '<section class="card ncc-text-settings" aria-label="Tamaño de letra"><h3>Aa · Tamaño de letra</h3><p>Elegí el tamaño que te resulte más cómodo para leer.</p><div class="ncc-text-options" role="group" aria-label="Tamaño de letra">'+Object.entries({normal:'Normal',large:'Grande',extra:'Extra grande'}).map(([value,label])=>'<button type="button" class="btn light" data-text-size="'+value+'" aria-pressed="'+(selected===value)+'">'+label+'</button>').join('')+'</div><p role="status" aria-live="polite" data-text-size-status>Se recuerda en este dispositivo.</p></section>';}
const style=document.createElement('style');style.textContent='.ncc-text-options{display:flex;flex-wrap:wrap;gap:8px}.ncc-text-options button{min-height:44px;height:auto;white-space:normal}.ncc-text-options [aria-pressed="true"]{outline:2px solid currentColor;outline-offset:2px}html[data-text-size="large"] #app,html[data-text-size="extra"] #app{overflow-wrap:anywhere}html[data-text-size="large"] #app button,html[data-text-size="extra"] #app button{height:auto;white-space:normal;min-height:44px}';document.head.append(style);
apply();
document.addEventListener('click',event=>{const button=event.target.closest('[data-text-size]');if(!button||!Object.hasOwn(sizes,button.dataset.textSize))return;selected=button.dataset.textSize;let saved=true;try{localStorage.setItem(key,selected);}catch{saved=false;}apply();document.querySelectorAll('[data-text-size-status]').forEach(node=>node.textContent=saved?'Tamaño aplicado. Se recuerda en este dispositivo.':'Tamaño aplicado para esta sesión.');});
// Also scale styles loaded after authentication, without observing text updates.
document.addEventListener('load',event=>{if(event.target.tagName==='LINK')scan();},true);
