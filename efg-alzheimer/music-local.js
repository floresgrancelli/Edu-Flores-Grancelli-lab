(()=>{
"use strict";
const singers=["Juan Gabriel","Camilo Sesto","Dyango","José José","Roberto Carlos","Sandro","Nino Bravo","Raphael","Sergio Denis","Leonardo Favio"];
let tracks=[],audio=null,recognition=null,onBack=()=>{},onFinished=()=>{},options={},current=0,answered=0,unknowns=0,started=0,done=false,listening=false,voiceBusy=false;
let phase = "idle", lifecycle = 0, speechVersion = 0, advanceTimer = null, feedbackTimer = null;
const FEEDBACK_MIN_MS = 2200;
const main=()=>document.getElementById("main");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function cancelAdvance() {
 if (advanceTimer !== null) clearTimeout(advanceTimer);
 if (feedbackTimer !== null) clearTimeout(feedbackTimer);
 advanceTimer = feedbackTimer = null;
}
function stopAudio() {
 const previous = audio;
 audio = null;
 if (previous) { try { previous.pause(); previous.src = ""; previous.load(); } catch {} }
}
function stopRecognition() {
 const previous = recognition;
 recognition = null;
 listening = false;
 if (previous) { try { previous.abort(); } catch {} }
}
function stopSpeech() {
 speechVersion++;
 voiceBusy = false;
 if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch {} }
}
function stop() {
 lifecycle++;
 phase = "idle";
 done = true;
 cancelAdvance();
 stopAudio();
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
  voiceBusy = false;
  if (onComplete) onComplete();
  else if (succeeded && thenListen && options.mode === "voice" && phase === "play" && !done) listen();
 };
 if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function") { complete(false); return; }
 try {
  const u = new SpeechSynthesisUtterance(words);
  u.lang = "es-AR";
  u.rate = .88;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.toLowerCase() === "es-ar") || voices.find(v => v.lang.toLowerCase().startsWith("es"));
  if (voice) u.voice = voice;
  voiceBusy = true;
  u.onend = () => complete(true);
  u.onerror = () => complete(false);
  window.speechSynthesis.speak(u);
 } catch { complete(false); }
}
function advanceAfterFeedback(message) {
 const session = lifecycle, question = current, shownAt = Date.now();
 const stillHere = () => session === lifecycle && question === current && phase === "feedback" && done;
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
function status(t){const el=document.getElementById("local-music-status");if(el)el.textContent=t;}
function setup(args={}){
 stop();options=args;onBack=args.onBack||(()=>{});onFinished=args.onFinish||(()=>{});renderSetup();
}
function renderSetup(){
 phase = "setup";
 main().innerHTML='<div class="section-top"><div><div class="eyebrow">Configurar la música · Familia</div><h2>🎵 Canciones de los 70 y 80</h2><p class="lead">Cargá un archivo musical del teléfono o computadora y elegí el cantante. Durante el juego se reproducen 25 segundos.</p></div><button class="subtle-button" data-music="back">← Familia</button></div>'+
 '<div class="card"><h3>Agregar canción</h3><div class="music-form"><label>Archivo de audio<input id="local-music-file" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac" /></label>'+
 '<label>¿Quién la canta?<select id="local-music-artist">'+singers.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join("")+'</select></label>'+
 '<label>Empezar en el segundo<input type="number" id="local-music-start" min="0" max="600" value="30" step="5" /></label></div>'+
 '<button class="btn btn-primary" data-music="add" type="button">＋ Agregar</button><p id="local-music-status" class="status" role="status"></p>'+
 '<p class="small-muted">Usá archivos que tengas permiso de utilizar. Se reproducen solo desde este dispositivo y no se envían ni guardan en nuestros servidores. Al cerrar o recargar la página se pierde esta selección. Los archivos de Apple Music o Spotify protegidos contra copia no pueden importarse.</p></div>'+
 '<div class="card" style="margin-top:18px"><h3>Canciones disponibles · '+tracks.length+'</h3>'+
 (tracks.length?'<ul class="session-list">'+tracks.map((t,i)=>'<li><span>🎼 '+esc(t.artist)+' · '+esc(t.name)+'</span><button class="subtle-button" data-music="remove" data-index="'+i+'">Quitar</button></li>').join("")+'</ul>':'<p class="small-muted">Todavía no cargaste canciones. Podés empezar con una y agregar más después.</p>')+
 '<button class="btn btn-blue" data-music="start" '+(tracks.length?'':'disabled')+' type="button">▶ Probar adiviná el cantante</button></div>';
}
function add(){let file=document.getElementById("local-music-file")?.files?.[0],artist=document.getElementById("local-music-artist")?.value,raw=Number(document.getElementById("local-music-start")?.value||0);
 if(!file){status("Elegí un archivo de música para empezar.");return}
 if(!file.type.startsWith("audio/")&&!/\.(mp3|m4a|wav|aac)$/i.test(file.name)){status("El archivo debe ser de audio (MP3, M4A o WAV).");return}
 if(file.size>60*1024*1024){status("Elegí un archivo menor a 60 MB.");return}
 if(!singers.includes(artist)){status("Elegí un cantante de la lista.");return}
 tracks.push({name:file.name.slice(0,100),artist,url:URL.createObjectURL(file),start:Number.isFinite(raw)?Math.max(0,Math.min(600,raw)):0});
 renderSetup();
}
function remove(i){const t=tracks[i];if(!t)return;stop();URL.revokeObjectURL(t.url);tracks.splice(i,1);renderSetup();}
function pickOptions(t,index){const distract=singers.filter(s=>s!==t.artist),a=[distract[index*2%distract.length],distract[(index*2+1)%distract.length]];a.splice(index%3,0,t.artist);if(options.level==="moderado"){const wrong=a.find(x=>x!==t.artist);return index%2?[t.artist,wrong]:[wrong,t.artist]}return a;}
function play(args={}){if(!tracks.length){setup(args);return;}stop();options=args;onBack=args.onBack||(()=>{});onFinished=args.onFinish||(()=>{});current=0;answered=0;unknowns=0;started=Date.now();renderQuestion();}
function renderQuestion(){
 stop();if(current>=tracks.length){finish();return;}phase="play";done=false;
 const t=tracks[current],choices=pickOptions(t,current);
 main().innerHTML='<div class="play-layout"><div class="toolbar"><button class="subtle-button" data-music="exit">← Terminar</button><span class="progress">Canción '+(current+1)+' de '+tracks.length+'</span></div>'+
 '<div class="question-card"><div class="big-illustration" aria-hidden="true">🎵</div><div class="eyebrow">Melodías de mi vida</div><h2>¿Quién canta esta canción?</h2>'+
 '<p>Escuchá la música. Después podés responder por voz o tocando.</p>'+
 '<button class="btn btn-peach" data-music="play">▶ Escuchar 25 segundos</button>'+
 '<div class="answer-list">'+choices.map((v,i)=>'<button class="answer-btn" type="button" data-music="answer" data-index="'+i+'"><span class="answer-letter">'+String.fromCharCode(65+i)+'</span><span>'+esc(v)+'</span></button>').join("")+'</div>'+
 '<div class="controls"><button class="btn btn-light" data-music="unknown">🤍 No sé</button><button class="btn btn-light" data-music="listen">🎤 Responder hablando</button></div>'+
 '<p id="local-music-status" class="status" role="status">Reproducí el fragmento con el botón. También podés volver a escucharlo.</p></div></div>';
 if(options.mode==="voice")say("Vamos a escuchar una canción. Tocá escuchar para empezar. Después elegí quién canta.");
}
function playback(){if(phase!=="play"||done)return;const t=tracks[current];if(!t)return;stopAudio();stopRecognition();stopSpeech();status("🎵 Reproduciendo...");
 const session = lifecycle, question = current;
 try{const a=new Audio();audio=a;a.src=t.url;a.preload="metadata";let ended=false,startTime=0;
 const isCurrent = () => session === lifecycle && question === current && audio === a && phase === "play" && !done;
 function finishPlayback(){if(ended||!isCurrent())return;ended=true;a.pause();status("Terminó el fragmento. ¿Quién es el cantante?");if(options.mode==="voice")say("¿Quién canta esta canción? Decí A, B o C.",true);}
 a.addEventListener("loadedmetadata",()=>{
  if (!isCurrent()) return;
  const dur=a.duration;
  startTime=Number.isFinite(dur)&&dur>0?Math.max(0,Math.min(t.start,Math.max(0,dur-25))):t.start;
  try{a.currentTime=startTime}catch{}
 },{once:true});
 a.addEventListener("timeupdate",()=>{if(a.currentTime>=startTime+24.9)finishPlayback()});
 a.addEventListener("ended",finishPlayback,{once:true});
 a.addEventListener("error",()=>{if(isCurrent())status("No pude leer el audio. Probá con un archivo MP3 sin protección.");},{once:true});
 const promise=a.play();if(promise&&promise.catch)promise.catch(()=>{if(isCurrent())status("Tu dispositivo bloqueó la reproducción. Tocá el botón otra vez.");});
 }catch{status("No se pudo reproducir el audio.");}}
function listen(){if(phase!=="play"||done)return;if(!SR){status("Este navegador no admite respuestas habladas. Elegí un botón.");return;}if(voiceBusy){status("Esperá a que termine la indicación hablada.");return}
 stopRecognition();stopAudio();
 const session = lifecycle, question = current;
 try{const r=new SR();recognition=r;r.lang="es-AR";r.interimResults=false;r.continuous=false;
 const isCurrent = () => session === lifecycle && question === current && recognition === r && phase === "play" && !done;
 r.onstart=()=>{if(!isCurrent())return;listening=true;status("🎤 Te escucho. Decí A, B, C o no sé.")};
 r.onresult=e=>{if(!isCurrent())return;listening=false;const spoken=normalize(e.results?.[0]?.[0]?.transcript||"");const t=tracks[current];const choices=pickOptions(t,current);
 if(/no se|no recuerdo|ni idea|paso/.test(spoken)){answer(-1);return}
 let idx=-1;const match=spoken.match(/^(opcion |la |el )?([abc])\b/);if(match)idx=match[2].charCodeAt(0)-97;
 if(idx<0)idx=choices.findIndex(x=>{let n=normalize(x);return spoken===n||spoken.includes(n)});
 if(idx>=0&&idx<choices.length)answer(idx);else status("No entendí. Volvé a hablar o tocá una respuesta.");};
 r.onerror=e=>{if(!isCurrent())return;listening=false;status(e.error==="not-allowed"?"No está permitido usar el micrófono. Respondé tocando.":"No pude escucharte. Probá otra vez o tocá.");};
 r.onend=()=>{if(recognition===r){recognition=null;listening=false;}};r.start();
 }catch{stopRecognition();status("No se pudo activar el micrófono; respondé tocando.");}}
function answer(index){if(phase!=="play"||done)return;const t=tracks[current],choices=pickOptions(t,current);if(!Number.isInteger(index)||index < -1||index>=choices.length)return;stop();phase="feedback";
 const guessed=index<0?"":choices[index];answered++;if(index<0)unknowns++;
 const feedback=index<0?"No pasa nada. Esta canción la canta "+t.artist+".":guessed===t.artist?"¡Qué bien! Es "+t.artist+".":"Gracias por intentarlo. La canta "+t.artist+".";
 const choiceBtns=main().querySelectorAll('[data-music="answer"], [data-music="unknown"], [data-music="listen"], [data-music="play"]');choiceBtns.forEach(b=>b.disabled=true);
 const footer=main().querySelector(".question-card");if(!footer)return;
 footer.insertAdjacentHTML("beforeend",'<div class="response-card"><strong>¡Gracias por participar! 🌷</strong><p>'+esc(feedback)+'</p></div>');
 status("Seguimos en un momento…");
 advanceAfterFeedback(feedback);
}
function next(){if(phase!=="feedback"||!done)return;current++;renderQuestion()}
function finish(){stop();const previousStart=started;started=0;if(previousStart&&answered){onFinished({game:"Melodías de mi vida",answered,minutes:Math.max(1,Math.round((Date.now()-previousStart)/60000)),hints:0,unknown:unknowns,at:new Date().toISOString()});}phase="done";
 main().innerHTML='<div class="hero-copy" style="max-width:690px;margin:60px auto"><span class="kicker">🌷 Un lindo momento</span><h1>¡Gracias por escuchar!</h1><p>Siempre podemos volver a compartir canciones.</p><div class="cta-row"><button class="btn btn-primary" data-music="again">🎵 Volver a jugar</button><button class="btn btn-blue" data-music="exit">🏡 Terminar</button></div></div>';say("¡Gracias por compartir la música!");}
main().addEventListener("click",e=>{const b=e.target.closest("[data-music]");if(!b||b.disabled)return;
 switch(b.dataset.music){
 case"add":add();break;case"back":stop();onBack();break;case"remove":remove(Number(b.dataset.index));break;
 case"start":play(options);break;case"play":playback();break;case"listen":listen();break;
 case"answer":answer(Number(b.dataset.index));break;case"unknown":answer(-1);break;
 case"next":next();break;case"exit":finish();onBack();break;case"again":play(options);break;
 }
});
window.EFGMusic={setup,play,stop,hasTracks:()=>tracks.length>0};
})();
