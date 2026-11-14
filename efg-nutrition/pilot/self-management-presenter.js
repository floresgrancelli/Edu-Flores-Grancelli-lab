import { guidedCountablePortion } from './guided-countable-portions.js?v=ncc-micro-restaurants-r1-20261114';
import { FOOD_UNIT_PORTIONS } from './food-catalog.js?v=ncc-micro-restaurants-r1-20261114';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(v,digits=0)=>Number(v).toLocaleString('es-AR',{maximumFractionDigits:digits});
export function showSelfManagedResult(result,p,{onEdit=()=>{},onPrint=()=>window.print()}={}) {
  const totals = p.totals.totals;
  const metrics = [['Energía',totals.k,'kcal'],['Proteínas',totals.p,'g'],['Hidratos',totals.c,'g'],['Grasas',totals.f,'g']];
  result.innerHTML = '<section class="card"><span class="eyebrow">TU GUÍA ESTÁ LISTA</span><h2>Un día organizado para vos</h2><p class="muted">' + esc(p.notice) + '</p><div class="metrics">' +
    metrics.map(([label,value,unit]) => '<div class="metric"><small>' + label + '</small><strong>' + n(value) + ' <small style="display:inline">' + unit + '</small></strong></div>').join('') +
    '</div><p class="muted"><small>Meta: ' + n(p.goal.kcal) + ' kcal · P ' + p.goal.protein_g + ' g · H ' + p.goal.carb_g + ' g · G ' + p.goal.fat_g + ' g. Fibra estimada del menú: ' + n(totals.fi,1) + ' g.</small></p>' +
    '<div class="actions"><button class="btn secondary" type="button" id="edit">Modificar mi ficha</button><button class="btn secondary" type="button" id="print">Imprimir / PDF</button></div></section>' +
    '<nav class="meal-tabs" role="tablist" aria-label="Comidas de mi guía">' + p.guide.meals.map((m,i) => '<button id="tab-' + m.slot + '" type="button" role="tab" aria-selected="' + (i===0) + '" aria-controls="meal-' + m.slot + '" data-meal="' + m.slot + '">' + esc(m.label) + '</button>').join('') + '</nav>' +
    p.guide.meals.map((meal,i) => '<section id="meal-' + meal.slot + '" class="card meal-panel" role="tabpanel" aria-labelledby="tab-' + meal.slot + '"' + (i===0?'':' hidden') + '><h2>' + esc(meal.label) + '</h2>' +
      meal.items.map(food => {
        const countable = guidedCountablePortion(food.id);
        const amount = countable ? n(food.qty / countable.grams,1) + ' × ' + FOOD_UNIT_PORTIONS[food.id].label + ' (' + n(food.qty,1) + ' g)' : n(food.qty,1) + ' ' + food.unit;
        return '<div class="food"><span>' + esc(food.name) + '</span><strong>' + esc(amount) + '</strong></div>';
      }).join('') + '<p><small>Las cantidades corresponden a la preparación indicada en el nombre del alimento. Pesos comestibles estimados.</small></p></section>').join('') +
    '<section class="card"><h3>Cómo se calculó</h3><p class="muted">Mifflin–St Jeor · reposo estimado ' + n(p.estimate.rmr) + ' kcal · mantenimiento estimado ' + n(p.estimate.maintenance) + ' kcal.</p><p class="muted">La energía y cada macro del menú están a menos del 2% de las metas calculadas. Los alimentos son estimaciones de catálogo; esto no garantiza la cobertura de todos los micronutrientes.</p></section>';
  result.hidden = false;
  result.querySelector('#edit').onclick = onEdit;
  result.querySelector('#print').onclick = onPrint;
  result.querySelectorAll('[data-meal]').forEach(tab => tab.onclick = () => {
    result.querySelectorAll('[data-meal]').forEach(other => other.setAttribute('aria-selected', String(other===tab)));
    result.querySelectorAll('.meal-panel').forEach(panel => { panel.hidden = panel.id !== 'meal-' + tab.dataset.meal; });
  });
}
