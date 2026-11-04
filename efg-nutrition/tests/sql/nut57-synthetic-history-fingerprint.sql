-- NUT-57 B3. Deterministic digest of ALL historical rows in the 16
-- FICTIONAL fixture tables only. No health/client data from production.
-- The CI test compares this digest before migration, after COMMIT, and after
-- destroying/rebuilding its ephemeral database from pg_dump/pg_restore.
select md5(jsonb_build_object(
 'auth_users',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from auth.users t),
 'orgs',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_organizations t),
 'profiles',(select coalesce(jsonb_agg(to_jsonb(t) order by t.user_id),'[]'::jsonb) from public.efg_profiles t),
 'consents',(select coalesce(jsonb_agg(to_jsonb(t) order by t.student_id),'[]'::jsonb) from public.efg_consents t),
 'goals',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_goals t),
 'plans',(select coalesce(jsonb_agg(to_jsonb(t) order by t.student_id),'[]'::jsonb) from public.efg_food_plans t),
 'notices',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_notifications t),
 'logs',(select coalesce(jsonb_agg(to_jsonb(t) order by t.student_id,t.log_day),'[]'::jsonb) from public.efg_daily_logs t),
 'weights',(select coalesce(jsonb_agg(to_jsonb(t) order by t.student_id,t.measured_on),'[]'::jsonb) from public.efg_weights t),
 'activities',(select coalesce(jsonb_agg(to_jsonb(t) order by t.student_id,t.activity_day),'[]'::jsonb) from public.efg_activities t),
 'habitual',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_habitual_meals t),
 'recipes',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_personal_recipes t),
 'invitations',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_invitations t),
 'messages',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_messages t),
 'payments',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_payments t),
 'weekly_reports',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.efg_weekly_reports t)
)::text) as synthetic_legacy_digest;
