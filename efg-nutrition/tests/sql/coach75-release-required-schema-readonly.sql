-- COACH75: read-only, metadata-only prerequisite report for the PILOT release.
-- Does not examine rows, credentials, users, Storage bytes or medical history.
-- Executable on hosted Supabase for assessment ONLY; absolutely no DDL/DML.
-- Even all objects PRESENT would NOT mean a release GO (JWT A/B, RLS,
-- external OTP, legal content, production backup + rollback, mobile UAT).
with requirements(kind, object_name) as (
 values
  ('table','public.efg_legal_documents'),
  ('table','public.efg_legal_acceptances'),
  ('table','public.efg_coach_relaunch_intakes'),
  ('table','public.efg_student_plan_access'),
  ('table','public.efg_coach_plan_drafts'),
  ('table','public.efg_coach_plan_publish_receipts'),
  ('table','public.efg_notifications'),
  ('table','public.efg_science_intro_receipts'),
  ('function','public.efg_ack_science_intro(text,text)'),
  ('function','public.efg_legal_current_status()'),
  ('function','public.efg_accept_legal_documents(uuid[])'),
  ('function','public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)'),
  ('function','public.efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamp with time zone,integer,bigint)'),
  ('function','public.efg_publish_coach_plan_draft(uuid,bigint,uuid)')
), checks as (
 select kind,object_name,
  case when kind='table'
   then pg_catalog.to_regclass(object_name) is not null
   else pg_catalog.to_regprocedure(object_name) is not null end as present
 from requirements
)
select kind,object_name,present,
 case when present then 'STRUCTURE_PRESENT_NOT_AUTHORIZED'
  else 'REQUIRED_SCHEMA_MISSING_DO_NOT_ENABLE' end as status
from checks
order by kind,object_name;
