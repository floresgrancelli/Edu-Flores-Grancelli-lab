const CATALOG_MINIMUM = 30;
const options = ['hombre', 'mujer'];
const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric', month: '2-digit', day: '2-digit',
});
const epoch = Date.UTC(2026, 0, 1);
const dayMs = 86400000;

export function workoutPerfumesForDay(catalog, now = new Date()) {
  const parts = Object.fromEntries(localDate.formatToParts(now).map(({type, value}) => [type, value]));
  const date = parts.year + '-' + parts.month + '-' + parts.day;
  const dayIndex = Math.floor((Date.UTC(+parts.year, +parts.month - 1, +parts.day) - epoch) / dayMs);
  const lists = options.map(option => catalog.filter(item => item.option === option));
  if (lists.some(list => list.length < CATALOG_MINIMUM) ||
      new Set(catalog.map(item => item.id)).size !== catalog.length) return null;
  return {
    date,
    hombre: lists[0][((dayIndex % lists[0].length) + lists[0].length) % lists[0].length],
    mujer: lists[1][((dayIndex % lists[1].length) + lists[1].length) % lists[1].length],
  };
}
