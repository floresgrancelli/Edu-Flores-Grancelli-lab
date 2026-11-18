const meals = new Set(['desayuno', 'media_manana', 'almuerzo', 'merienda', 'cena', 'media_tarde']);

// Evaluate each UTC minute in the user's time zone. The delivery key stays the
// same if a local minute repeats when clocks go back.
export function dueMealReminders({ now, timeZone, preferences, loggedMeals }) {
 const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
 }).formatToParts(now);
 const local = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
 const date = `${local.year}-${local.month}-${local.day}`;
 const time = `${local.hour}:${local.minute}`;
 const recorded = new Set(loggedMeals[date] ?? []);
 return [...new Set(preferences.filter(({ meal, enabled, at }) =>
  enabled && meals.has(meal) && at === time && !recorded.has(meal)
 ).map(({ meal }) => meal))].map(meal => ({ date, meal, deliveryKey: `${date}:${meal}` }));
}
