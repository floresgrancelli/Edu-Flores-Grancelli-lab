import { generateSelfManagedPlan } from './self-management-engine.js';
import { guidedCountablePortion } from './guided-countable-portions.js';
import { FOOD_UNIT_PORTIONS } from './food-catalog.js';

const form = document.getElementById('intake'), status = document.getElementById('status');
const result = document.getElementById('result'), button = document.getElementById('generate');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const n = (v, digits = 0) => Number(v).toLocaleString('es-AR', { maximumFractionDigits: digits });
let snapshot, output, revision = 0;
try {
  snapshot = globalThis.NCC_SELF_PREVIEW_CATALOG || await fetch('../catalog/guide-catalog.json', { cache: 'no-store' }).then(r => {
    if (!r.ok) throw Error('No se pudo cargar el catálogo.'); return r.json();
  });
  const choices = Object.values(snapshot.foods).filter(f => f.unit === 'g' || f.unit === 'ml')
    .sort((a,b) => a.name.localeCompare(b.name, 'es'));
  document.getElementById('disliked').innerHTML = choices.map(f => '<option value="' + esc(f.id) + '">' + esc(f.name) + '</option>').join('');
} catch { status.textContent = 'No pudimos cargar los alimentos. Volvé a abrir la prueba.'; button.disabled = true; }

const resetResult = () => { revision++; output = null; result.hidden = true; result.replaceChildren(); status.textContent = ''; status.className = ''; };
form.addEventListener('input', resetResult);
form.addEventListener('change', resetResult);
document.getElementById('demo').addEventListener('click', () => {
  resetResult();
  for (const [key,value] of Object.entries({ age_years:35, height_cm:175, weight_kg:80,
    sex_for_equation:'male', activity_level:'light', dietary_pattern:'omnivore' }))
    form.elements[key].value = value;
  form.querySelector('[name="objective"]').value = '';
  // Consent is NEVER pre-selected by an example or a saved preference.
  form.elements.scope.checked = false; form.elements.consent.checked = false;
  for (const option of document.getElementById('disliked').options) option.selected = false;
  status.textContent = 'Ejemplo ficticio cargado. Elegí tu objetivo y revisá las dos confirmaciones antes de generar.';
});
document.getElementById('clear').addEventListener('click', () => { form.reset(); resetResult(); });

form.addEventListener('submit', async event => {
  event.preventDefault(); if (button.disabled || !form.reportValidity()) return;
  resetResult(); const ticket = revision;
  button.disabled = true; status.textContent = 'Calculando tus metas y preparando las comidas…';
  const fields = Object.fromEntries(new FormData(form));
  const data = { ...fields, processingConsent: fields.consent === 'on',
    pregnantOrBreastfeeding: fields.scope === 'on' ? false : null,
    clinicalCareRequired: fields.scope === 'on' ? false : null,
    eatingDisorderHistory: fields.scope === 'on' ? false : null,
    restrictionDeclaration: fields.scope === 'on' ? 'none_declared' : 'unknown',
    health_flags: [], disliked_food_ids: [...document.getElementById('disliked').selectedOptions].map(o => o.value),
    eating_window: 'regular' };
  await new Promise(resolve => setTimeout(resolve, 30));
  try {
    const generated = generateSelfManagedPlan(data, snapshot);
    if (ticket !== revision) return;
    output = generated; showResult(generated); status.textContent = 'Guía generada automáticamente en esta prueba. No se guardó ni envió a nadie.';
    result.scrollIntoView({ behavior:'smooth', block:'start' });
  } catch (error) {
    if (ticket !== revision) return;
    status.textContent = error.message; status.className = 'alert';
  } finally { button.disabled = false; }
});

function showResult(p) {
  status.className = '';
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
  result.querySelector('#edit').onclick = () => { resetResult(); form.scrollIntoView({ behavior:'smooth' }); };
  result.querySelector('#print').onclick = () => window.print();
  result.querySelectorAll('[data-meal]').forEach(tab => tab.onclick = () => {
    result.querySelectorAll('[data-meal]').forEach(other => other.setAttribute('aria-selected', String(other===tab)));
    result.querySelectorAll('.meal-panel').forEach(panel => { panel.hidden = panel.id !== 'meal-' + tab.dataset.meal; });
  });
}
