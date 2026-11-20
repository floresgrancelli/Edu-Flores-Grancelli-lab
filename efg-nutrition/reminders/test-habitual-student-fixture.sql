create schema efg_private;
create function auth.role() returns text language sql stable as $$ select null::text $$;
create function efg_private.p29_qa_scope_required(uuid,text) returns boolean
language sql stable as $$ select true $$;
create table efg_private.coach_release_switches(switch_key text, enabled boolean);
insert into efg_private.coach_release_switches values ('pilot_student_diary_write_gate',true);
alter table public.efg_profiles add column organization_id uuid;
create table public.efg_organizations(id uuid, coach_id uuid);
create table public.efg_legal_documents(kind text,id uuid,version text,sha256 text,is_current boolean,published_at timestamptz,body text);
create table public.efg_legal_acceptances(user_id uuid,document_id uuid);
create table public.efg_pilot_participation_receipts(student_id uuid,organization_id uuid,version text,acceptance_method text,participation_accepted boolean,sharing_accepted boolean,accepted_at timestamptz,revoked_at timestamptz);
create table public.efg_coach_relaunch_intakes(student_id uuid,organization_id uuid,completed_version text,objective text,age_years numeric,height_cm numeric,weight_kg numeric,activity_level text,dietary_pattern text,shared_at timestamptz,updated_at timestamptz);
create table public.efg_consents(student_id uuid,organization_id uuid,accepted boolean);
create table public.efg_student_plan_access(student_id uuid,organization_id uuid,coach_id uuid,status text,published_goal_id uuid,published_at timestamptz,published_by uuid);
create table public.efg_food_plans(student_id uuid,coach_id uuid,guided_goal_id uuid,guided_plan_approved_at timestamptz,guided_plan jsonb);
create table public.efg_goals(id uuid,student_id uuid,approved_by uuid);
