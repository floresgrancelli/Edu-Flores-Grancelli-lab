(() => {
"use strict";
const main=document.getElementById("main");
const canSpeak=!!window.speechSynthesis;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const canListen=!!SR;
const games=[
 {id:"preguntas",name:"Sabías que…",short:"Preguntas de cultura general",icon:"🌎",color:"mint",questions:[
  {question:"¿Cuál es la capital de Chile?",options:["Lima","Santiago","Montevideo"],correct:1,hint:"Es una ciudad al pie de la cordillera de los Andes.",symbol:"🌎"},
  {question:"¿Qué animal nos da lana?",options:["Vaca","Oveja","Caballo"],correct:1,hint:"Es un animal de granja con abundante pelo.",symbol:"🐑"},
  {question:"¿En qué mes celebramos la Navidad?",options:["Septiembre","Diciembre","Abril"],correct:1,hint:"Es el último mes del año.",symbol:"🎄"},
  {question:"¿Qué océano baña las playas de Mar del Plata?",options:["Pacífico","Atlántico","Índico"],correct:1,hint:"Es el océano de la costa este de América del Sur.",symbol:"🌊"}]},
 {id:"musica",name:"Melodías de mi vida",short:"Escuchar y disfrutar música",icon:"🎵",color:"sun",questions:[
  {question:"Escuchá esta melodía. ¿Te gustó?",options:["Sí","No","No sé"],kind:"opinion",audio:"melody",notes:[392,440,523,440,392],symbol:"🎶"},
  {question:"Escuchá otra melodía. ¿Te hace pensar en una celebración?",options:["Sí","No","No sé"],kind:"opinion",audio:"melody",notes:[330,392,440,523,440,392],symbol:"🎼"},
  {question:"¿Te gustaría escuchar esta música otra vez?",options:["Sí","No","No sé"],kind:"opinion",audio:"melody",notes:[523,494,440,392,440,523],symbol:"🎵"}]},
 {id:"imagenes",name:"¿Qué estás viendo?",short:"Reconocer figuras grandes",icon:"🍎",color:"pink",questions:[
  {question:"¿Cuál de estas imágenes es una manzana?",options:[{text:"Banana",icon:"🍌"},{text:"Manzana",icon:"🍎"},{text:"Pera",icon:"🍐"}],correct:1,hint:"Es una fruta redonda que puede ser roja o verde.",symbol:"🖼️"},
  {question:"¿Cuál de estos animales es un perro?",options:[{text:"Gato",icon:"🐈"},{text:"Perro",icon:"🐕"},{text:"Conejo",icon:"🐇"}],correct:1,hint:"Suele ladrar.",symbol:"🐾"},
  {question:"¿Cuál de estos objetos sirve para abrir una puerta?",options:[{text:"Taza",icon:"☕"},{text:"Llave",icon:"🔑"},{text:"Reloj",icon:"⌚"}],correct:1,hint:"Lo usamos en una cerradura.",symbol:"🏠"},
  {question:"¿Cuál de estos objetos es un instrumento musical?",options:[{text:"Pelota",icon:"⚽"},{text:"Guitarra",icon:"🎸"},{text:"Zapato",icon:"👞"}],correct:1,hint:"Tiene cuerdas.",symbol:"🎸"}]},
 {id:"recuerdos",name:"Recuerdos felices",short:"Conversar sin respuestas incorrectas",icon:"💐",color:"lav",questions:[
  {question:"¿Te gustaba bailar cuando eras más joven?",options:["Sí","No","No sé"],kind:"opinion",symbol:"💃"},
  {question:"¿Te gusta recordar comidas que preparaban en tu casa?",options:["Sí","No","No sé"],kind:"opinion",symbol:"🍲"},
  {question:"¿Te gustaba salir a pasear en familia?",options:["Sí","No","No sé"],kind:"opinion",symbol:"🌳"},
  {question:"¿Te gustaría que otro día veamos fotografías antiguas?",options:["Sí","No","No sé"],kind:"opinion",symbol:"📷"}]},
 {id:"sonidos",name:"Adiviná el sonido",short:"Escuchar y reconocer campanadas",icon:"🔔",color:"blue",questions:[
  {question:"Escuchá las campanadas. ¿Cuántas sonaron?",options:["Una","Dos","Tres"],correct:1,hint:"Podés volver a escuchar el sonido.",audio:"bell",count:2,symbol:"🔔"},
  {question:"Escuchá las campanadas. ¿Cuántas sonaron?",options:["Una","Dos","Tres"],correct:0,hint:"Escuchá de nuevo con tranquilidad.",audio:"bell",count:1,symbol:"🔔"},
  {question:"Escuchá las campanadas. ¿Cuántas sonaron?",options:["Una","Dos","Tres"],correct:2,hint:"Podés contar los sonidos de a uno.",audio:"bell",count:3,symbol:"🔔"}]},
 {id:"compras",name:"Vamos de compras",short:"Números de todos los días",icon:"🛒",color:"peach",questions:[
  {question:"Si una manzana cuesta 100 pesos y pagás con 200, ¿cuánto te devuelven?",options:["50 pesos","100 pesos","150 pesos"],correct:1,hint:"Pensá cuánto falta desde 100 para llegar a 200.",symbol:"🍎"},
  {question:"Si comprás dos panes y después uno más, ¿cuántos panes tenés?",options:["Dos","Tres","Cuatro"],correct:1,hint:"Contá los dos primeros y agregá uno.",symbol:"🥖"},
  {question:"Si tenés cinco caramelos y regalás dos, ¿cuántos quedan?",options:["Dos","Tres","Cuatro"],correct:1,hint:"Podés usar los dedos para ayudarte.",symbol:"🍬"},
  {question:"Si comprás una leche por 300 pesos y un pan por 200, ¿cuánto gastás?",options:["400 pesos","500 pesos","600 pesos"],correct:1,hint:"Sumá trescientos y doscientos.",symbol:"🥛"}]},
 {id:"parejas",name:"Encontrá la pareja",short:"Relacionar objetos cotidianos",icon:"🧩",color:"aqua",questions:[
  {question:"¿Qué usamos junto con un cepillo de dientes?",options:["Pasta dental","Paraguas","Almohada"],correct:0,hint:"Pensá en lavarte los dientes.",symbol:"🪥"},
  {question:"¿Qué va bien con una taza?",options:["Zapato","Platito","Peine"],correct:1,hint:"Pensá en servir un café.",symbol:"☕"},
  {question:"¿Qué usamos con una llave?",options:["Cerradura","Escoba","Sartén"],correct:0,hint:"Pensá en abrir una puerta.",symbol:"🔑"},
  {question:"¿Qué va junto con un zapato?",options:["Vaso","Media","Cuchara"],correct:1,hint:"Es una prenda que usamos en los pies.",symbol:"👞"}]},
 {id:"refranes",name:"Palabras y refranes",short:"Completar frases conocidas",icon:"💬",color:"lime",questions:[
  {question:"Completá el refrán: Más vale pájaro en…",options:["la casa","la mano","la plaza"],correct:1,hint:"Es una parte de nuestro cuerpo.",symbol:"🐦"},
  {question:"Completá el refrán: Al mal tiempo…",options:["buena cara","mucho sueño","poco pan"],correct:0,hint:"Es una manera positiva de afrontar las dificultades.",symbol:"🌤️"},
  {question:"Completá el refrán: No por mucho madrugar…",options:["todo es fácil","amanece más temprano","hace más calor"],correct:1,hint:"Pensá en cuándo aparece el sol.",symbol:"☀️"},
  {question:"Completá el refrán: El que espera…",options:["desespera","se apura","se enoja"],correct:0,hint:"La espera a veces impacienta.",symbol:"⏰"}]}
];
const byId=id=>games.find(g=>g.id===id);
const state={page:"welcome",mode:"tap",level:"leve",game:null,index:0,answered:false,hintText:"",feedback:"",current:null,sessions:[],listening:false,voiceIssue:""};
try{const level=sessionStorage.getItem("efg_alzheimer_level");if(level==="moderado")state.level=level;
 const stored=JSON.parse(sessionStorage.getItem("efg_alzheimer_demo_sessions")||"[]");if(Array.isArray(stored))state.sessions=stored.slice(-20);}catch{}
const clean=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
const label=o=>typeof o==="string"?o:o.text;
const symbol=o=>typeof o==="string"?"":o.icon||"";
const escape=s=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const save=()=>{try{sessionStorage.setItem("efg_alzheimer_demo_sessions",JSON.stringify(state.sessions.slice(-20)));sessionStorage.setItem("efg_alzheimer_level",state.level);}catch{}};
let recognizer=null,voiceBusy=false,audioCtx=null;
function setStatus(s,hearing=false){const el=document.getElementById("voice-status");if(el){el.textContent=s;el.classList.toggle("hearing",hearing);}}
function stopListening(){if(recognizer){try{recognizer.abort()}catch{}}state.listening=false;}
function stopSpeech(){if(canSpeak)window.speechSynthesis.cancel();}
function say(text,listenAfter=false){stopListening();if(!canSpeak){setStatus("La lectura por voz no está disponible en este navegador.");return;}
 const u=new SpeechSynthesisUtterance(text);u.lang="es-AR";u.rate=.88;u.pitch=1.04;const voices=window.speechSynthesis.getVoices();const v=voices.find(v=>v.lang.toLowerCase()==="es-ar")||voices.find(v=>v.lang.toLowerCase().startsWith("es"));if(v)u.voice=v;voiceBusy=true;
 u.onend=()=>{voiceBusy=false;if(listenAfter&&state.mode==="voice")listen();};u.onerror=()=>{voiceBusy=false;setStatus("Podés seguir tocando los botones.")};stopSpeech();window.speechSynthesis.speak(u);}
function listen(){if(state.mode!=="voice")return;if(!canListen){setStatus("Este navegador no permite respuestas por voz. Usá los botones grandes.");return;}
 if(voiceBusy)return;stopListening();try{recognizer=new SR();recognizer.lang="es-AR";recognizer.continuous=false;recognizer.interimResults=false;
 recognizer.onstart=()=>{state.listening=true;setStatus("🎤 Te escucho. Podés decir A, B, C, sí, no o no sé.",true)};
 recognizer.onresult=e=>{state.listening=false;const spoken=e.results?.[0]?.[0]?.transcript||"";setStatus('Escuché: "'+spoken+'"');handleSpoken(spoken);};
 recognizer.onerror=e=>{state.listening=false;setStatus(e.error==="not-allowed"?"No se autorizó el micrófono. Podés usar los botones.":"No pude escucharte claramente. Podés repetir o tocar.");};
 recognizer.onend=()=>{state.listening=false;};
 recognizer.start();}catch{setStatus("No se pudo activar el micrófono. Usá los botones.");}}
function questionOptions(q){let arr=q.options.map((o,i)=>({o,original:i}));if(state.level==="moderado"&&q.kind!=="opinion"){const good=arr.find(x=>x.original===q.correct),wrong=arr.find(x=>x.original!==q.correct);arr=[wrong,good];if(state.index%2===0)arr.reverse();}else if(state.level==="moderado"&&q.kind==="opinion"){arr=arr.slice(0,2);}
 return arr;}
function getQuestion(){return state.game?.questions[state.index];}
function readQuestion(){const q=getQuestion();if(!q)return;const arr=questionOptions(q);
 const spoken=q.question+" "+arr.map((a,i)=>String.fromCharCode(65+i)+": "+label(a.o)).join(". ")+". Podés responder con la letra o decir no sé.";
 say(spoken,state.mode==="voice");}
function handleSpoken(text){const t=clean(text);if(!t)return;
 if(state.page==="games"){for(const g of games){if(t.includes(clean(g.name).replace("…",""))||t.includes(g.id)|| (g.id==="musica"&&t.includes("musica"))||(g.id==="imagenes"&&t.includes("figuras"))){openGame(g.id);return;}}setStatus("No encontré ese juego. Podés elegirlo tocando.");return;}
 if(state.page==="done"){if(/si|otro|seguir|continuar/.test(t)){showGames();return;}if(/no|salir|terminar/.test(t)){showWelcome();return;}}
 if(state.page!=="play")return;if(state.answered){if(/si|siguiente|continuar|seguir|otro/.test(t)){next();return;}if(/no|terminar|salir/.test(t)){finish();return;}listen();return;}
 if(/no se|no recuerdo|no lo se|ni idea|paso/.test(t)){unknown();return;}
 const options=questionOptions(getQuestion());
 let idx=-1;
 const m=t.match(/^(?:opcion |la |el )?([abc])(?:\b|$)/);if(m)idx=m[1].charCodeAt(0)-97;
 if(idx<0){idx=options.findIndex(x=>{const n=clean(label(x.o));return t===n||t.includes(n);});}
 if(idx<0){if(t==="si"||t==="sí")idx=options.findIndex(x=>clean(label(x.o))==="si");else if(t==="no")idx=options.findIndex(x=>clean(label(x.o))==="no");}
 if(idx>=0&&idx<options.length)answer(idx);else {setStatus("No entendí la respuesta. Probá con A, B, C o tocá una opción.");}}
function render(html){main.innerHTML=html;window.scrollTo({top:0,behavior:"instant"});}
function showWelcome(){stopListening();stopSpeech();window.EFGMusic?.stop();state.page="welcome";state.game=null;
 render('<section class="hero"><div class="hero-copy"><span class="kicker">🌷 Un momento para disfrutar</span><h1>¡Hola!<br>¿Jugamos un ratito?</h1><p>Podemos conversar, escuchar música, ver dibujos y descubrir cosas juntos. A tu ritmo, sin apuro.</p><div class="cta-row"><button class="btn btn-primary" data-action="start-voice">🎤 Jugar hablando</button><button class="btn btn-blue" data-action="start-tap">👆 Jugar tocando</button></div><p class="helper">Elegís cómo responder. También podés cambiar de forma durante el juego.</p></div><div class="hero-art">'+heroSvg()+'<span class="bubble one" aria-hidden="true">🎵</span><span class="bubble two" aria-hidden="true">🌸</span></div></section>');
}
function heroSvg(){return '<svg viewBox="0 0 400 340" role="img" aria-label="Ilustración cálida de una persona adulta disfrutando música"><ellipse cx="201" cy="314" rx="145" ry="19" fill="#aecdb7" opacity=".45"/><rect x="56" y="170" width="292" height="129" rx="52" fill="#eda872"/><rect x="72" y="184" width="253" height="112" rx="43" fill="#e9b38e"/><path d="M160 166C150 129 149 88 180 69c27-19 63-8 80 18 14 22 8 56-1 77" fill="#758b8e"/><ellipse cx="208" cy="139" rx="67" ry="77" fill="#f1bd96"/><path d="M142 130c-8-55 26-86 65-89 40-4 70 27 72 72-18-24-29-35-51-36-13 22-44 39-86 53" fill="#f0f0e6"/><path d="M152 115c16-33 51-53 91-46" fill="none" stroke="#d4dcd4" stroke-width="10" stroke-linecap="round"/><circle cx="185" cy="138" r="16" fill="none" stroke="#536270" stroke-width="5"/><circle cx="232" cy="138" r="16" fill="none" stroke="#536270" stroke-width="5"/><path d="M201 139h15" stroke="#536270" stroke-width="5"/><path d="M199 166q16 13 32-2" fill="none" stroke="#ab675e" stroke-width="5" stroke-linecap="round"/><path d="M139 274c0-53 29-86 69-86s70 34 70 86" fill="#338f8a"/><path d="M138 276c20 23 125 26 145-1" fill="#338f8a"/><path d="M155 245q58 25 108-4" fill="none" stroke="#84cbc0" stroke-width="10" stroke-linecap="round"/><rect x="281" y="152" width="69" height="94" rx="17" transform="rotate(15 281 152)" fill="#fcf6e7" stroke="#b4c2b6" stroke-width="7"/><circle cx="314" cy="200" r="15" fill="#f3c478"/><path d="M307 193v-24l24-5v25" stroke="#4d8779" stroke-width="6" fill="none"/><path d="M157 217q-16 3-24 25" stroke="#f1bd96" stroke-width="22" fill="none" stroke-linecap="round"/></svg>';}
function showGames(){stopListening();stopSpeech();window.EFGMusic?.stop();state.page="games";state.game=null;
 render('<div class="section-top"><div><div class="eyebrow">Elegí una actividad</div><h2>¿Qué te gustaría hacer hoy?</h2><p class="lead">Podemos cambiar de juego cuando quieras.</p></div><div class="settings-row"><span class="mode-mark">'+(state.mode==="voice"?"🎤 Voz y botones":"👆 Botones")+'</span><button type="button" class="subtle-button" data-action="toggle-mode">Cambiar modo</button></div></div><section class="game-grid" aria-label="Juegos disponibles">'+games.map(g=>'<button type="button" class="game-card" data-action="open" data-game="'+g.id+'"><span class="game-icon '+g.color+'" aria-hidden="true">'+g.icon+'</span><strong>'+g.name+'</strong><span class="desc">'+g.short+'</span></button>').join("")+'</section><div class="status" id="voice-status" role="status"></div>'+(state.mode==="voice"?'<div class="controls"><button class="btn btn-light" data-action="listen">🎤 Hablar</button></div>':""));
 if(state.mode==="voice")say("¡Qué bueno! Podés elegir preguntas, música, imágenes, recuerdos, sonidos, compras, parejas o refranes. Decime cuál preferís.",true);}
function openGame(id){const g=byId(id);if(!g)return;stopListening();stopSpeech();
 if(id==="musica"&&window.EFGMusic?.hasTracks()){window.EFGMusic.play({mode:state.mode,level:state.level,onBack:showGames,onFinish:recordLocalMusic});return;}
 state.game=g;state.index=0;state.answered=false;state.hintText="";state.feedback="";state.page="play";state.current={id:g.id,name:g.name,started:Date.now(),answered:0,hints:0,unknown:0};renderPlay();if(state.mode==="voice")readQuestion();}
function renderPlay(){const q=getQuestion();if(!q){finish();return;}state.page="play";
 const opts=questionOptions(q);const total=state.game.questions.length;
 const optHTML=opts.map((x,i)=>'<button type="button" class="answer-btn" data-action="answer" data-index="'+i+'" '+(state.answered?"disabled":"")+'><span class="answer-letter">'+String.fromCharCode(65+i)+'</span>'+(symbol(x.o)?'<span class="answer-picture" aria-hidden="true">'+symbol(x.o)+'</span>':"")+'<span>'+escape(label(x.o))+'</span></button>').join("");
 render('<div class="play-layout"><div class="toolbar"><button class="subtle-button" data-action="finish">← Terminar</button><span class="progress"><span>Actividad '+(state.index+1)+' de '+total+'</span><span class="track"><span style="width:'+Math.round((state.index+1)/total*100)+'%"></span></span></span></div><section class="question-card"><div class="big-illustration" aria-hidden="true">'+(q.symbol||state.game.icon)+'</div><div class="eyebrow">'+escape(state.game.name)+'</div><h2>'+escape(q.question)+'</h2><p>Escuchá o elegí una respuesta. No hay apuro.</p>'+(q.audio?'<button type="button" class="btn btn-peach" data-action="audio">▶ Escuchar '+(q.audio==="bell"?"sonido":"melodía")+'</button>':"")+'<div class="answer-list">'+optHTML+'</div>'+(state.hintText?'<div class="response-card"><strong>Una ayudita 🌼</strong><p>'+escape(state.hintText)+'</p></div>':"")+(state.answered?'<div class="response-card"><strong>¡Gracias por participar! 🌷</strong><p>'+escape(state.feedback)+'</p></div>':"")+'<div class="controls">'+(!state.answered?'<button class="btn btn-light" data-action="repeat">🔊 Repetir</button><button class="btn btn-light" data-action="hint">💡 Ayuda</button><button class="btn btn-light" data-action="unknown">🤍 No sé</button>':'<button class="btn btn-primary" data-action="next">Continuar →</button>')+'</div><div class="controls">'+(state.mode==="voice"?'<button class="btn btn-blue" data-action="listen">🎤 Hablar</button><button class="btn btn-light" data-action="toggle-mode">👆 Usar botones</button>':'<button class="btn btn-light" data-action="toggle-mode">🎤 Activar voz</button>')+'</div><div id="voice-status" class="status" role="status"></div></section></div>');}
function answer(idx){if(state.page!=="play"||state.answered)return;const q=getQuestion(),opts=questionOptions(q),choice=opts[idx];if(!choice)return;
 state.current.answered++;state.answered=true;
 if(q.kind==="opinion"){const v=clean(label(choice.o));state.feedback=v==="si"?"¡Qué lindo! Gracias por contármelo.":v==="no"?"Está muy bien, cada persona tiene sus gustos.":"No pasa nada. Lo importante es que compartimos este momento.";}
 else if(choice.original===q.correct){state.feedback="¡Qué bien! "+label(choice.o)+" es la respuesta.";}
 else{state.feedback="Lo hicimos juntos. La respuesta es "+label(q.options[q.correct])+". Podemos seguir cuando quieras.";}
 renderPlay();say(state.feedback+" ¿Seguimos?",state.mode==="voice");}
function unknown(){if(state.page!=="play"||state.answered)return;state.current.unknown++;const q=getQuestion();state.current.answered++;state.answered=true;state.feedback=q.kind==="opinion"?"Está bien. Gracias por compartir este momento.":"No pasa nada si no lo recordás. La respuesta es "+label(q.options[q.correct])+".";
 renderPlay();say(state.feedback+" ¿Seguimos?",state.mode==="voice");}
function hint(){if(state.page!=="play"||state.answered)return;const q=getQuestion();state.current.hints++;state.hintText=q.hint||"Escuchá las opciones otra vez y elegí la que prefieras.";renderPlay();say(state.hintText,state.mode==="voice");}
function next(){stopListening();stopSpeech();if(!state.game)return;state.index++;if(state.index>=state.game.questions.length){finish();return;}state.answered=false;state.hintText="";state.feedback="";renderPlay();if(state.mode==="voice")readQuestion();}
function finish(){stopListening();stopSpeech();if(state.current?.answered){const elapsed=Math.max(1,Math.round((Date.now()-state.current.started)/60000));state.sessions.push({game:state.current.name,count:state.current.answered,minutes:elapsed,hints:state.current.hints,unknown:state.current.unknown,at:new Date().toISOString()});save();}
 state.current=null;state.game=null;state.page="done";
 render('<section class="hero"><div class="hero-copy"><span class="kicker">🌻 Qué lindo momento</span><h1>¡Gracias por jugar!</h1><p>Hoy compartimos un rato de actividades. Podemos volver cuando quieras.</p><div class="cta-row"><button class="btn btn-primary" data-action="games">🎈 Otro juego</button><button class="btn btn-blue" data-action="home">🏡 Volver al inicio</button></div><p class="helper">No hay notas ni calificaciones. Lo importante es participar y disfrutar.</p><div id="voice-status" class="status" role="status"></div></div><div class="hero-art" role="img" aria-label="Flores de colores que celebran tu participación"><span style="font-size:150px" aria-hidden="true">💐</span></div></section>');
 if(state.mode==="voice")say("¡Gracias por jugar! ¿Querés elegir otro juego? Decí sí o no.",true);}
function reportText(){const arr=state.sessions;const count=arr.reduce((n,s)=>n+s.count,0),minutes=arr.reduce((n,s)=>n+s.minutes,0),hints=arr.reduce((n,s)=>n+s.hints,0);
 const freq={};arr.forEach(s=>freq[s.game]=(freq[s.game]||0)+1);const favorite=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Sin sesiones";
 return "EFG Cognitivo — Informe DEMO (no clínico)\nSesiones: "+arr.length+"\nActividades respondidas: "+count+"\nMinutos aproximados: "+minutes+"\nAyudas solicitadas: "+hints+"\nJuego más elegido: "+favorite+"\nDatos únicamente de demostración en este navegador. No representa una medición clínica.";}
function recordLocalMusic(data){state.sessions.push(data);save();}
function localMusicSettings(){window.EFGMusic?.setup({mode:state.mode,level:state.level,onBack:showFamily,onFinish:recordLocalMusic});}
function showFamily(){stopListening();stopSpeech();window.EFGMusic?.stop();state.page="family";const arr=state.sessions,minutes=arr.reduce((n,s)=>n+s.minutes,0),total=arr.reduce((n,s)=>n+s.answered,0),hints=arr.reduce((n,s)=>n+s.hints,0);
 const counts={};arr.forEach(s=>counts[s.game]=(counts[s.game]||0)+1);const favorite=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Todavía no hay datos";
 render('<div class="family-header"><div><div class="eyebrow">Panel de familia y cuidadores</div><h2>Actividad compartida</h2><p class="lead">Un resumen de las actividades realizadas en este navegador.</p></div><button class="subtle-button" data-action="home">← Inicio</button></div><div class="card"><h3>Adaptación inicial</h3><p>Elegí la presentación más cómoda. No representa un diagnóstico.</p><div class="pill-row"><button type="button" class="pill-select '+(state.level==="leve"?"active":"")+'" data-action="level" data-level="leve">Leve · 3 opciones</button><button type="button" class="pill-select '+(state.level==="moderado"?"active":"")+'" data-action="level" data-level="moderado">Moderado · 2 opciones</button></div></div><div class="controls"><button class="btn btn-peach" data-action="music-setup">🎵 Cargar canciones originales</button></div><div class="family-grid"><div class="metric"><strong>'+arr.length+'</strong><span>Sesiones</span></div><div class="metric"><strong>'+minutes+'</strong><span>Minutos aprox.</span></div><div class="metric"><strong>'+total+'</strong><span>Respuestas</span></div></div><div class="card"><h3>Preferencias y apoyos</h3><p><strong>Juego más elegido:</strong> '+escape(favorite)+'</p><p><strong>Ayudas pedidas:</strong> '+hints+'</p><p class="small-muted">Estos números describen el uso de la app, no la evolución de la enfermedad.</p><h3>Sesiones de demostración</h3>'+(arr.length?'<ul class="session-list">'+arr.slice().reverse().map(s=>'<li><span>'+escape(s.game)+'</span><span>'+s.answered+' actividades · '+s.minutes+' min</span></li>').join("")+'</ul>':'<p class="small-muted">Todavía no hay sesiones. Probá un juego y volvé para ver el resumen.</p>')+'<div class="controls"><button class="btn btn-primary" data-action="share">↗ Compartir resumen</button><button class="btn btn-light" data-action="clear">↺ Borrar datos demo</button></div><div id="family-status" class="status" role="status"></div></div><p class="notice">🔒 PROTOTIPO DEMO: los datos de participación se guardan únicamente en la sesión de este navegador. No se graban voces, no se envían informes automáticamente ni se almacenan datos identificables de pacientes. El reconocimiento de voz del navegador puede enviar audio a su proveedor. No uses datos reales en esta demostración. Faltan autenticación, consentimiento y controles de privacidad para usarlo con personas reales. La app no diagnostica ni sustituye atención médica; las actividades digitales propuestas no constituyen un tratamiento clínico validado.</p>');}
async function share(){const text=reportText();try{if(navigator.share){await navigator.share({title:"EFG Cognitivo — Resumen DEMO",text});}
 else if(navigator.clipboard){await navigator.clipboard.writeText(text);const s=document.getElementById("family-status");if(s)s.textContent="Resumen copiado. Podés pegarlo en un mensaje.";}
 else{const s=document.getElementById("family-status");if(s)s.textContent=text;}}catch(e){if(e.name!=="AbortError"){const s=document.getElementById("family-status");if(s)s.textContent="No se pudo compartir. Probá otra vez.";}}}
function playAudio(){const q=getQuestion();if(!q?.audio)return;
 const A=window.AudioContext||window.webkitAudioContext;if(!A){setStatus("Este navegador no reproduce audio generado.");return;}
 try{audioCtx=audioCtx||new A();if(audioCtx.state==="suspended")audioCtx.resume();
 const notes=q.audio==="bell"?Array(q.count).fill(880):q.notes||[440,523,440];const duration=q.audio==="bell"?.23:.28,spacing=q.audio==="bell"?.48:.37;const now=audioCtx.currentTime+.05;
 notes.forEach((freq,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=q.audio==="bell"?"sine":"triangle";osc.frequency.setValueAtTime(freq,now+i*spacing);gain.gain.setValueAtTime(.001,now+i*spacing);gain.gain.exponentialRampToValueAtTime(.18,now+i*spacing+.025);gain.gain.exponentialRampToValueAtTime(.001,now+i*spacing+duration);osc.connect(gain).connect(audioCtx.destination);osc.start(now+i*spacing);osc.stop(now+i*spacing+duration+.02);});setStatus("🔊 Reproduciendo sonido original.");}catch{setStatus("No pude reproducir el sonido. Podés continuar tocando.");}}
function toggleMode(){stopListening();stopSpeech();state.mode=state.mode==="voice"?"tap":"voice";if(state.page==="games")showGames();else if(state.page==="play"){renderPlay();if(state.mode==="voice")readQuestion();}else showWelcome();}
main.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action;
 switch(a){case"start-voice":state.mode="voice";showGames();break;case"start-tap":state.mode="tap";showGames();break;case"games":showGames();break;case"home":showWelcome();break;case"open":openGame(b.dataset.game);break;case"music-setup":localMusicSettings();break;case"answer":answer(Number(b.dataset.index));break;case"next":next();break;case"unknown":unknown();break;case"hint":hint();break;case"finish":finish();break;case"repeat":readQuestion();break;case"listen":listen();break;case"audio":playAudio();break;case"toggle-mode":toggleMode();break;case"level":state.level=b.dataset.level;save();showFamily();break;case"share":share();break;case"clear":state.sessions=[];save();showFamily();break;}
});
document.getElementById("home-link").addEventListener("click",e=>{e.preventDefault();showWelcome()});
document.getElementById("family-link").addEventListener("click",showFamily);
showWelcome();
})();