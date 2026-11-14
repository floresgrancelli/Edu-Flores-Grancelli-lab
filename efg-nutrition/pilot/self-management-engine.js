// Shared Web/Android engine. No coach authorization, network or diary mutations.
import { estimateMacros } from './macro-engine.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import { generateFlexibleGuidedDay, guideFoodSignal } from './guided-day-v2.js?v=ncc-alcohol-r1-20261114';
import { guideTotals, guideDeviation, validateGuidedDay } from './guided-day.js?v=ncc-alcohol-r1-20261114';

export const SELF_MANAGEMENT_VERSION = 'self-management-r1-20261113';
export const SELF_PATTERNS = Object.freeze(['omnivore', 'vegetarian', 'vegan']);
const activity = { low: 1.2, light: 1.35, moderate: 1.5 };
const reject = (code, message) => { throw Object.assign(new Error(message), { code }); };
const number = (value, field) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean')
    reject('incomplete', 'Completá ' + field + ' para calcular tu guía.');
  const n = Number(value);
  if (!Number.isFinite(n)) reject('invalid', 'Revisá ' + field + '.');
  return n;
};

export function selfManagementEligibility(input = {}) {
  if (input.processingConsent !== true) reject('consent_required', 'Necesitamos tu autorización para procesar esta ficha.');
  const age = number(input.age_years, 'la edad');
  if (!Number.isInteger(age) || age < 18 || age > 90)
    reject('outside_scope', 'Este cálculo general está preparado para adultos de 18 a 90 años.');
  if (input.pregnantOrBreastfeeding !== false || input.clinicalCareRequired !== false ||
    input.eatingDisorderHistory !== false || input.restrictionDeclaration !== 'none_declared' ||
    !Array.isArray(input.health_flags) || input.health_flags.length !== 0)
    reject('outside_scope', 'Con esta información no podemos generar una guía general automática. Podés seguir buscando un profesional o revisar la ficha.');
  const height = number(input.height_cm, 'la altura'), weight = number(input.weight_kg, 'el peso');
  const bmi = weight / (height / 100) ** 2;
  if (bmi < 18.5) reject('outside_scope', 'La guía automática inicial no cubre bajo peso.');
  if (!['male', 'female'].includes(input.sex_for_equation))
    reject('incomplete', 'Elegí el parámetro fisiológico de la ecuación; no lo inferimos de tu cuenta.');
  if (!Object.hasOwn(activity, input.activity_level)) reject('incomplete', 'Elegí tu actividad habitual.');
  if (!['fat_loss', 'recomp', 'muscle_gain', 'maintenance'].includes(input.objective)) reject('incomplete', 'Elegí tu objetivo.');
  if (!SELF_PATTERNS.includes(input.dietary_pattern))
    reject('pattern_pending', 'Ese patrón todavía no está preparado para entrega automática sin revisión.');
  if (!Array.isArray(input.disliked_food_ids) || input.disliked_food_ids.length > 100 ||
    input.disliked_food_ids.some(id => typeof id !== 'string') ||
    new Set(input.disliked_food_ids).size !== input.disliked_food_ids.length)
    reject('invalid_preferences', 'Revisá los alimentos que preferís evitar.');
  // First automatic release uses regular meals. Do not silently change a window.
  if (input.eating_window !== 'regular') reject('window_pending', 'El ayuno está pendiente de validar para autogestión. Conservamos tu elección.');
  return { age, height, weight, bmi, activity: activity[input.activity_level] };
}

export function generateSelfManagedPlan(input, snapshot) {
  const eligible = selfManagementEligibility(input);
  if (!/^ncc-catalog-[a-f0-9]{16}$/.test(snapshot?.version || '') || !snapshot.foods ||
    Array.isArray(snapshot.foods)) reject('catalog_invalid', 'No pudimos verificar el catálogo de alimentos.');
  const catalog = Object.values(snapshot.foods);
  const ids = new Set(catalog.map(f => f.id));
  if (catalog.length === 0 || ids.size !== catalog.length || input.disliked_food_ids.some(id => !ids.has(id)))
    reject('catalog_invalid', 'Hay alimentos sin identificar; revisá tu selección.');
  const estimate = estimateMacros({ ...eligible, sex: input.sex_for_equation,
    goal: input.objective === 'maintenance' ? 'recomp' : input.objective,
    model: 'mifflin', proteinPerKg: null, fatPerKg: .8,
    recompMode: input.objective === 'maintenance' ? 'maintenance' : 'deficit05' });
  const goal = { goal_type: input.objective, kcal: estimate.kcal, protein_g: estimate.protein,
    carb_g: estimate.carbs, fat_g: estimate.fat, fiber_g: estimate.fiber };
  const profile = { patternId: input.dietary_pattern, restrictionStatus: 'none_declared',
    restrictions: [], dislikedIds: [...input.disliked_food_ids], windowId: 'regular' };
  const plan = generateFlexibleGuidedDay(catalog, goal, profile);
  if (plan.profileReviewNotes?.length || plan.meals.flatMap(m => m.items)
    .some(item => guideFoodSignal(item, profile).status !== 'possible'))
    reject('composition_unavailable', 'No conseguimos una guía compatible con tu ficha. No se envió ningún plan.');
  validateGuidedDay(plan, goal);
  const deviations = guideDeviation(plan, goal);
  if (Object.values(deviations).some(d => d.percent === null || Math.abs(d.percent) >= 2))
    reject('targets_unmatched', 'No conseguimos ajustar esta guía a tus objetivos. No cambiamos las metas ni enviamos un menú desajustado.');
  // Never copy the coach approval labels emitted by the shared legacy template.
  const guide = { ...plan, createdFrom: 'self_managed_estimate', coachReviewed: false,
    catalogVersion: snapshot.version, estimationMethod: 'mifflin',
    automationVersion: SELF_MANAGEMENT_VERSION };
  return { version: SELF_MANAGEMENT_VERSION, goal, guide, totals: guideTotals(guide), deviations,
    estimate: { ...estimate, goal: input.objective },
    notice: 'Guía orientativa generada automáticamente. No fue revisada por un coach y no es un tratamiento médico.' };
}

/** Server orchestration contract; callbacks must enforce signed ownership/RLS.
 * No target userId is accepted from a browser. Publication is one atomic write
 * with source revision/mode checks; never call the Coach approval RPCs.
 */
export function createSelfManagementService({ readIdentity, readAccount, readIntake,
  readCatalog, saveAtomic, readSaved } = {}) {
  if (![readIdentity, readAccount, readIntake, readCatalog, saveAtomic, readSaved]
    .every(fn => typeof fn === 'function')) reject('backend_pending', 'Falta conectar el guardado privado de autogestión.');
  return {
    async generate({ requestId } = {}) {
      if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) reject('invalid_request', 'Solicitud inválida.');
      const identity = await readIdentity();
      if (!identity?.id) reject('auth_required', 'Ingresá a tu cuenta para continuar.');
      const account = await readAccount(identity.id);
      if (account?.user_id !== identity.id || account.mode !== 'independent' ||
        account.active !== true || account.coach_id !== null)
        reject('mode_mismatch', 'Este circuito es exclusivo de tu cuenta de autogestión sin coach.');
      const row = await readIntake(identity.id);
      if (row?.user_id !== identity.id || !Number.isSafeInteger(row.revision) || row.revision < 1)
        reject('intake_missing', 'Falta tu ficha privada vigente.');
      const result = generateSelfManagedPlan(row.data, await readCatalog());
      // Must verify mode and intake revision inside this transaction on server.
      const receipt = await saveAtomic({ userId: identity.id, requestId,
        expectedIntakeRevision: row.revision, expectedMode: 'independent', result });
      if (receipt?.userId !== identity.id || receipt.requestId !== requestId || receipt.persisted !== true)
        reject('not_saved', 'No pudimos confirmar el guardado. No mostramos la guía como enviada.');
      const saved = await readSaved(identity.id, requestId);
      if (saved?.userId !== identity.id || saved.requestId !== requestId ||
        saved.intakeRevision !== row.revision || !saved.result?.guide)
        reject('not_saved', 'No se pudo releer la guía guardada.');
      const current = await readIdentity();
      if (current?.id !== identity.id) reject('session_changed', 'Cambió la sesión.');
      return saved;
    },
  };
}
