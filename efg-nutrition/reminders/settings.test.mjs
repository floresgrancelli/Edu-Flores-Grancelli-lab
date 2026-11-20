import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createMealReminderPreferencesClient } from '../pilot/meal-reminder-preferences.js';

const owner = 'test-owner';
const ui = await readFile(new URL('../pilot/pilot.js', import.meta.url), 'utf8');
const handler = ui.slice(ui.indexOf('async function handleMealReminderSettings('), ui.indexOf('function settingsView()'));

function fakeClient(error = null) {
 const updates = [];
 const db = {
  from(table) {
   assert.equal(table, 'efg_meal_reminder_preferences');
   return { update(values) {
    const filters = [];
    updates.push({ values, filters });
    return { eq(column, value) { filters.push([column, value]); return this; }, then(resolve) { return resolve({ error }); } };
   } };
  }
 };
 return { db, updates };
}

function settings(client) {
 const checks = [{ checked:false }, { checked:true }];
 const hours = { disabled:false, querySelectorAll:() => checks };
 const status = { textContent:'' };
 const panel = { isConnected:true, dataset:{}, querySelector:selector => selector==='[data-reminder-hours]'?hours:status };
 const button = Object.assign(checks[0], {
  disabled:false,
  closest:selector => selector==='[data-meal-reminder-settings]'?panel:{ dataset:{ meal:'almuerzo', reminderMeal:'almuerzo' } },
 });
 const run = new Function('reminderPublicKey', 'state', 'createMealReminderPreferencesClient', 'sb',
  handler+'\nreturn handleMealReminderSettings;')(
  ()=>'public-key', { tab:'settings', session:{ user:{ id:owner } } }, createMealReminderPreferencesClient, client
 );
 return { checks, hours, status, button, run };
}

test('unchecking a meal immediately disables it without reading or overwriting its time', async () => {
 const { db, updates } = fakeClient();
 const view = settings(db);
 assert.match(ui, /if\(!e\.target\.checked\)void handleMealReminderSettings\(e\.target,"disableMealReminder"\)/);
 await view.run(view.button, 'disableMealReminder');
 assert.deepEqual(updates, [{ values:{ enabled:false }, filters:[['user_id',owner],['enabled',true],['meal','almuerzo']] }]);
 assert.equal(view.checks[0].checked, false);
 assert.equal(view.checks[1].checked, true);
 assert.equal(view.status.textContent, 'Aviso desactivado.');
});

test('disabling all meal notices preserves their saved scheduling fields', async () => {
 const { db, updates } = fakeClient();
 const view = settings(db);
 await view.run(view.button, 'disableAllMealReminders');
 assert.deepEqual(updates, [{ values:{ enabled:false }, filters:[['user_id',owner],['enabled',true]] }]);
 assert.ok(view.checks.every(input => !input.checked));
 assert.equal(view.hours.disabled, false);
});

test('a failed opt-out restores the checkbox and displays the failure', async () => {
 const { db } = fakeClient(new Error('offline'));
 const view = settings(db);
 await view.run(view.button, 'disableMealReminder');
 assert.equal(view.button.checked, true);
 assert.match(view.status.textContent, /No pudimos desactivar/);
 assert.equal(view.hours.disabled, false);
});
