// Presentation only: consume existing totals, goal and guide availability.
// No storage, network, calorie estimates, plan generation or account mutations.
import {pastelDaySummary} from './pastel-day.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>';

export function studentDayWelcome(nickname,day){
 const parts=String(day||'').split('-');
 const date=parts.length===3?parts.reverse().join('/') : '';
 return '<header class="ncc-day-welcome"><div><div class="ncc-day-eyebrow">HOLA, '+escape(nickname||'')+'</div>'+
  '<h1>Tu día,<br><span>a tu ritmo.</span></h1><p>Sumá hábitos que puedas sostener.</p></div>'+
  '<div class="ncc-day-date">MI DÍA'+(date?'<time datetime="'+escape(day)+'">'+escape(date)+'</time>':'')+'</div></header>';
}

export function studentDayDashboard({totals,goal,diary,mealSlots,hasGuide=false}={}){
 return '<div class="ncc-day-dashboard">'+pastelDaySummary(totals,goal,diary,mealSlots)+
  '<section class="ncc-day-guide-card" aria-labelledby="nccDayGuideTitle">'+
  '<img src="./welcome-bowl.jpg" alt="" width="720" height="480" decoding="async" class="ncc-day-guide-photo">'+
  '<div class="ncc-day-guide-copy"><div class="ncc-day-eyebrow">TU GUÍA DE ALIMENTACIÓN</div>'+
  '<h2 id="nccDayGuideTitle">'+(hasGuide?'Comidas reales.<br><span>Un plan para vos.</span>':'Tu guía,<br><span>cuando esté lista.</span>')+'</h2>'+
  '<p>'+(hasGuide?'Consultá las comidas, porciones y alternativas de la guía de tu coach.':'Cuando tu coach publique una guía, la vas a encontrar acá.')+'</p>'+
  '<div class="ncc-day-guide-actions">'+(hasGuide?'<button type="button" class="btn ncc-day-primary" data-student-day-guide="1">Ver mi guía '+arrow+'</button>':'<button type="button" class="btn ncc-day-primary" data-tab="messages">Consultar con mi coach '+arrow+'</button>')+'<small>Foto ilustrativa</small></div></div></section></div>'+
  '<div class="ncc-day-register-row"><p>Tu guía orienta. Tus registros cuentan lo que comiste.</p><button type="button" class="btn ncc-day-primary" data-act="registerDayFood">Registrar comida '+arrow+'</button></div>';
}
