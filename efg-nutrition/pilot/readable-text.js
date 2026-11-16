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
 document.querySelectorAll('button[data-text-size]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.textSize===selected)));
 scan();
}
export function textSizeCard(){return '<section class="card ncc-text-settings" aria-label="Tamaño de letra"><h3>Aa · Tamaño de letra</h3><p>Elegí el tamaño que te resulte más cómodo para leer.</p><div class="ncc-text-options" role="group" aria-label="Tamaño de letra">'+Object.entries({normal:'Normal',large:'Grande',extra:'Extra grande'}).map(([value,label])=>'<button type="button" class="btn light" data-text-size="'+value+'" aria-pressed="'+(selected===value)+'">'+label+'</button>').join('')+'</div><p role="status" aria-live="polite" data-text-size-status>Se recuerda en este dispositivo.</p></section>';}
const style=document.createElement('style');style.textContent='.ncc-text-options{display:flex;flex-wrap:wrap;gap:8px}.ncc-text-options button{min-height:44px;height:auto;white-space:normal}.ncc-text-options [aria-pressed="true"]{outline:2px solid currentColor;outline-offset:2px}html[data-text-size="large"] #app,html[data-text-size="extra"] #app{overflow-wrap:anywhere}html[data-text-size="large"] #app button,html[data-text-size="extra"] #app button{height:auto;white-space:normal;min-height:44px}';document.head.append(style);
apply();
document.addEventListener('click',event=>{const button=event.target.closest('button[data-text-size]');if(!button||!Object.hasOwn(sizes,button.dataset.textSize))return;selected=button.dataset.textSize;let saved=true;try{localStorage.setItem(key,selected);}catch{saved=false;}apply();document.querySelectorAll('[data-text-size-status]').forEach(node=>node.textContent=saved?'Tamaño aplicado. Se recuerda en este dispositivo.':'Tamaño aplicado para esta sesión.');});
// Also scale styles loaded after authentication, without observing text updates.
document.addEventListener('load',event=>{if(event.target.tagName==='LINK')scan();},true);

export function settingsButtonHTML(){return '<button type="button" class="ncc-settings-trigger" data-ncc-open-settings aria-haspopup="dialog" aria-label="Configuración">⚙ <span>Configuración</span></button>';}
function openSettings(trigger){
 if(document.getElementById('nccSettingsDialog'))return;
 const dialog=document.createElement('dialog');dialog.id='nccSettingsDialog';dialog.className='ncc-settings-dialog';dialog.setAttribute('aria-labelledby','nccSettingsTitle');
 dialog.innerHTML='<header><h2 id="nccSettingsTitle">Configuración</h2><button type="button" class="ncc-settings-close" aria-label="Cerrar configuración">×</button></header>'+textSizeCard();
 document.body.append(dialog);
 dialog.querySelector('.ncc-settings-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{dialog.remove();trigger?.focus();});
 dialog.showModal();apply();
}
document.addEventListener('click',event=>{const trigger=event.target.closest('[data-ncc-open-settings]');if(trigger)openSettings(trigger);});
const settingsStyle=document.createElement('style');settingsStyle.textContent=`
.ncc-settings-trigger{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:44px;padding:8px;border:1px solid #47574b;border-radius:12px;background:#202e27;color:#edf0df;font-family:inherit;font-size:11px;font-weight:600;line-height:1.2;cursor:pointer;white-space:normal;max-width:112px}
.ncc-settings-trigger span{font-size:11px}.pilot-nav>.ncc-settings-trigger{max-width:none;width:100%;margin-top:10px}
.efg-mobile-person:has(.ncc-settings-trigger){gap:5px}.efg-mobile-header:has(.ncc-settings-trigger){gap:6px!important}
.efg-mobile-header:has(.ncc-settings-trigger) .efg-mobile-brand{gap:5px!important}
.efg-mobile-header:has(.ncc-settings-trigger) .efg-mobile-brand img{width:28px!important;height:auto!important}
.efg-mobile-header:has(.ncc-settings-trigger) .efg-mobile-person{flex-shrink:0}
.ncc-settings-dialog{box-sizing:border-box;width:min(440px,calc(100% - 28px));max-height:85dvh;overflow:auto;border:1px solid #4b5b46;border-radius:22px;padding:20px;background:#142019;color:#edf0df;box-shadow:0 22px 70px #0008;font-family:inherit}
@media(max-width:720px){.pilot-nav>.ncc-settings-trigger{display:none!important}}
.ncc-settings-dialog :is(h2,h3,p){color:#edf0df!important}
.ncc-settings-dialog [data-text-size-status]{color:#c4cebd!important}
.ncc-settings-dialog::backdrop{background:#0009;backdrop-filter:blur(3px)}
.ncc-settings-dialog>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}
.ncc-settings-dialog h2{margin:0;font-size:22px}.ncc-settings-dialog h3{font-size:17px;margin:0 0 10px}
.ncc-settings-dialog p{font-size:14px;line-height:1.5}.ncc-settings-dialog .ncc-text-settings{margin:0;padding:16px;background:#1b2a21;border:1px solid #46553e;border-radius:16px}
.ncc-settings-dialog .ncc-text-options button{flex:1 1 85px;min-height:48px;border:1px solid #56644e;border-radius:12px;padding:10px;background:#29362c;color:#edf0df;font-size:14px;cursor:pointer}
.ncc-settings-dialog .ncc-text-options [aria-pressed=true]{background:#36472c;border-color:#b2c579;outline:2px solid #b2c579}
.ncc-settings-close{min-width:44px;min-height:44px;font-size:26px;background:#26352b;color:#edf0df;border:1px solid #4b5b46;border-radius:12px;cursor:pointer}
`;document.head.append(settingsStyle);scan();
