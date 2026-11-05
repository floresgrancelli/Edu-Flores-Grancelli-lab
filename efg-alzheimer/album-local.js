(()=>{
"use strict";
const cards=[];let index=0,completed=0,unknowns=0,started=0,mode="tap",onBack=()=>{},onFinish=()=>{},recognizer=null,player=null;
let phase = "idle", answered = false, lifecycle = 0, speechVersion = 0, advanceTimer = null, feedbackTimer = null;
const FEEDBACK_MIN_MS = 2200;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const el=()=>document.getElementById("main");
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const normalized=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w ]/g,"").trim();
function cancelAdvance() {
 if (advanceTimer !== null) clearTimeout(advanceTimer);
 if (feedbackTimer !== null) clearTimeout(feedbackTimer);
 advanceTimer = feedbackTimer = null;
}
function stopRecognition() {
 const previous = recognizer;
 recognizer = null;
 if (previous) { try { previous.abort(); } catch {} }
}
function stopSpeech() {
 speechVersion++;
 if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch {} }
}
function stop() {
 lifecycle++;
 phase = "idle";
 answered = true;
 cancelAdvance();
 stopRecognition();
 stopSpeech();
}
function say(words, thenListen = false, onComplete = null) {
 stopRecognition();
 stopSpeech();
 const session = lifecycle, speech = speechVersion;
 let settled = false;
 const complete = succeeded => {
  if (settled || session !== lifecycle || speech !== speechVersion) return;
  settled = true;
  if (onComplete) onComplete();
  else if (succeeded && thenListen && mode === "voice" && phase === "play" && !answered) listen();
 };
 if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function") { complete(false); return; }
 try {
  const u = new SpeechSynthesisUtterance(words);
  u.lang = "es-AR";
  u.rate = .86;
  const voices = window.speechSynthesis.getVoices();
  u.voice = voices.find(v => v.lang.toLowerCase() === "es-ar") || voices.find(v => v.lang.toLowerCase().startsWith("es")) || null;
  u.onend = () => complete(true);
  u.onerror = () => complete(false);
  window.speechSynthesis.speak(u);
 } catch { complete(false); }
}
function advanceAfterFeedback(message) {
 const session = lifecycle, question = index, shownAt = Date.now();
 const stillHere = () => session === lifecycle && question === index && phase === "feedback" && answered;
 const ready = () => {
  if (!stillHere()) return;
  cancelAdvance();
  advanceTimer = setTimeout(() => {
   advanceTimer = null;
   if (stillHere()) next();
  }, Math.max(0, FEEDBACK_MIN_MS - (Date.now() - shownAt)));
 };
 feedbackTimer = setTimeout(() => {
  feedbackTimer = null;
  if (!stillHere()) return;
  stopSpeech();
  ready();
 }, Math.min(30000, Math.max(12000, message.length * 90)));
 say(message, false, ready);
}
function status(msg){const node=document.getElementById("album-status");if(node)node.textContent=msg;}
function setup(opts={}){
 stop();mode=opts.mode||"tap";onBack=opts.onBack||(()=>{});onFinish=opts.onFinish||(()=>{});renderSetup();
}
function renderSetup(){
 phase = "setup";
 el().innerHTML='<div class="section-top"><div><div class="eyebrow">Álbum familiar · solo demostración</div><h2>📸 Mis recuerdos</h2><p class="lead">Elegí fotos de viajes, cumpleaños, lugares y personas queridas. Después vamos a conversar sobre ellas con tranquilidad.</p></div><button class="subtle-button" data-album="back">← Familia</button></div>'+
 '<section class="card"><h3>Agregar fotografías</h3><div class="music-form"><label>Seleccioná las fotos desde tu celular o computadora<input id="album-files" type="file" accept="image/*,.heic,.heif" multiple /></label><label>Descripción inicial (opcional)<input id="album-caption" type="text" maxlength="100" placeholder="Ej.: Vacaciones en Córdoba" /></label></div>'+
 '<button type="button" class="btn btn-primary" data-album="add">＋ Agregar fotos</button><p id="album-status" class="status" role="status"></p>'+
 '<p class="small-muted">Funciona desde la galería o Archivos de Android y iPhone, según el navegador. En esta demo las imágenes no se suben ni se comparten: se muestran únicamente en este dispositivo y desaparecen al recargar la página. Usá solo fotos con permiso de las personas que aparecen. Si un formato HEIC no se ve, elegí una versión JPEG o PNG.</p></section>'+
 '<section class="card" style="margin-top:18px"><h3>Álbum · '+cards.length+' fotos</h3>'+
 (cards.length?'<div class="album-grid">'+cards.map((c,i)=>'<article class="album-tile"><img src="'+esc(c.url)+'" alt="'+esc(c.caption||"Fotografía del álbum")+'" loading="lazy" /><label>Descripción de la foto<input type="text" data-album-caption="'+i+'" maxlength="100" value="'+esc(c.caption)+'" placeholder="Lugar o recuerdo" /></label><button type="button" class="subtle-button" data-album="remove" data-index="'+i+'">Quitar</button></article>').join("")+'</div>':'<p class="small-muted">Todavía no agregaste fotografías.</p>')+
 '<div class="controls"><button type="button" class="btn btn-blue" data-album="start" '+(cards.length?'':'disabled')+'>▶ Jugar con los recuerdos</button></div></section>';
}
function add(){
 const files=[...(document.getElementById("album-files")?.files||[])];const caption=(document.getElementById("album-caption")?.value||"").trim().slice(0,100);
 if(!files.length){status("Primero elegí una o varias fotos.");return;}
 let added=0,rejected=0;
 for(const file of files){if(cards.length>=20){rejected++;continue;}
 if(!file.type.startsWith("image/")&&!/\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name)){rejected++;continue;}
 if(file.size>15*1024*1024){rejected++;continue;}
 cards.push({url:URL.createObjectURL(file),caption});added++;}
 renderSetup();if(rejected)status("Se agregaron "+added+" fotos; "+rejected+" se omitieron. Máximo 20 fotos de 15 MB cada una.");
}
function remove(i){let c=cards[i];if(!c)return;URL.revokeObjectURL(c.url);cards.splice(i,1);renderSetup();}
function begin(opts={}){if(!cards.length){setup(opts);return;}stop();mode=opts.mode||"tap";onBack=opts.onBack||(()=>{});onFinish=opts.onFinish||(()=>{});index=0;completed=0;unknowns=0;started=Date.now();renderPhoto();}
function renderPhoto(){
 stop();if(index>=cards.length){finish();return;}phase="play";answered=false;
 const c=cards[index];
 el().innerHTML='<div class="play-layout"><div class="toolbar"><button type="button" class="subtle-button" data-album="exit">← Terminar</button><span class="progress">Foto '+(index+1)+' de '+cards.length+'</span></div>'+
 '<div class="question-card"><div class="eyebrow">Recuerdos compartidos</div><h2>Mirá esta fotografía</h2><img class="album-main-photo" src="'+esc(c.url)+'" alt="'+esc(c.caption||"Fotografía familiar")+'" />'+
 (c.caption?'<p class="album-photo-caption">'+esc(c.caption)+'</p>':'')+
 '<h3>¿Te trae algún recuerdo?</h3><p>Podés elegir sí, no o no sé. También podemos simplemente disfrutar la foto.</p>'+
 '<div class="answer-list"><button type="button" class="answer-btn" data-album="answer" data-value="Sí"><span class="answer-letter">A</span>Sí</button>'+
 '<button type="button" class="answer-btn" data-album="answer" data-value="No"><span class="answer-letter">B</span>No</button>'+
 '<button type="button" class="answer-btn" data-album="answer" data-value="No sé"><span class="answer-letter">C</span>No sé</button></div>'+
 '<div class="controls"><button type="button" class="btn btn-light" data-album="repeat">🔊 Escuchar</button><button type="button" class="btn btn-blue" data-album="listen">🎤 Responder hablando</button><button type="button" class="btn btn-light" data-album="skip">↪ Otra foto</button></div>'+
 '<p id="album-status" role="status" class="status"></p></div></div>';
 if(mode==="voice")say("Mirá esta foto. "+(c.caption?c.caption+". ":"")+"¿Te trae algún recuerdo? Podés responder sí, no o no sé.",true);
}
function listen(){
 if (phase !== "play" || answered) return;
 if(!SR){status("Este navegador no permite responder hablando. Podés tocar las opciones.");return;}
 stopRecognition();stopSpeech();
 const session = lifecycle, question = index;
 try{const r=new SR();recognizer=r;r.lang="es-AR";r.interimResults=false;r.continuous=false;
 const isCurrent = () => session === lifecycle && question === index && recognizer === r && phase === "play" && !answered;
 r.onstart=()=>{if(isCurrent())status("🎤 Te escucho. Decí sí, no o no sé.");};
 r.onresult=e=>{
 if (!isCurrent()) return;
 const s=normalized(e.results?.[0]?.[0]?.transcript||"");
 if(s==="a"||s==="si"||s.includes("opcion a"))respond("Sí");
 else if(s==="b"||s==="no"||s.includes("opcion b"))respond("No");
 else if(s==="c"||s.includes("no se")||s.includes("no recuerdo")||s.includes("opcion c"))respond("No sé");
 else status("No te entendí. Podés repetir o tocar una respuesta.");
 };
 r.onerror=e=>{if(isCurrent())status(e.error==="not-allowed"?"No se autorizó el micrófono. Usá los botones.":"No pude escucharte. Usá los botones o probá de nuevo.");};
 r.onend=()=>{if(recognizer===r)recognizer=null;};
 r.start();
 }catch{stopRecognition();status("No se pudo activar el micrófono. Podés tocar una respuesta.");}
}
function respond(value){
 if (phase !== "play" || answered || !["Sí", "No", "No sé"].includes(value)) return;
 stop();phase="feedback";completed++;if(value==="No sé")unknowns++;
 const message=value==="Sí"?"¡Qué lindo! Los recuerdos son para compartir.":value==="No"?"Está muy bien. Podemos mirar otra foto juntos.":"No importa recordarlo. Podemos disfrutar la foto igual.";
 const card=el().querySelector(".question-card");if(!card)return;
 card.querySelectorAll('[data-album="answer"], [data-album="listen"], [data-album="repeat"], [data-album="skip"]').forEach(x=>x.disabled=true);
 card.insertAdjacentHTML("beforeend",'<div class="response-card"><strong>Gracias por compartir 🌷</strong><p>'+esc(message)+'</p></div>');
 status("Seguimos en un momento…");
 advanceAfterFeedback(message);
}
function next(){if(phase!=="feedback"||!answered)return;index++;renderPhoto();}
function skip(){if(phase!=="play"||answered)return;index++;renderPhoto();}
function finish(){
 stop();const previousStart=started;started=0;if(previousStart&&completed)onFinish({game:"Recuerdos felices",answered:completed,minutes:Math.max(1,Math.round((Date.now()-previousStart)/60000)),hints:0,unknown:unknowns,at:new Date().toISOString()});
 phase="done";el().innerHTML='<section class="hero-copy" style="max-width:660px;margin:55px auto"><span class="kicker">🌷 Compartimos recuerdos</span><h1>¡Qué lindo momento!</h1><p>Gracias por mirar las fotos. Cuando quieras, seguimos.</p><div class="cta-row"><button type="button" class="btn btn-primary" data-album="again">📷 Ver más fotos</button><button type="button" class="btn btn-blue" data-album="back">🏡 Volver</button></div></section>';
 say("Gracias por compartir este momento.");
}
el().addEventListener("input",e=>{const field=e.target.closest("[data-album-caption]");if(!field)return;const item=cards[Number(field.dataset.albumCaption)];if(item)item.caption=field.value.slice(0,100);});
el().addEventListener("click",e=>{const b=e.target.closest("[data-album]");if(!b||b.disabled)return;
 switch(b.dataset.album){
 case"back":stop();onBack();break;case"add":add();break;case"remove":remove(Number(b.dataset.index));break;
 case"start":begin({mode,onBack,onFinish});break;case"answer":respond(b.dataset.value);break;
 case"next":next();break;case"skip":skip();break;case"repeat":{if(phase!=="play"||answered)break;const c=cards[index];say("Mirá esta foto. "+(c?.caption?c.caption+". ":"")+"¿Te trae algún recuerdo?",mode==="voice");break;}
 case"listen":listen();break;case"exit":finish();onBack();break;case"again":begin({mode,onBack,onFinish});break;
 }
});
window.EFGAlbum={setup,begin,stop,hasPhotos:()=>cards.length>0};
})();
