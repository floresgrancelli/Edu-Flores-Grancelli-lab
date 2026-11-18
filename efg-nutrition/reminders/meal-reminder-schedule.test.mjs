import test from 'node:test';
import assert from 'node:assert/strict';
import { dueMealReminders } from './meal-reminder-schedule.mjs';

const input = {
 now: new Date('2026-11-19T00:10:00Z'),
 timeZone: 'America/Argentina/Buenos_Aires',
 preferences: [{ meal: 'cena', enabled: true, at: '21:10' }],
 loggedMeals: {},
};
test('sends at local time on the local date', () => {
 assert.deepEqual(dueMealReminders(input), [
  { date: '2026-11-18', meal: 'cena', deliveryKey: '2026-11-18:cena' },
 ]);
});
test('skips meals already recorded, disabled reminders and other times', () => {
 assert.deepEqual(dueMealReminders({ ...input, loggedMeals: { '2026-11-18': ['cena'] } }), []);
 assert.deepEqual(dueMealReminders({ ...input, preferences: [{ ...input.preferences[0], enabled: false }] }), []);
 assert.deepEqual(dueMealReminders({ ...input, now: new Date('2026-11-19T00:11:00Z') }), []);
});
test('deduplicates a meal within the same dispatch', () => {
 assert.equal(dueMealReminders({ ...input, preferences: [...input.preferences, ...input.preferences] }).length, 1);
});
