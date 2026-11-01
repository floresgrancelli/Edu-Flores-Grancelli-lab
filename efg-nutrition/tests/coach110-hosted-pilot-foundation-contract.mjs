// COACH106-110 database migration and preview contract. Static only; hosted
// catalog and two-org signed JWT / physical mobile checks remain separate.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8');
const receipt=file('20261030_coach_pilot_participation_server_receipts.sql');
const intake=file('20261030_coach_relaunch_general_pilot_intake.sql');
const draft=file('20261030_coach_versioned_private_plan_drafts.sql');
const access=file('20261030_coach_plan_publication_access_pending.sql');
const notice=file('20261030_coach_intake_notification_on_share.sql');
for(const [name,sql] of Object.entries({receipt,intake,draft,access,notice})){
 assert.match(sql,/enable row level security|create function efg_private\.coach_notify_shared_relaunch_intake\(\)/,
  name+': expected server-side authorization or private notification');
 assert.doesNotMatch(sql,/nut57_isolated_staging_marker/,'Do not execute staging-only scripts on hosted!');
 assert.doesNotMatch(sql,/\bdelete from public\.efg_(?:daily_logs|goals|habitual_meals|profiles)/i);
}
assert.match(receipt,/p_participation is distinct from true or p_sharing is null/);
assert.doesNotMatch(receipt,/sharing_accepted boolean not null check \(sharing_accepted=true\)/);
assert.match(intake,/Separate pilot coach-sharing permission required/);
assert.match(receipt,/revoked_at=null/);
assert.match(receipt,/auth\.uid\(\)/);
assert.match(receipt,/revoke all on public\.efg_pilot_participation_receipts from public,anon,authenticated/);
assert.match(intake,/completed_version/);
assert.match(intake,/efg_pilot_participation_receipts/);
assert.match(intake,/'keto'/);
assert.match(intake,/'16_8'/);
assert.match(intake,/p_expected_revision/);
assert.doesNotMatch(intake,/efg_legal_current_status/,'General intake must not depend on unavailable legal staging RPC');
assert.doesNotMatch(intake,/allergy_details|health_flags/,'No clinical records in general intake');
assert.match(draft,/coach_draft_read_own/);
assert.match(draft,/efg_private\.coach_has_student/);
assert.match(draft,/receipt\.revoked_at is null and consent\.accepted/);
assert.match(draft,/draft_revision=draft_revision\+1/);
assert.doesNotMatch(draft,/insert into public\.efg_goals/,'Draft cannot publish a goal');
assert.match(access,/status text not null default 'pending'/);
assert.match(access,/'pending'/);
assert.doesNotMatch(access,/status='published'[\s\S]*on conflict/i,'No historic student is auto-unlocked');
assert.match(access,/revoke all on public\.efg_student_plan_access from public,anon,authenticated/);
assert.match(notice,/new\.shared_at is null then return new/);
assert.match(notice,/r\.revoked_at is null/);
assert.match(notice,/on conflict\(recipient_id,event_key\) do nothing/);
assert.doesNotMatch(notice,/new\.conditions|new\.notes/,'No private health or notes in coach notification');
console.log('PASS COACH106-110 candidate migrations: private opt-out, explicit coach sharing, pending-only access and RLS; hosted staging not applied.');
