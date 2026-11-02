-- GENERATED LOCAL ONLY. Exact observed types/defaults/constraints/policies; support profiles/org are explicit fixture.
BEGIN; SET LOCAL search_path=public,pg_catalog; CREATE SCHEMA efg_private;

create table public.efg_organizations(
 id uuid primary key, coach_id uuid not null references auth.users(id)
);

create table public.efg_profiles(
 user_id uuid primary key references auth.users(id),
 organization_id uuid references public.efg_organizations(id),
 role text not null check(role in ('student','coach','admin')),
 active boolean not null default true
);

alter table public.efg_organizations
  alter column coach_id drop not null,
  add column name text not null,
  add column seat_limit integer not null default 5 check(seat_limit between 1 and 10000),
  add column payment_alias text,
  add column status text not null default 'trial'
    check(status in ('trial','active','grace','suspended')),
  add column created_at timestamptz not null default now(),
  add column is_test boolean not null default false,
  add column license_fee_ars numeric(12,2)
    check(license_fee_ars is null or license_fee_ars between 0.01 and 10000000),
  add column paid_through date,
  add column plan_updated_at timestamptz not null default now(),
  add constraint efg_organizations_coach_id_key unique(coach_id);

alter table public.efg_profiles
  add column email text not null unique,
  add column nickname text not null check(length(nickname) between 2 and 70),
  add column created_at timestamptz not null default now(),
  add constraint profile_org_role check(
    (role='student' and organization_id is not null)
    or (role<>'student' and organization_id is null)
  );

CREATE TABLE "efg_private"."coach_release_switches"("switch_key" text NOT NULL,
"enabled" boolean DEFAULT false NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
"notes" text DEFAULT ''::text NOT NULL);

CREATE TABLE "efg_private"."coach_reviewed_foods"("food_id" text NOT NULL,
"catalog_version" text NOT NULL,
"unit" text NOT NULL,
"k" numeric NOT NULL,
"p" numeric NOT NULL,
"c" numeric NOT NULL,
"f" numeric NOT NULL,
"fi" numeric NOT NULL,
"source_kind" text NOT NULL,
"source_url" text NOT NULL,
"evidence_id" text NOT NULL,
"evidence_status" text DEFAULT 'pending'::text NOT NULL,
"reviewed_by" uuid,
"reviewed_at" timestamp with time zone,
"expires_at" timestamp with time zone);

CREATE TABLE "public"."efg_coach_plan_drafts"("student_id" uuid NOT NULL,
"organization_id" uuid NOT NULL,
"coach_id" uuid NOT NULL,
"source_intake_updated_at" timestamp with time zone NOT NULL,
"source_intake_revision" integer NOT NULL,
"goal_proposal" jsonb NOT NULL,
"guide_proposal" jsonb,
"draft_revision" bigint DEFAULT 1 NOT NULL,
"status" text DEFAULT 'draft'::text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "public"."efg_coach_relaunch_intakes"("student_id" uuid NOT NULL,
"organization_id" uuid NOT NULL,
"completed_version" text NOT NULL,
"revision" integer DEFAULT 1 NOT NULL,
"objective" text,
"age_years" integer,
"height_cm" numeric,
"weight_kg" numeric,
"activity_level" text,
"dietary_pattern" text,
"eating_window" text DEFAULT 'regular'::text NOT NULL,
"preferred_foods" text DEFAULT ''::text NOT NULL,
"disliked_foods" text DEFAULT ''::text NOT NULL,
"meal_routine" text DEFAULT ''::text NOT NULL,
"notes" text DEFAULT ''::text NOT NULL,
"shared_at" timestamp with time zone,
"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "public"."efg_consents"("student_id" uuid NOT NULL,
"organization_id" uuid NOT NULL,
"accepted" boolean DEFAULT false NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
"email_report_opt_in" boolean DEFAULT false NOT NULL);

CREATE TABLE "public"."efg_food_plans"("student_id" uuid NOT NULL,
"coach_id" uuid NOT NULL,
"approved_food_ids" text[] DEFAULT '{}'::text[] NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
"guided_plan" jsonb,
"guided_goal_id" uuid,
"guided_plan_approved_at" timestamp with time zone);

CREATE TABLE "public"."efg_goals"("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"student_id" uuid NOT NULL,
"approved_by" uuid NOT NULL,
"goal_type" text NOT NULL,
"kcal" integer NOT NULL,
"protein_g" integer NOT NULL,
"carb_g" integer NOT NULL,
"fat_g" integer NOT NULL,
"fiber_g" integer NOT NULL,
"start_on" date DEFAULT CURRENT_DATE NOT NULL,
"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
"estimation_method" text,
"activity_factor" numeric,
"protein_per_kg" numeric,
"fat_per_kg" numeric);

CREATE TABLE "public"."efg_legal_acceptances"("user_id" uuid NOT NULL,
"document_id" uuid NOT NULL,
"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
"acceptance_method" text DEFAULT 'explicit_checkbox'::text NOT NULL);

CREATE TABLE "public"."efg_legal_documents"("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"kind" text NOT NULL,
"version" text NOT NULL,
"body" text NOT NULL,
"sha256" text NOT NULL,
"is_current" boolean DEFAULT false NOT NULL,
"published_at" timestamp with time zone,
"created_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "public"."efg_notifications"("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"recipient_id" uuid NOT NULL,
"actor_id" uuid,
"kind" text NOT NULL,
"event_key" text NOT NULL,
"title" text NOT NULL,
"body" text DEFAULT ''::text NOT NULL,
"target_tab" text DEFAULT 'home'::text NOT NULL,
"target_student" uuid,
"is_read" boolean DEFAULT false NOT NULL,
"read_at" timestamp with time zone,
"created_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "public"."efg_pilot_participation_receipts"("student_id" uuid NOT NULL,
"organization_id" uuid NOT NULL,
"version" text NOT NULL,
"participation_accepted" boolean NOT NULL,
"sharing_accepted" boolean NOT NULL,
"acceptance_method" text DEFAULT 'two_explicit_checkboxes'::text NOT NULL,
"accepted_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
"revoked_at" timestamp with time zone,
"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL);

CREATE TABLE "public"."efg_student_plan_access"("student_id" uuid NOT NULL,
"organization_id" uuid NOT NULL,
"coach_id" uuid NOT NULL,
"status" text DEFAULT 'pending'::text NOT NULL,
"published_goal_id" uuid,
"published_at" timestamp with time zone,
"published_by" uuid,
"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL);

CREATE TABLE "public"."efg_sunday_rewards"("student_id" uuid NOT NULL,
"week_monday" date NOT NULL,
"coach_id" uuid NOT NULL,
"approved" boolean DEFAULT false NOT NULL,
"approved_at" timestamp with time zone,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL);

ALTER TABLE "efg_private"."coach_release_switches" ADD CONSTRAINT "coach_release_switches_pkey" PRIMARY KEY (switch_key);

ALTER TABLE "efg_private"."coach_release_switches" ADD CONSTRAINT "coach_release_switches_switch_key_check" CHECK ((switch_key ~ '^[a-z][a-z0-9_]{5,90}$'::text));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_c_check" CHECK (((c >= (0)::numeric) AND (c <= (1)::numeric)));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_catalog_version_check" CHECK ((catalog_version ~ '^[a-zA-Z0-9._-]{3,80}$'::text));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_check" CHECK (((evidence_status <> 'reviewed'::text) OR ((reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL) AND (expires_at IS NOT NULL) AND (expires_at > reviewed_at))));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_evidence_id_check" CHECK ((evidence_id ~ '^[a-zA-Z0-9_-]{8,120}$'::text));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_evidence_id_key" UNIQUE (evidence_id);

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_evidence_status_check" CHECK ((evidence_status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'rejected'::text])));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_f_check" CHECK (((f >= (0)::numeric) AND (f <= (1)::numeric)));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_fi_check" CHECK (((fi >= (0)::numeric) AND (fi <= (1)::numeric)));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_food_id_check" CHECK ((food_id ~ '^[a-zA-Z0-9_-]{1,100}$'::text));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_k_check" CHECK (((k >= (0)::numeric) AND (k <= (12)::numeric)));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_p_check" CHECK (((p >= (0)::numeric) AND (p <= (1)::numeric)));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_pkey" PRIMARY KEY (food_id);

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_source_kind_check" CHECK ((source_kind = ANY (ARRAY['manufacturer_label'::text, 'official_product'::text, 'validated_composition'::text])));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_source_url_check" CHECK ((source_url ~ '^https://[^[:space:]]{8,1990}$'::text));

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_unit_check" CHECK ((unit = ANY (ARRAY['g'::text, 'ml'::text])));

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_draft_goal_shape" CHECK (((jsonb_typeof(goal_proposal) = 'object'::text) AND (octet_length((goal_proposal)::text) <= 8000)));

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_draft_guide_shape" CHECK (((guide_proposal IS NULL) OR ((jsonb_typeof(guide_proposal) = 'object'::text) AND (octet_length((guide_proposal)::text) <= 30000))));

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_plan_drafts_draft_revision_check" CHECK ((draft_revision > 0));

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_plan_drafts_pkey" PRIMARY KEY (student_id);

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_plan_drafts_source_intake_revision_check" CHECK ((source_intake_revision >= 1));

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_plan_drafts_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_activity_level_check" CHECK (((activity_level IS NULL) OR (activity_level = ANY (ARRAY['low'::text, 'light'::text, 'moderate'::text, 'high'::text]))));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_age_years_check" CHECK (((age_years >= 18) AND (age_years <= 100)));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_completed_version_check" CHECK ((completed_version ~ '^[a-z0-9_]{5,80}$'::text));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_dietary_pattern_check" CHECK (((dietary_pattern IS NULL) OR (dietary_pattern = ANY (ARRAY['omnivore'::text, 'mediterranean'::text, 'dash'::text, 'vegetarian'::text, 'vegan'::text, 'pescatarian'::text, 'flexitarian'::text, 'portfolio'::text, 'low_carb'::text, 'keto'::text, 'other'::text]))));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_disliked_foods_check" CHECK ((char_length(disliked_foods) <= 400));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_eating_window_check" CHECK ((eating_window = ANY (ARRAY['regular'::text, '12_12'::text, '14_10'::text, '16_8'::text])));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_height_cm_check" CHECK (((height_cm >= (100)::numeric) AND (height_cm <= (250)::numeric)));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_meal_routine_check" CHECK ((char_length(meal_routine) <= 400));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_notes_check" CHECK ((char_length(notes) <= 1000));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_objective_check" CHECK (((objective IS NULL) OR (objective = ANY (ARRAY['fat_loss'::text, 'recomp'::text, 'muscle_gain'::text, 'maintenance'::text, 'general'::text]))));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_pkey" PRIMARY KEY (student_id, completed_version);

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_preferred_foods_check" CHECK ((char_length(preferred_foods) <= 400));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_revision_check" CHECK (((revision >= 1) AND (revision <= 100000)));

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_weight_kg_check" CHECK (((weight_kg >= (20)::numeric) AND (weight_kg <= (400)::numeric)));

ALTER TABLE "public"."efg_consents" ADD CONSTRAINT "efg_consents_pkey" PRIMARY KEY (student_id);

ALTER TABLE "public"."efg_food_plans" ADD CONSTRAINT "approved_food_ids_limit" CHECK (((cardinality(approved_food_ids) >= 1) AND (cardinality(approved_food_ids) <= 300)));

ALTER TABLE "public"."efg_food_plans" ADD CONSTRAINT "efg_food_plans_pkey" PRIMARY KEY (student_id);

ALTER TABLE "public"."efg_food_plans" ADD CONSTRAINT "efg_guided_plan_shape" CHECK (((guided_plan IS NULL) OR ((jsonb_typeof(guided_plan) = 'object'::text) AND ((guided_plan ->> 'kind'::text) = 'five_meal_example'::text) AND (jsonb_typeof((guided_plan -> 'meals'::text)) = 'array'::text) AND (jsonb_array_length((guided_plan -> 'meals'::text)) = 5) AND (octet_length((guided_plan)::text) < 30000) AND (guided_goal_id IS NOT NULL) AND (guided_plan_approved_at IS NOT NULL))));

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_carb_g_check" CHECK (((carb_g >= 0) AND (carb_g <= 2000)));

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_estimation_method_check" CHECK (((estimation_method IS NULL) OR (estimation_method = ANY (ARRAY['mifflin'::text, 'tenhaaf'::text]))));

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_fat_g_check" CHECK (((fat_g >= 0) AND (fat_g <= 1000)));

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_fiber_g_check" CHECK (((fiber_g >= 0) AND (fiber_g <= 150)));

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_goal_type_check" CHECK ((goal_type = ANY (ARRAY['fat_loss'::text, 'recomp'::text, 'muscle_gain'::text, 'maintenance'::text])));

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_kcal_check" CHECK (((kcal >= 1200) AND (kcal <= 10000)));

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_protein_g_check" CHECK (((protein_g >= 0) AND (protein_g <= 1000)));

ALTER TABLE "public"."efg_legal_acceptances" ADD CONSTRAINT "efg_legal_acceptances_acceptance_method_check" CHECK ((acceptance_method = 'explicit_checkbox'::text));

ALTER TABLE "public"."efg_legal_acceptances" ADD CONSTRAINT "efg_legal_acceptances_pkey" PRIMARY KEY (user_id, document_id);

ALTER TABLE "public"."efg_legal_documents" ADD CONSTRAINT "coach115_only_reviewed_published_current" CHECK (((NOT is_current) OR ((published_at IS NOT NULL) AND (char_length(body) >= 300))));

ALTER TABLE "public"."efg_legal_documents" ADD CONSTRAINT "efg_legal_documents_kind_check" CHECK ((kind = ANY (ARRAY['terms'::text, 'privacy'::text])));

ALTER TABLE "public"."efg_legal_documents" ADD CONSTRAINT "efg_legal_documents_kind_version_key" UNIQUE (kind, version);

ALTER TABLE "public"."efg_legal_documents" ADD CONSTRAINT "efg_legal_documents_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."efg_legal_documents" ADD CONSTRAINT "efg_legal_documents_sha256_check" CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text));

ALTER TABLE "public"."efg_legal_documents" ADD CONSTRAINT "efg_legal_documents_version_check" CHECK ((version ~ '^[a-z0-9_]{5,80}$'::text));

ALTER TABLE "public"."efg_notifications" ADD CONSTRAINT "efg_notifications_body_check" CHECK ((char_length(body) <= 600));

ALTER TABLE "public"."efg_notifications" ADD CONSTRAINT "efg_notifications_kind_check" CHECK ((kind = ANY (ARRAY['guide'::text, 'plan_update'::text, 'weekly_report'::text, 'weekly_ready'::text, 'missing_diary'::text, 'payment'::text, 'payment_status'::text, 'message'::text])));

ALTER TABLE "public"."efg_notifications" ADD CONSTRAINT "efg_notifications_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."efg_notifications" ADD CONSTRAINT "efg_notifications_recipient_id_event_key_key" UNIQUE (recipient_id, event_key);

ALTER TABLE "public"."efg_notifications" ADD CONSTRAINT "efg_notifications_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 140)));

ALTER TABLE "public"."efg_pilot_participation_receipts" ADD CONSTRAINT "efg_pilot_participation_receipts_acceptance_method_check" CHECK ((acceptance_method = 'two_explicit_checkboxes'::text));

ALTER TABLE "public"."efg_pilot_participation_receipts" ADD CONSTRAINT "efg_pilot_participation_receipts_participation_accepted_check" CHECK ((participation_accepted = true));

ALTER TABLE "public"."efg_pilot_participation_receipts" ADD CONSTRAINT "efg_pilot_participation_receipts_pkey" PRIMARY KEY (student_id, version);

ALTER TABLE "public"."efg_pilot_participation_receipts" ADD CONSTRAINT "efg_pilot_participation_receipts_sharing_accepted_check" CHECK ((sharing_accepted = true));

ALTER TABLE "public"."efg_pilot_participation_receipts" ADD CONSTRAINT "efg_pilot_participation_receipts_version_check" CHECK ((version = 'coach_pilot_2026_demo1'::text));

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_access_publish_consistent" CHECK ((((status = 'published'::text) AND (published_goal_id IS NOT NULL) AND (published_at IS NOT NULL) AND (published_by IS NOT NULL)) OR (status <> 'published'::text)));

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_student_plan_access_pkey" PRIMARY KEY (student_id);

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_student_plan_access_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'published'::text, 'paused'::text])));

ALTER TABLE "public"."efg_sunday_rewards" ADD CONSTRAINT "efg_sunday_rewards_approved_timestamp" CHECK (((NOT approved) OR (approved_at IS NOT NULL)));

ALTER TABLE "public"."efg_sunday_rewards" ADD CONSTRAINT "efg_sunday_rewards_monday" CHECK ((EXTRACT(isodow FROM week_monday) = (1)::numeric));

ALTER TABLE "public"."efg_sunday_rewards" ADD CONSTRAINT "efg_sunday_rewards_pkey" PRIMARY KEY (student_id, week_monday);

ALTER TABLE "efg_private"."coach_reviewed_foods" ADD CONSTRAINT "coach_reviewed_foods_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_plan_drafts_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id);

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_plan_drafts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES efg_organizations(id);

ALTER TABLE "public"."efg_coach_plan_drafts" ADD CONSTRAINT "efg_coach_plan_drafts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES efg_organizations(id);

ALTER TABLE "public"."efg_coach_relaunch_intakes" ADD CONSTRAINT "efg_coach_relaunch_intakes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_consents" ADD CONSTRAINT "efg_consents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES efg_organizations(id);

ALTER TABLE "public"."efg_consents" ADD CONSTRAINT "efg_consents_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_food_plans" ADD CONSTRAINT "efg_food_plans_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id);

ALTER TABLE "public"."efg_food_plans" ADD CONSTRAINT "efg_food_plans_guided_goal_id_fkey" FOREIGN KEY (guided_goal_id) REFERENCES efg_goals(id);

ALTER TABLE "public"."efg_food_plans" ADD CONSTRAINT "efg_food_plans_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id);

ALTER TABLE "public"."efg_goals" ADD CONSTRAINT "efg_goals_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_legal_acceptances" ADD CONSTRAINT "efg_legal_acceptances_document_id_fkey" FOREIGN KEY (document_id) REFERENCES efg_legal_documents(id);

ALTER TABLE "public"."efg_legal_acceptances" ADD CONSTRAINT "efg_legal_acceptances_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_notifications" ADD CONSTRAINT "efg_notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_pilot_participation_receipts" ADD CONSTRAINT "efg_pilot_participation_receipts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES efg_organizations(id);

ALTER TABLE "public"."efg_pilot_participation_receipts" ADD CONSTRAINT "efg_pilot_participation_receipts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_student_plan_access_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id);

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_student_plan_access_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES efg_organizations(id);

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_student_plan_access_published_by_fkey" FOREIGN KEY (published_by) REFERENCES auth.users(id);

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_student_plan_access_published_goal_id_fkey" FOREIGN KEY (published_goal_id) REFERENCES efg_goals(id);

ALTER TABLE "public"."efg_student_plan_access" ADD CONSTRAINT "efg_student_plan_access_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE "public"."efg_sunday_rewards" ADD CONSTRAINT "efg_sunday_rewards_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES auth.users(id);

ALTER TABLE "public"."efg_sunday_rewards" ADD CONSTRAINT "efg_sunday_rewards_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE;

CREATE INDEX efg_coach_plan_drafts_coach_idx ON public.efg_coach_plan_drafts USING btree (coach_id, updated_at DESC);

CREATE INDEX efg_coach_relaunch_shared_idx ON public.efg_coach_relaunch_intakes USING btree (organization_id, updated_at DESC) WHERE (shared_at IS NOT NULL);

CREATE INDEX efg_consents_org_fk_idx ON public.efg_consents USING btree (organization_id);

CREATE INDEX efg_food_plans_coach ON public.efg_food_plans USING btree (coach_id);

CREATE INDEX efg_goals_approved_by_fk_idx ON public.efg_goals USING btree (approved_by);

CREATE INDEX efg_goals_student_latest ON public.efg_goals USING btree (student_id, start_on DESC, approved_at DESC);

CREATE INDEX coach115_legal_receipts_by_document ON public.efg_legal_acceptances USING btree (document_id);

CREATE UNIQUE INDEX coach115_single_current_doc_per_kind ON public.efg_legal_documents USING btree (kind) WHERE is_current;

CREATE INDEX efg_notifications_inbox_idx ON public.efg_notifications USING btree (recipient_id, created_at DESC);

CREATE INDEX efg_pilot_participation_org_idx ON public.efg_pilot_participation_receipts USING btree (organization_id, updated_at DESC);

CREATE INDEX efg_plan_access_coach_idx ON public.efg_student_plan_access USING btree (coach_id, status);

CREATE OR REPLACE FUNCTION public.efg_accept_pilot_participation(
 p_version text, p_participation boolean, p_sharing boolean
) returns timestamptz language plpgsql volatile security definer set search_path=''
as $accept$
declare
 v_student uuid := (select auth.uid());
 v_org uuid;
 v_accepted timestamptz := pg_catalog.clock_timestamp();
begin
 if v_student is null or p_version is distinct from 'coach_pilot_2026_demo1'
    or p_participation is distinct from true or p_sharing is null then
  raise exception 'Pilot participation requires an explicit sharing decision'
    using errcode='42501';
 end if;
 select p.organization_id into v_org
  from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  where p.user_id=v_student and p.role='student' and p.active;
 if v_org is null then
  raise exception 'An active student account is required' using errcode='42501';
 end if;
 insert into public.efg_pilot_participation_receipts
  (student_id,organization_id,version,participation_accepted,sharing_accepted,
   accepted_at,revoked_at,updated_at)
 values (v_student,v_org,p_version,true,p_sharing,v_accepted,null,v_accepted)
 on conflict(student_id,version) do update set
  organization_id=excluded.organization_id,
  participation_accepted=true,sharing_accepted=excluded.sharing_accepted,
  acceptance_method='two_explicit_checkboxes',
  accepted_at=excluded.accepted_at,revoked_at=null,updated_at=excluded.updated_at;
 return v_accepted;
end
$accept$;

CREATE OR REPLACE FUNCTION public.efg_revoke_pilot_participation(p_version text)
returns boolean language plpgsql volatile security definer set search_path=''
as $revoke$
declare
 v_student uuid := (select auth.uid());
 v_found boolean;
begin
 if v_student is null or p_version is distinct from 'coach_pilot_2026_demo1' then
  raise exception 'Valid authenticated pilot version required' using errcode='42501';
 end if;
 update public.efg_pilot_participation_receipts
 set revoked_at=pg_catalog.clock_timestamp(),updated_at=pg_catalog.clock_timestamp()
 where student_id=v_student and version=p_version and revoked_at is null;
 v_found:=found;
 return v_found;
end
$revoke$;

CREATE OR REPLACE FUNCTION public.efg_submit_coach_relaunch_intake(
 p_completed_version text,p_payload jsonb,p_expected_revision integer,p_share_with_coach boolean
) returns integer
language plpgsql security definer set search_path='' as $body$
declare
 v_uid uuid := (select auth.uid());
 v_org uuid;
 v_revision integer;
 v_new_revision integer;
 v_allowed text[] := array[
  'objective','age_years','height_cm','weight_kg','activity_level',
  'dietary_pattern','eating_window','preferred_foods','disliked_foods','meal_routine','notes'
 ];
 v_field text;
 v_text text;
 v_shared timestamptz;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_completed_version is distinct from 'coach_major_2026_r1' then
  raise exception 'Unsupported Coach relaunch revision' using errcode='22023';
 end if;
 if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>99999
  or p_share_with_coach is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object' then
  raise exception 'Invalid intake revision/payload/permission' using errcode='22023';
 end if;
 select p.organization_id into v_org from public.efg_profiles p
  where p.user_id=v_uid and p.role='student' and p.active is true
  and p.organization_id is not null;
 if v_org is null then raise exception 'Active Coach student required' using errcode='42501'; end if;
 -- Participation is required; sharing is a separate OPTIONAL choice checked only when requested.
 if not exists(
  select 1 from public.efg_pilot_participation_receipts r
  where r.student_id=v_uid and r.organization_id=v_org
   and r.version='coach_pilot_2026_demo1' and r.participation_accepted
   and r.revoked_at is null
 ) then
  raise exception 'Current pilot participation required'
   using errcode='42501';
 end if;
 -- Reject unknown and sensitive keys even if a future browser has extra fields.
 for v_field in select pg_catalog.jsonb_object_keys(p_payload) loop
  if not (v_field=any(v_allowed)) then
   raise exception 'Unsupported or sensitive intake field: %',v_field using errcode='22023';
  end if;
 end loop;
 foreach v_field in array v_allowed loop
  if p_payload ? v_field and p_payload->v_field <> 'null'::jsonb then
   if v_field in ('age_years','height_cm','weight_kg') then
    if pg_catalog.jsonb_typeof(p_payload->v_field)<>'number' then
     raise exception 'Numeric intake field type mismatch' using errcode='22023';
    end if;
   elsif pg_catalog.jsonb_typeof(p_payload->v_field)<>'string' then
    raise exception 'Text intake field type mismatch' using errcode='22023';
   end if;
  end if;
 end loop;
 if nullif(p_payload->>'objective','') is not null and
    (p_payload->>'objective') not in ('fat_loss','recomp','muscle_gain','maintenance','general')
  then raise exception 'Invalid objective' using errcode='22023'; end if;
 if nullif(p_payload->>'activity_level','') is not null and
    (p_payload->>'activity_level') not in ('low','light','moderate','high')
  then raise exception 'Invalid activity' using errcode='22023'; end if;
 if nullif(p_payload->>'dietary_pattern','') is not null and
    (p_payload->>'dietary_pattern') not in ('omnivore','mediterranean','dash','vegetarian','vegan','pescatarian','flexitarian','portfolio','low_carb','keto','other')
  then raise exception 'Invalid dietary pattern' using errcode='22023'; end if;
 if nullif(p_payload->>'eating_window','') is not null
    and (p_payload->>'eating_window') not in ('regular','12_12','14_10','16_8')
  then raise exception 'Invalid eating window' using errcode='22023'; end if;
 foreach v_field in array array['preferred_foods','disliked_foods','meal_routine','notes'] loop
  v_text:=coalesce(p_payload->>v_field,'');
  if pg_catalog.char_length(v_text)>(case when v_field='notes' then 1000 else 400 end) then
   raise exception 'Intake free-text too long' using errcode='22023';
  end if;
 end loop;
 if p_payload ? 'age_years' and p_payload->>'age_years' is not null then
  if (p_payload->>'age_years')::numeric not between 18 and 100 or
   (p_payload->>'age_years')::numeric<>pg_catalog.trunc((p_payload->>'age_years')::numeric) then
   raise exception 'Invalid age' using errcode='22023'; end if;
 end if;
 if p_payload ? 'height_cm' and p_payload->>'height_cm' is not null and
   (p_payload->>'height_cm')::numeric not between 100 and 250 then
  raise exception 'Invalid height' using errcode='22023'; end if;
 if p_payload ? 'weight_kg' and p_payload->>'weight_kg' is not null and
   (p_payload->>'weight_kg')::numeric not between 20 and 400 then
  raise exception 'Invalid weight' using errcode='22023'; end if;
 -- A consenting Coach cannot be inferred from an invitation or an existing plan.
 if p_share_with_coach then
  if not exists(
   select 1 from public.efg_pilot_participation_receipts r
   where r.student_id=v_uid and r.organization_id=v_org
     and r.version='coach_pilot_2026_demo1'
     and r.participation_accepted and r.sharing_accepted and r.revoked_at is null
  ) then
   raise exception 'Separate pilot coach-sharing permission required'
     using errcode='42501';
  end if;
  if not exists(
   select 1 from public.efg_consents c
   where c.student_id=v_uid and c.organization_id=v_org and c.accepted=true
  ) then
   raise exception 'Coach follow-up permission required before sharing intake'
    using errcode='42501';
  end if;
  v_shared:=pg_catalog.now();
 else
  v_shared:=null;
 end if;
 -- Serialize concurrent first submissions and check the expected revision.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  v_uid::text||'/'||p_completed_version,0));
 select revision into v_revision from public.efg_coach_relaunch_intakes
  where student_id=v_uid and completed_version=p_completed_version for update;
 if coalesce(v_revision,0)<>p_expected_revision then
  raise exception 'Intake revision conflict; reload before retry' using errcode='PT409';
 end if;
 insert into public.efg_coach_relaunch_intakes(
  student_id,organization_id,completed_version,revision,
  objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,eating_window,
  preferred_foods,disliked_foods,meal_routine,notes,shared_at,completed_at,updated_at
 ) values(
  v_uid,v_org,p_completed_version,p_expected_revision+1,
  nullif(p_payload->>'objective',''),
  nullif(p_payload->>'age_years','')::integer,
  nullif(p_payload->>'height_cm','')::numeric,
  nullif(p_payload->>'weight_kg','')::numeric,
  nullif(p_payload->>'activity_level',''),
  nullif(p_payload->>'dietary_pattern',''),
  coalesce(nullif(p_payload->>'eating_window',''),'regular'),
  coalesce(p_payload->>'preferred_foods',''),
  coalesce(p_payload->>'disliked_foods',''),
  coalesce(p_payload->>'meal_routine',''),
  coalesce(p_payload->>'notes',''),
  v_shared,pg_catalog.now(),pg_catalog.now()
 )
 on conflict(student_id,completed_version) do update set
  revision=excluded.revision,
  objective=excluded.objective,age_years=excluded.age_years,
  height_cm=excluded.height_cm,weight_kg=excluded.weight_kg,
  activity_level=excluded.activity_level,dietary_pattern=excluded.dietary_pattern,eating_window=excluded.eating_window,
  preferred_foods=excluded.preferred_foods,disliked_foods=excluded.disliked_foods,
  meal_routine=excluded.meal_routine,notes=excluded.notes,
  shared_at=excluded.shared_at,updated_at=excluded.updated_at
 where efg_coach_relaunch_intakes.revision=p_expected_revision
 returning revision into v_new_revision;
 if v_new_revision is null then
  raise exception 'Intake revision conflict' using errcode='PT409';
 end if;
 return v_new_revision;
end
$body$;

CREATE OR REPLACE FUNCTION public.efg_save_coach_plan_draft(
 p_student uuid,
 p_goal jsonb,
 p_guide jsonb,
 p_intake_updated_at timestamptz,
 p_intake_revision integer,
 p_expected_revision bigint default null
) returns bigint
language plpgsql
security definer
set search_path=''
as $efg_body$
declare
 v_coach uuid := auth.uid();
 v_organization uuid;
 v_updated timestamptz;
 v_intake_revision integer;
 v_revision bigint;
 v_key text;
 v_number numeric;
begin
 -- Never trust student or coach IDs supplied by the browser for authorization.
 if v_coach is null or p_student is null
   or not efg_private.coach_has_student(p_student) then
  raise exception 'Not authorized to save this student draft'
    using errcode='42501';
 end if;

 -- Lock the actual intake row before verifying sharing/version. This prevents
 -- simultaneous modifications while saving; publication must recheck separately.
 select intake.organization_id,intake.updated_at,intake.revision
 into v_organization,v_updated,v_intake_revision
 from public.efg_coach_relaunch_intakes intake
 join public.efg_profiles profile on profile.user_id=intake.student_id
 join public.efg_organizations org on org.id=profile.organization_id
 where intake.student_id=p_student
   and profile.active
   and profile.role='student'
   and intake.organization_id=profile.organization_id
   and org.coach_id=v_coach
   and intake.shared_at is not null
   and intake.completed_version='coach_major_2026_r1'
 for update of intake;
 if not exists (
   select 1 from public.efg_pilot_participation_receipts receipt
    join public.efg_consents consent on consent.student_id=receipt.student_id
      and consent.organization_id=receipt.organization_id
   where receipt.student_id=p_student
    and receipt.organization_id=v_organization and receipt.version='coach_pilot_2026_demo1'
    and receipt.participation_accepted and receipt.sharing_accepted
    and receipt.revoked_at is null and consent.accepted
 ) then raise exception 'Pilot sharing permission or coach follow-up consent revoked'
   using errcode='42501'; end if;
 if not found or p_intake_updated_at is null or p_intake_revision is null
   or v_updated is distinct from p_intake_updated_at
   or v_intake_revision is distinct from p_intake_revision then
  raise exception 'Intake not shared or changed; reopen the student intake'
   using errcode='42501';
 end if;

 if pg_catalog.jsonb_typeof(p_goal) is distinct from 'object'
   or pg_catalog.octet_length(p_goal::text)>8000
   or (p_goal->>'goal_type') not in ('fat_loss','recomp','muscle_gain','maintenance')
   then raise exception 'Invalid nutrition goal proposal';
 end if;
 foreach v_key in array array['kcal','protein_g','carb_g','fat_g','fiber_g'] loop
   if pg_catalog.jsonb_typeof(p_goal->v_key) is distinct from 'number' then
     raise exception 'Missing/invalid numeric goal field: %',v_key;
   end if;
   v_number := (p_goal->>v_key)::numeric;
   if v_number < 0 or v_number > (case v_key
     when 'kcal' then 10000 when 'fiber_g' then 150 when 'carb_g' then 2000
     else 1000 end) then
     raise exception 'Goal field outside allowed bounds: %',v_key;
   end if;
 end loop;
 if (p_goal->>'kcal')::numeric < 1200 then
  raise exception 'Kcal below supported estimation range';
 end if;
 if p_guide is not null and (
  pg_catalog.jsonb_typeof(p_guide) is distinct from 'object'
  or pg_catalog.octet_length(p_guide::text)>30000
 ) then
   raise exception 'Invalid guide draft';
 end if;

 -- Versioned optimistic concurrency. A null expected revision only creates a
 -- fresh draft; it does not overwrite another coach tab or a previous save.
 if p_expected_revision is null then
   insert into public.efg_coach_plan_drafts(
     student_id,organization_id,coach_id,source_intake_updated_at,
     source_intake_revision,goal_proposal,guide_proposal
   ) values(p_student,v_organization,v_coach,p_intake_updated_at,v_intake_revision,p_goal,p_guide)
   on conflict (student_id) do nothing
   returning draft_revision into v_revision;
 else
   if p_expected_revision<1 then
     raise exception 'Invalid expected revision';
   end if;
   update public.efg_coach_plan_drafts
   set goal_proposal=p_goal,
       guide_proposal=p_guide,
       source_intake_updated_at=p_intake_updated_at,
       source_intake_revision=v_intake_revision,
       updated_at=now(),
       status='draft',
       draft_revision=draft_revision+1
   where student_id=p_student
     and organization_id=v_organization
     and coach_id=v_coach
     and draft_revision=p_expected_revision
     and status in ('draft','published')
   returning draft_revision into v_revision;
 end if;
 if v_revision is null then
   raise exception 'Draft already exists or version changed; reload before editing'
    using errcode='PT409';
 end if;
 return v_revision;
end;
$efg_body$;

CREATE OR REPLACE FUNCTION public.efg_legal_current_status()
returns table(kind text,document_id uuid,version text,sha256 text,accepted boolean)
language sql stable security definer
set search_path=''
as $status$
 select doc.kind,doc.id,doc.version,doc.sha256,
  (receipt.user_id is not null) as accepted
 from public.efg_legal_documents doc
 left join public.efg_legal_acceptances receipt
  on receipt.document_id=doc.id and receipt.user_id=auth.uid()
 where auth.uid() is not null
  and doc.is_current and doc.published_at is not null
  and doc.sha256=pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(doc.body,'UTF8')),'hex')
 order by doc.kind;
$status$;

CREATE OR REPLACE FUNCTION public.efg_accept_current_legal(
 p_terms_id uuid,p_privacy_id uuid,
 p_terms_checked boolean,p_privacy_checked boolean)
returns boolean
language plpgsql security definer set search_path=''
as $accept$
declare
 v_uid uuid := auth.uid();
 v_found integer := 0;
 v_legal_id uuid;
begin
 if v_uid is null or p_terms_checked is distinct from true
 or p_privacy_checked is distinct from true
 or p_terms_id is null or p_privacy_id is null or p_terms_id=p_privacy_id then
  raise exception 'Both legal documents require explicit separate acceptance'
   using errcode='42501';
 end if;
 if not exists(
  select 1 from public.efg_profiles profile
  where profile.user_id=v_uid and profile.active
    and profile.role in ('student','coach','admin')
 ) then
  raise exception 'Inactive or missing signed profile'
   using errcode='42501';
 end if;
 -- Lock exact current versions so they cannot change mid-transaction.
 for v_legal_id in
  select doc.id from public.efg_legal_documents doc
  where ((doc.id=p_terms_id and doc.kind='terms')
      or (doc.id=p_privacy_id and doc.kind='privacy'))
   and doc.is_current and doc.published_at is not null
   and pg_catalog.char_length(doc.body)>=300
   and doc.sha256=pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(doc.body,'UTF8')),'hex')
  for share
 loop
  v_found := v_found+1;
 end loop;
 if v_found<>2 then
  raise exception 'Terms or privacy version unavailable or invalid'
   using errcode='PT409';
 end if;
 insert into public.efg_legal_acceptances(user_id,document_id)
 values (v_uid,p_terms_id),(v_uid,p_privacy_id)
 on conflict(user_id,document_id) do nothing;
 return true;
end;
$accept$;

CREATE OR REPLACE FUNCTION efg_private.verify_guide_goal() returns trigger
language plpgsql security definer set search_path=''
as $f$
begin
 if new.guided_plan is not null and (
   auth.uid() is null
   or new.coach_id is distinct from auth.uid()
   or not exists(select 1 from public.efg_goals g
     where g.id=new.guided_goal_id and g.student_id=new.student_id
       and g.approved_by=new.coach_id)
 ) then raise exception 'Guide goal must belong to this student and coach'; end if;
 return new;
end $f$;

CREATE OR REPLACE FUNCTION efg_private.food_plan_immutable_owner() returns trigger
language plpgsql set search_path=''
as $f$
begin
 if new.student_id is distinct from old.student_id
    or new.coach_id is distinct from old.coach_id then
   raise exception 'Cannot change the student or coach of a food plan'; end if;
 new.updated_at=now();
 return new;
end $f$;

CREATE OR REPLACE FUNCTION efg_private.protect_consent_identity() returns trigger
language plpgsql set search_path=''
as $f$
begin
 if new.student_id is distinct from old.student_id
    or new.organization_id is distinct from old.organization_id then
   raise exception 'Consent student or organization identity cannot change'; end if;
 new.updated_at=now();
 return new;
end $f$;

CREATE OR REPLACE FUNCTION public.efg_notify_goal() returns trigger
language plpgsql security definer set search_path=''
as $f$
begin
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
 values(new.student_id,new.approved_by,'plan_update','goal:'||new.id::text,
   'Objetivo nutricional actualizado','Tu coach aprobó un objetivo de alimentación.','home')
 on conflict(recipient_id,event_key) do nothing;
 return new;
end $f$;

CREATE OR REPLACE FUNCTION public.efg_notify_food_guide() returns trigger
language plpgsql security definer set search_path=''
as $f$
begin
 if tg_op='INSERT' then
   if new.guided_plan is null or new.guided_plan_approved_at is null then return new; end if;
 elsif new.guided_plan_approved_at is not distinct from old.guided_plan_approved_at then
   if new.approved_food_ids is distinct from old.approved_food_ids then
     insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
     values(new.student_id,new.coach_id,'plan_update','foods:'||new.updated_at::text,
       'Cambios en tu alimentación','Tu coach actualizó las opciones de alimentos de tu plan.','home')
     on conflict(recipient_id,event_key) do nothing;
   end if;
   return new;
 end if;
 if new.guided_plan is not null and new.guided_plan_approved_at is not null then
   insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
   values(new.student_id,new.coach_id,'guide','guide:'||new.guided_plan_approved_at::text,
     'Nueva guía de alimentación','Tu coach aprobó una guía alimentaria. Podés verla en Mi día.','home')
   on conflict(recipient_id,event_key) do nothing;
 end if;
 return new;
end $f$;

CREATE OR REPLACE FUNCTION efg_private.coach_guide_foods_verified(p_guide jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 v_meal jsonb;
 v_item jsonb;
 v_food efg_private.coach_reviewed_foods%rowtype;
 v_food_id text;
 v_units text;
 v_value numeric;
 v_key text;
 v_source numeric;
 v_slots text[] := '{}';
 v_items_count integer;
 v_count integer := 0;
begin
 if pg_catalog.jsonb_typeof(p_guide) is distinct from 'object'
  or p_guide->>'kind' is distinct from 'five_meal_example'
  or p_guide->>'version' is distinct from '1'
  or pg_catalog.jsonb_typeof(p_guide->'meals') is distinct from 'array'
  or pg_catalog.jsonb_array_length(p_guide->'meals') <> 5 then
   return false;
 end if;
 for v_meal in select value from pg_catalog.jsonb_array_elements(p_guide->'meals') loop
  if pg_catalog.jsonb_typeof(v_meal) is distinct from 'object'
   or v_meal->>'slot' is null or v_meal->>'slot' not in
    ('desayuno','media_manana','almuerzo','merienda','cena')
   or v_meal->>'slot'=any(v_slots)
   or pg_catalog.jsonb_typeof(v_meal->'items') is distinct from 'array' then
   return false;
  end if;
  v_slots:=pg_catalog.array_append(v_slots,v_meal->>'slot');
  v_items_count:=pg_catalog.jsonb_array_length(v_meal->'items');
  if v_items_count not between 1 and 15 then return false; end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(v_meal->'items') loop
   v_count:=v_count+1;
   if v_count>75 or pg_catalog.jsonb_typeof(v_item) is distinct from 'object'
    or v_item->>'id' is null or v_item->>'unit' is null
    or v_item->>'id' !~ '^[a-zA-Z0-9_-]{1,100}$'
    or v_item->>'unit' not in ('g','ml')
    or pg_catalog.jsonb_typeof(v_item->'qty') is distinct from 'number' then
     return false;
   end if;
   if (v_item->>'qty')::numeric<=0 or (v_item->>'qty')::numeric>1000 then
    return false;
   end if;
   v_food_id:=v_item->>'id';
   v_units:=v_item->>'unit';
   select * into v_food from efg_private.coach_reviewed_foods
    where food_id=v_food_id and unit=v_units
      and evidence_status='reviewed'
      and reviewed_by is not null and reviewed_at is not null
      and expires_at>pg_catalog.now() and reviewed_at<=pg_catalog.now();
   if not found then return false; end if;
   foreach v_key in array array['k','p','c','f','fi'] loop
    if pg_catalog.jsonb_typeof(v_item->v_key) is distinct from 'number' then
     return false;
    end if;
    v_value:=(v_item->>v_key)::numeric;
    v_source:=(case v_key
      when 'k' then v_food.k when 'p' then v_food.p
      when 'c' then v_food.c when 'f' then v_food.f else v_food.fi end);
    if v_value<0 or abs(v_value-v_source) >
      (case when v_key='k' then 0.01 else 0.003 end) then
     return false;
    end if;
   end loop;
  end loop;
 end loop;
 return pg_catalog.cardinality(v_slots)=5 and v_count>=5;
end
$function$;

CREATE OR REPLACE FUNCTION efg_private.coach_has_student(p_student uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
  select 1 from public.efg_profiles student
  join public.efg_organizations org on org.id=student.organization_id
  join public.efg_consents c on c.student_id=student.user_id and c.organization_id=org.id
  join public.efg_profiles coach on coach.user_id=org.coach_id
  where student.user_id=p_student and student.role='student' and student.active
    and org.coach_id=auth.uid() and org.status in ('trial','active','grace')
    and (org.is_test or (org.status='active' and org.paid_through >= (now() at time zone 'America/Argentina/Buenos_Aires')::date))
    and coach.active and (coach.role='coach' or (coach.role='admin' and org.is_test))
    and c.accepted
 );
$function$;

CREATE OR REPLACE FUNCTION efg_private.protect_consent_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.student_id is distinct from old.student_id or new.organization_id is distinct from old.organization_id then
   raise exception 'No se puede modificar la identidad ni el entrenador asignado desde el consentimiento';
 end if;
 new.updated_at=now();
 return new;
end; $function$;

CREATE OR REPLACE FUNCTION efg_private.verify_guide_goal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.guided_plan IS NOT NULL AND (
   auth.uid() IS NULL OR NEW.coach_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
   SELECT 1 FROM public.efg_goals g WHERE g.id=NEW.guided_goal_id
     AND g.student_id=NEW.student_id AND g.approved_by=NEW.coach_id
 )) THEN RAISE EXCEPTION 'Guide goal must belong to this student and coach'; END IF;
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.efg_accept_pilot_participation(p_version text, p_participation boolean, p_sharing boolean)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_student uuid := (select auth.uid());
 v_org uuid;
 v_accepted timestamptz := pg_catalog.clock_timestamp();
begin
 if v_student is null or p_version is distinct from 'coach_pilot_2026_demo1'
    or p_participation is distinct from true or p_sharing is distinct from true then
  raise exception 'Both pilot choices require an explicit authenticated action'
    using errcode='42501';
 end if;
 select p.organization_id into v_org
  from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  where p.user_id=v_student and p.role='student' and p.active;
 if v_org is null then
  raise exception 'An active student account is required' using errcode='42501';
 end if;
 insert into public.efg_pilot_participation_receipts
  (student_id,organization_id,version,participation_accepted,sharing_accepted,
   accepted_at,revoked_at,updated_at)
 values (v_student,v_org,p_version,true,true,v_accepted,null,v_accepted)
 on conflict(student_id,version) do update set
  organization_id=excluded.organization_id,
  participation_accepted=true,sharing_accepted=true,
  acceptance_method='two_explicit_checkboxes',
  accepted_at=excluded.accepted_at,revoked_at=null,updated_at=excluded.updated_at;
 return v_accepted;
end
$function$;

CREATE OR REPLACE FUNCTION public.efg_notify_food_guide()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if tg_op='INSERT' then
  if new.guided_plan is null or new.guided_plan_approved_at is null then return new; end if;
 elsif new.guided_plan_approved_at is not distinct from old.guided_plan_approved_at then
  if new.approved_food_ids is distinct from old.approved_food_ids then
   insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
   values(new.student_id,new.coach_id,'plan_update','foods:'||new.updated_at::text,
     'Cambios en tu alimentación','Tu coach actualizó las opciones de alimentos de tu plan.','home')
   on conflict(recipient_id,event_key) do nothing;
  end if;
  return new;
 end if;
 if new.guided_plan is not null and new.guided_plan_approved_at is not null then
  insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
   values(new.student_id,new.coach_id,'guide','guide:'||new.guided_plan_approved_at::text,
     'Nueva guía de alimentación','Tu coach aprobó una guía alimentaria. Podés verla en Mi día.','home')
   on conflict(recipient_id,event_key) do nothing;

 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.efg_notify_goal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab)
 values (new.student_id,new.approved_by,'plan_update','goal:'||new.id::text,
         'Objetivo nutricional actualizado','Tu coach aprobó un objetivo de alimentación.','home')
 on conflict(recipient_id,event_key) do nothing;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.efg_save_coach_plan_draft(p_student uuid, p_goal jsonb, p_guide jsonb, p_intake_updated_at timestamp with time zone, p_intake_revision integer, p_expected_revision bigint DEFAULT NULL::bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_coach uuid := auth.uid();
 v_organization uuid;
 v_updated timestamptz;
 v_intake_revision integer;
 v_revision bigint;
 v_key text;
 v_number numeric;
begin
 -- Never trust student or coach IDs supplied by the browser for authorization.
 if v_coach is null or p_student is null
   or not efg_private.coach_has_student(p_student) then
  raise exception 'Not authorized to save this student draft'
    using errcode='42501';
 end if;

 -- Lock the actual intake row before verifying sharing/version. This prevents
 -- simultaneous modifications while saving; publication must recheck separately.
 select intake.organization_id,intake.updated_at,intake.revision
 into v_organization,v_updated,v_intake_revision
 from public.efg_coach_relaunch_intakes intake
 join public.efg_profiles profile on profile.user_id=intake.student_id
 join public.efg_organizations org on org.id=profile.organization_id
 where intake.student_id=p_student
   and profile.active
   and profile.role='student'
   and intake.organization_id=profile.organization_id
   and org.coach_id=v_coach
   and intake.shared_at is not null
   and intake.completed_version='coach_major_2026_r1'
 for update of intake;
 if not exists (
   select 1 from public.efg_pilot_participation_receipts receipt
    join public.efg_consents consent on consent.student_id=receipt.student_id
      and consent.organization_id=receipt.organization_id
   where receipt.student_id=p_student
    and receipt.organization_id=v_organization and receipt.version='coach_pilot_2026_demo1'
    and receipt.participation_accepted and receipt.sharing_accepted
    and receipt.revoked_at is null and consent.accepted
 ) then raise exception 'Pilot sharing permission or coach follow-up consent revoked'
   using errcode='42501'; end if;
 if not found or p_intake_updated_at is null or p_intake_revision is null
   or v_updated is distinct from p_intake_updated_at
   or v_intake_revision is distinct from p_intake_revision then
  raise exception 'Intake not shared or changed; reopen the student intake'
   using errcode='42501';
 end if;

 if pg_catalog.jsonb_typeof(p_goal) is distinct from 'object'
   or pg_catalog.octet_length(p_goal::text)>8000
   or (p_goal->>'goal_type') not in ('fat_loss','recomp','muscle_gain','maintenance')
   then raise exception 'Invalid nutrition goal proposal';
 end if;
 foreach v_key in array array['kcal','protein_g','carb_g','fat_g','fiber_g'] loop
   if pg_catalog.jsonb_typeof(p_goal->v_key) is distinct from 'number' then
     raise exception 'Missing/invalid numeric goal field: %',v_key;
   end if;
   v_number := (p_goal->>v_key)::numeric;
   if v_number < 0 or v_number > (case v_key
     when 'kcal' then 10000 when 'fiber_g' then 150 when 'carb_g' then 2000
     else 1000 end) then
     raise exception 'Goal field outside allowed bounds: %',v_key;
   end if;
 end loop;
 if (p_goal->>'kcal')::numeric < 1200 then
  raise exception 'Kcal below supported estimation range';
 end if;
 if p_guide is not null and (
  pg_catalog.jsonb_typeof(p_guide) is distinct from 'object'
  or pg_catalog.octet_length(p_guide::text)>30000
 ) then
   raise exception 'Invalid guide draft';
 end if;

 -- Versioned optimistic concurrency. A null expected revision only creates a
 -- fresh draft; it does not overwrite another coach tab or a previous save.
 if p_expected_revision is null then
   insert into public.efg_coach_plan_drafts(
     student_id,organization_id,coach_id,source_intake_updated_at,
     source_intake_revision,goal_proposal,guide_proposal
   ) values(p_student,v_organization,v_coach,p_intake_updated_at,v_intake_revision,p_goal,p_guide)
   on conflict (student_id) do nothing
   returning draft_revision into v_revision;
 else
   if p_expected_revision<1 then
     raise exception 'Invalid expected revision';
   end if;
   update public.efg_coach_plan_drafts
   set goal_proposal=p_goal,
       guide_proposal=p_guide,
       source_intake_updated_at=p_intake_updated_at,
       source_intake_revision=v_intake_revision,
       updated_at=now(),
       status='draft',
       draft_revision=draft_revision+1
   where student_id=p_student
     and organization_id=v_organization
     and coach_id=v_coach
     and draft_revision=p_expected_revision
     and status in ('draft','published')
   returning draft_revision into v_revision;
 end if;
 if v_revision is null then
   raise exception 'Draft already exists or version changed; reload before editing'
    using errcode='PT409';
 end if;
 return v_revision;
end;
$function$;

CREATE OR REPLACE FUNCTION public.efg_submit_coach_relaunch_intake(p_completed_version text, p_payload jsonb, p_expected_revision integer, p_share_with_coach boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid := (select auth.uid());
 v_org uuid;
 v_revision integer;
 v_new_revision integer;
 v_allowed text[] := array[
  'objective','age_years','height_cm','weight_kg','activity_level',
  'dietary_pattern','eating_window','preferred_foods','disliked_foods','meal_routine','notes'
 ];
 v_field text;
 v_text text;
 v_shared timestamptz;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_completed_version is distinct from 'coach_major_2026_r1' then
  raise exception 'Unsupported Coach relaunch revision' using errcode='22023';
 end if;
 if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>99999
  or p_share_with_coach is null or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object' then
  raise exception 'Invalid intake revision/payload/permission' using errcode='22023';
 end if;
 select p.organization_id into v_org from public.efg_profiles p
  where p.user_id=v_uid and p.role='student' and p.active is true
  and p.organization_id is not null;
 if v_org is null then raise exception 'Active Coach student required' using errcode='42501'; end if;
 -- Server-owned participation and sharing must still be valid for this release.
 if not exists(
  select 1 from public.efg_pilot_participation_receipts r
  where r.student_id=v_uid and r.organization_id=v_org
   and r.version='coach_pilot_2026_demo1' and r.participation_accepted
   and r.sharing_accepted and r.revoked_at is null
 ) then
  raise exception 'Current pilot participation and sharing permission required'
   using errcode='42501';
 end if;
 -- Reject unknown and sensitive keys even if a future browser has extra fields.
 for v_field in select pg_catalog.jsonb_object_keys(p_payload) loop
  if not (v_field=any(v_allowed)) then
   raise exception 'Unsupported or sensitive intake field: %',v_field using errcode='22023';
  end if;
 end loop;
 foreach v_field in array v_allowed loop
  if p_payload ? v_field and p_payload->v_field <> 'null'::jsonb then
   if v_field in ('age_years','height_cm','weight_kg') then
    if pg_catalog.jsonb_typeof(p_payload->v_field)<>'number' then
     raise exception 'Numeric intake field type mismatch' using errcode='22023';
    end if;
   elsif pg_catalog.jsonb_typeof(p_payload->v_field)<>'string' then
    raise exception 'Text intake field type mismatch' using errcode='22023';
   end if;
  end if;
 end loop;
 if nullif(p_payload->>'objective','') is not null and
    (p_payload->>'objective') not in ('fat_loss','recomp','muscle_gain','maintenance','general')
  then raise exception 'Invalid objective' using errcode='22023'; end if;
 if nullif(p_payload->>'activity_level','') is not null and
    (p_payload->>'activity_level') not in ('low','light','moderate','high')
  then raise exception 'Invalid activity' using errcode='22023'; end if;
 if nullif(p_payload->>'dietary_pattern','') is not null and
    (p_payload->>'dietary_pattern') not in ('omnivore','mediterranean','dash','vegetarian','vegan','pescatarian','flexitarian','portfolio','low_carb','keto','other')
  then raise exception 'Invalid dietary pattern' using errcode='22023'; end if;
 if nullif(p_payload->>'eating_window','') is not null
    and (p_payload->>'eating_window') not in ('regular','12_12','14_10','16_8')
  then raise exception 'Invalid eating window' using errcode='22023'; end if;
 foreach v_field in array array['preferred_foods','disliked_foods','meal_routine','notes'] loop
  v_text:=coalesce(p_payload->>v_field,'');
  if pg_catalog.char_length(v_text)>(case when v_field='notes' then 1000 else 400 end) then
   raise exception 'Intake free-text too long' using errcode='22023';
  end if;
 end loop;
 if p_payload ? 'age_years' and p_payload->>'age_years' is not null then
  if (p_payload->>'age_years')::numeric not between 18 and 100 or
   (p_payload->>'age_years')::numeric<>pg_catalog.trunc((p_payload->>'age_years')::numeric) then
   raise exception 'Invalid age' using errcode='22023'; end if;
 end if;
 if p_payload ? 'height_cm' and p_payload->>'height_cm' is not null and
   (p_payload->>'height_cm')::numeric not between 100 and 250 then
  raise exception 'Invalid height' using errcode='22023'; end if;
 if p_payload ? 'weight_kg' and p_payload->>'weight_kg' is not null and
   (p_payload->>'weight_kg')::numeric not between 20 and 400 then
  raise exception 'Invalid weight' using errcode='22023'; end if;
 -- A consenting Coach cannot be inferred from an invitation or an existing plan.
 if p_share_with_coach then
  if not exists(
   select 1 from public.efg_consents c
   where c.student_id=v_uid and c.organization_id=v_org and c.accepted=true
  ) then
   raise exception 'Coach follow-up permission required before sharing intake'
    using errcode='42501';
  end if;
  v_shared:=pg_catalog.now();
 else
  v_shared:=null;
 end if;
 -- Serialize concurrent first submissions and check the expected revision.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  v_uid::text||'/'||p_completed_version,0));
 select revision into v_revision from public.efg_coach_relaunch_intakes
  where student_id=v_uid and completed_version=p_completed_version for update;
 if coalesce(v_revision,0)<>p_expected_revision then
  raise exception 'Intake revision conflict; reload before retry' using errcode='PT409';
 end if;
 insert into public.efg_coach_relaunch_intakes(
  student_id,organization_id,completed_version,revision,
  objective,age_years,height_cm,weight_kg,activity_level,dietary_pattern,eating_window,
  preferred_foods,disliked_foods,meal_routine,notes,shared_at,completed_at,updated_at
 ) values(
  v_uid,v_org,p_completed_version,p_expected_revision+1,
  nullif(p_payload->>'objective',''),
  nullif(p_payload->>'age_years','')::integer,
  nullif(p_payload->>'height_cm','')::numeric,
  nullif(p_payload->>'weight_kg','')::numeric,
  nullif(p_payload->>'activity_level',''),
  nullif(p_payload->>'dietary_pattern',''),
  coalesce(nullif(p_payload->>'eating_window',''),'regular'),
  coalesce(p_payload->>'preferred_foods',''),
  coalesce(p_payload->>'disliked_foods',''),
  coalesce(p_payload->>'meal_routine',''),
  coalesce(p_payload->>'notes',''),
  v_shared,pg_catalog.now(),pg_catalog.now()
 )
 on conflict(student_id,completed_version) do update set
  revision=excluded.revision,
  objective=excluded.objective,age_years=excluded.age_years,
  height_cm=excluded.height_cm,weight_kg=excluded.weight_kg,
  activity_level=excluded.activity_level,dietary_pattern=excluded.dietary_pattern,eating_window=excluded.eating_window,
  preferred_foods=excluded.preferred_foods,disliked_foods=excluded.disliked_foods,
  meal_routine=excluded.meal_routine,notes=excluded.notes,
  shared_at=excluded.shared_at,updated_at=excluded.updated_at
 where efg_coach_relaunch_intakes.revision=p_expected_revision
 returning revision into v_new_revision;
 if v_new_revision is null then
  raise exception 'Intake revision conflict' using errcode='PT409';
 end if;
 return v_new_revision;
end
$function$;

CREATE OR REPLACE FUNCTION efg_private.coach_notify_shared_relaunch_intake()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_coach uuid;
 v_key text;
begin
 if new.shared_at is null then return new; end if;
 if tg_op='UPDATE' and old.revision=new.revision then return new; end if;
 -- A plain draft/revoked share must never notify.
 if not exists (
  select 1 from public.efg_pilot_participation_receipts r
  where r.student_id=new.student_id and r.organization_id=new.organization_id
   and r.version='coach_pilot_2026_demo1'
   and r.participation_accepted and r.sharing_accepted and r.revoked_at is null
 ) or not exists(
  select 1 from public.efg_consents c
  where c.student_id=new.student_id and c.organization_id=new.organization_id and c.accepted
 ) then return new; end if;
 select o.coach_id into v_coach from public.efg_profiles p
 join public.efg_organizations o on o.id=p.organization_id
 where p.user_id=new.student_id and p.role='student' and p.active
   and p.organization_id=new.organization_id;
 if v_coach is null then return new; end if;
 v_key:='pilot_intake:'||new.student_id::text||':'||new.completed_version||':'||new.revision::text;
 insert into public.efg_notifications(
   recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student
 ) values(
   v_coach,new.student_id,'message',v_key,
   'Ficha nutricional recibida',
   'Un alumno compartió o actualizó su ficha inicial para que prepares su plan.',
   'coachIntake',new.student_id
 ) on conflict(recipient_id,event_key) do nothing;
 return new;
end
$function$;

CREATE OR REPLACE FUNCTION efg_private.student_belongs_to_coach(p_student uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
  select 1 from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  where p.user_id=p_student and p.role='student' and o.coach_id=auth.uid()
 );
$function$;

ALTER TABLE "efg_private"."coach_release_switches" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "efg_private"."coach_release_switches" FROM public,anon,authenticated,service_role;

ALTER TABLE "efg_private"."coach_reviewed_foods" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "efg_private"."coach_reviewed_foods" FROM public,anon,authenticated,service_role;

ALTER TABLE "public"."efg_coach_plan_drafts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_coach_plan_drafts" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_coach_plan_drafts" TO service_role;

GRANT SELECT ON "public"."efg_coach_plan_drafts" TO authenticated;

ALTER TABLE "public"."efg_coach_relaunch_intakes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_coach_relaunch_intakes" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_coach_relaunch_intakes" TO service_role;

GRANT SELECT ON "public"."efg_coach_relaunch_intakes" TO authenticated;

ALTER TABLE "public"."efg_consents" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_consents" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,MAINTAIN ON "public"."efg_consents" TO authenticated;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_consents" TO service_role;

ALTER TABLE "public"."efg_food_plans" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_food_plans" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,MAINTAIN ON "public"."efg_food_plans" TO authenticated;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_food_plans" TO service_role;

ALTER TABLE "public"."efg_goals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_goals" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,MAINTAIN ON "public"."efg_goals" TO authenticated;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_goals" TO service_role;

ALTER TABLE "public"."efg_legal_acceptances" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_legal_acceptances" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_legal_acceptances" TO service_role;

GRANT SELECT ON "public"."efg_legal_acceptances" TO authenticated;

ALTER TABLE "public"."efg_legal_documents" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_legal_documents" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_legal_documents" TO service_role;

GRANT SELECT ON "public"."efg_legal_documents" TO authenticated;

ALTER TABLE "public"."efg_notifications" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_notifications" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_notifications" TO service_role;

GRANT SELECT ON "public"."efg_notifications" TO authenticated;

ALTER TABLE "public"."efg_pilot_participation_receipts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_pilot_participation_receipts" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_pilot_participation_receipts" TO service_role;

GRANT SELECT ON "public"."efg_pilot_participation_receipts" TO authenticated;

ALTER TABLE "public"."efg_student_plan_access" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_student_plan_access" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_student_plan_access" TO service_role;

GRANT SELECT ON "public"."efg_student_plan_access" TO authenticated;

ALTER TABLE "public"."efg_sunday_rewards" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."efg_sunday_rewards" FROM public,anon,authenticated,service_role;

GRANT INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON "public"."efg_sunday_rewards" TO service_role;

GRANT INSERT,SELECT,UPDATE ON "public"."efg_sunday_rewards" TO authenticated;

CREATE POLICY "coach_draft_read_own" ON "public"."efg_coach_plan_drafts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((coach_id = ( SELECT auth.uid() AS uid)) AND efg_private.coach_has_student(student_id) AND (EXISTS ( SELECT 1
   FROM efg_coach_relaunch_intakes intake
  WHERE ((intake.student_id = efg_coach_plan_drafts.student_id) AND (intake.organization_id = efg_coach_plan_drafts.organization_id) AND (intake.shared_at IS NOT NULL) AND (intake.completed_version = 'coach_major_2026_r1'::text)))) AND (EXISTS ( SELECT 1
   FROM efg_pilot_participation_receipts receipt
  WHERE ((receipt.student_id = efg_coach_plan_drafts.student_id) AND (receipt.organization_id = efg_coach_plan_drafts.organization_id) AND (receipt.version = 'coach_pilot_2026_demo1'::text) AND receipt.participation_accepted AND receipt.sharing_accepted AND (receipt.revoked_at IS NULL)))) AND (EXISTS ( SELECT 1
   FROM efg_consents consent
  WHERE ((consent.student_id = efg_coach_plan_drafts.student_id) AND (consent.organization_id = efg_coach_plan_drafts.organization_id) AND consent.accepted)))));

CREATE POLICY "efg_coach_relaunch_owner_select" ON "public"."efg_coach_relaunch_intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.role = 'student'::text) AND p.active AND (p.organization_id = p.organization_id))))));

CREATE POLICY "efg_coach_relaunch_shared_coach_select" ON "public"."efg_coach_relaunch_intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((shared_at IS NOT NULL) AND efg_private.coach_has_student(student_id) AND (EXISTS ( SELECT 1
   FROM efg_consents c
  WHERE ((c.student_id = efg_coach_relaunch_intakes.student_id) AND (c.organization_id = efg_coach_relaunch_intakes.organization_id) AND (c.accepted = true)))) AND (EXISTS ( SELECT 1
   FROM efg_pilot_participation_receipts r
  WHERE ((r.student_id = efg_coach_relaunch_intakes.student_id) AND (r.organization_id = efg_coach_relaunch_intakes.organization_id) AND (r.version = 'coach_pilot_2026_demo1'::text) AND r.participation_accepted AND r.sharing_accepted AND (r.revoked_at IS NULL))))));

CREATE POLICY "consent_student_read" ON "public"."efg_consents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) OR efg_private.student_belongs_to_coach(student_id)));

CREATE POLICY "consent_student_update" ON "public"."efg_consents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((student_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "efg_food_plan_coach_insert" ON "public"."efg_food_plans" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((coach_id = ( SELECT auth.uid() AS uid)) AND efg_private.coach_has_student(student_id)));

CREATE POLICY "efg_food_plan_coach_update" ON "public"."efg_food_plans" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((coach_id = ( SELECT auth.uid() AS uid)) AND efg_private.coach_has_student(student_id))) WITH CHECK (((coach_id = ( SELECT auth.uid() AS uid)) AND efg_private.coach_has_student(student_id)));

CREATE POLICY "efg_food_plan_read_owned" ON "public"."efg_food_plans" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) OR ((coach_id = ( SELECT auth.uid() AS uid)) AND efg_private.coach_has_student(student_id))));

CREATE POLICY "goals_coach_insert" ON "public"."efg_goals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((approved_by = ( SELECT auth.uid() AS uid)) AND efg_private.coach_has_student(student_id)));

CREATE POLICY "goals_private_read" ON "public"."efg_goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) OR efg_private.coach_has_student(student_id)));

CREATE POLICY "coach115_own_legal_receipts" ON "public"."efg_legal_acceptances" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "coach115_public_current_docs" ON "public"."efg_legal_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_current AND (published_at IS NOT NULL)));

CREATE POLICY "mark own notifications read" ON "public"."efg_notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((recipient_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((recipient_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "read own notifications" ON "public"."efg_notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((recipient_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "efg_pilot_participation_owner_read" ON "public"."efg_pilot_participation_receipts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.role = 'student'::text) AND p.active AND (p.organization_id = p.organization_id))))));

CREATE POLICY "efg_access_coach_linked" ON "public"."efg_student_plan_access" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((coach_id = ( SELECT auth.uid() AS uid)) AND efg_private.coach_has_student(student_id) AND (EXISTS ( SELECT 1
   FROM efg_pilot_participation_receipts r
  WHERE ((r.student_id = efg_student_plan_access.student_id) AND (r.organization_id = efg_student_plan_access.organization_id) AND (r.version = 'coach_pilot_2026_demo1'::text) AND r.participation_accepted AND r.sharing_accepted AND (r.revoked_at IS NULL))))));

CREATE POLICY "efg_access_student_own" ON "public"."efg_student_plan_access" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles p
  WHERE ((p.user_id = efg_student_plan_access.student_id) AND (p.organization_id = efg_student_plan_access.organization_id) AND (p.role = 'student'::text))))));

CREATE POLICY "sunday_reward_coach_insert" ON "public"."efg_sunday_rewards" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((EXTRACT(isodow FROM (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)) = (7)::numeric) AND (week_monday = (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date - 6)) AND (coach_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ((efg_profiles p
     JOIN efg_organizations o ON ((o.id = p.organization_id)))
     JOIN efg_consents c ON (((c.student_id = p.user_id) AND (c.organization_id = o.id))))
  WHERE ((p.user_id = efg_sunday_rewards.student_id) AND (p.role = 'student'::text) AND (p.active = true) AND (o.coach_id = ( SELECT auth.uid() AS uid)) AND (c.accepted = true) AND (o.status = ANY (ARRAY['active'::text, 'trial'::text, 'grace'::text])) AND (EXISTS ( SELECT 1
           FROM efg_profiles coach
          WHERE ((coach.user_id = o.coach_id) AND (coach.active = true) AND (coach.role = ANY (ARRAY['coach'::text, 'admin'::text]))))))))));

CREATE POLICY "sunday_reward_coach_read" ON "public"."efg_sunday_rewards" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((coach_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ((efg_profiles p
     JOIN efg_organizations o ON ((o.id = p.organization_id)))
     JOIN efg_consents c ON (((c.student_id = p.user_id) AND (c.organization_id = o.id))))
  WHERE ((p.user_id = efg_sunday_rewards.student_id) AND (p.role = 'student'::text) AND (p.active = true) AND (o.coach_id = ( SELECT auth.uid() AS uid)) AND (c.accepted = true) AND (o.status = ANY (ARRAY['active'::text, 'trial'::text, 'grace'::text])) AND (EXISTS ( SELECT 1
           FROM efg_profiles coach
          WHERE ((coach.user_id = o.coach_id) AND (coach.active = true) AND (coach.role = ANY (ARRAY['coach'::text, 'admin'::text]))))))))));

CREATE POLICY "sunday_reward_coach_update" ON "public"."efg_sunday_rewards" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((EXTRACT(isodow FROM (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)) = (7)::numeric) AND (week_monday = (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date - 6)) AND (coach_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ((efg_profiles p
     JOIN efg_organizations o ON ((o.id = p.organization_id)))
     JOIN efg_consents c ON (((c.student_id = p.user_id) AND (c.organization_id = o.id))))
  WHERE ((p.user_id = efg_sunday_rewards.student_id) AND (p.role = 'student'::text) AND (p.active = true) AND (o.coach_id = ( SELECT auth.uid() AS uid)) AND (c.accepted = true) AND (o.status = ANY (ARRAY['active'::text, 'trial'::text, 'grace'::text])) AND (EXISTS ( SELECT 1
           FROM efg_profiles coach
          WHERE ((coach.user_id = o.coach_id) AND (coach.active = true) AND (coach.role = ANY (ARRAY['coach'::text, 'admin'::text])))))))))) WITH CHECK (((EXTRACT(isodow FROM (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)) = (7)::numeric) AND (week_monday = (((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date - 6)) AND (coach_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ((efg_profiles p
     JOIN efg_organizations o ON ((o.id = p.organization_id)))
     JOIN efg_consents c ON (((c.student_id = p.user_id) AND (c.organization_id = o.id))))
  WHERE ((p.user_id = efg_sunday_rewards.student_id) AND (p.role = 'student'::text) AND (p.active = true) AND (o.coach_id = ( SELECT auth.uid() AS uid)) AND (c.accepted = true) AND (o.status = ANY (ARRAY['active'::text, 'trial'::text, 'grace'::text])) AND (EXISTS ( SELECT 1
           FROM efg_profiles coach
          WHERE ((coach.user_id = o.coach_id) AND (coach.active = true) AND (coach.role = ANY (ARRAY['coach'::text, 'admin'::text]))))))))));

CREATE POLICY "sunday_reward_student_read" ON "public"."efg_sunday_rewards" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((student_id = ( SELECT auth.uid() AS uid)));

GRANT UPDATE("is_read") ON "public"."efg_notifications" TO authenticated;

GRANT UPDATE("read_at") ON "public"."efg_notifications" TO authenticated;

CREATE TRIGGER efg_coach_relaunch_shared_notice AFTER INSERT OR UPDATE OF shared_at, revision ON public.efg_coach_relaunch_intakes FOR EACH ROW EXECUTE FUNCTION efg_private.coach_notify_shared_relaunch_intake();

CREATE TRIGGER efg_consent_identity_immutable BEFORE UPDATE ON public.efg_consents FOR EACH ROW EXECUTE FUNCTION efg_private.protect_consent_identity();

CREATE TRIGGER efg_food_plan_lock_owner BEFORE UPDATE ON public.efg_food_plans FOR EACH ROW EXECUTE FUNCTION efg_private.food_plan_immutable_owner();

CREATE TRIGGER efg_verify_guide_goal BEFORE INSERT OR UPDATE ON public.efg_food_plans FOR EACH ROW EXECUTE FUNCTION efg_private.verify_guide_goal();

CREATE TRIGGER trg_efg_notify_food_guide AFTER INSERT OR UPDATE ON public.efg_food_plans FOR EACH ROW EXECUTE FUNCTION efg_notify_food_guide();

CREATE TRIGGER trg_efg_notify_goal AFTER INSERT ON public.efg_goals FOR EACH ROW EXECUTE FUNCTION efg_notify_goal();

DO $acl$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='efg_private' OR n.nspname='public' AND p.proname LIKE 'efg_%' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public,anon,authenticated,service_role',f.sig); END LOOP; END $acl$;

grant execute on function public.efg_accept_pilot_participation(text,boolean,boolean)
 to authenticated;

grant execute on function public.efg_revoke_pilot_participation(text)
 to authenticated;

grant execute on function public.efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)
 to authenticated;

grant execute on function public.efg_save_coach_plan_draft(
 uuid,jsonb,jsonb,timestamptz,integer,bigint) to authenticated;

grant execute on function public.efg_legal_current_status()
 to authenticated;

grant execute on function public.efg_accept_current_legal(uuid,uuid,boolean,boolean)
 to authenticated;

DO $identity_acl$ DECLARE sig regprocedure; BEGIN SELECT p.oid::regprocedure INTO STRICT sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='efg_private' AND p.proname='coach_guide_foods_verified' AND pg_get_function_identity_arguments(p.oid)='p_guide jsonb';  END $identity_acl$;

DO $identity_acl$ DECLARE sig regprocedure; BEGIN SELECT p.oid::regprocedure INTO STRICT sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='efg_private' AND p.proname='coach_has_student' AND pg_get_function_identity_arguments(p.oid)='p_student uuid'; EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'authenticated'); END $identity_acl$;

DO $identity_acl$ DECLARE sig regprocedure; BEGIN SELECT p.oid::regprocedure INTO STRICT sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='efg_accept_current_legal' AND pg_get_function_identity_arguments(p.oid)='p_terms_id uuid, p_privacy_id uuid, p_terms_checked boolean, p_privacy_checked boolean'; EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'service_role'); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'authenticated'); END $identity_acl$;

DO $identity_acl$ DECLARE sig regprocedure; BEGIN SELECT p.oid::regprocedure INTO STRICT sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='efg_accept_pilot_participation' AND pg_get_function_identity_arguments(p.oid)='p_version text, p_participation boolean, p_sharing boolean'; EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'service_role'); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'authenticated'); END $identity_acl$;

DO $identity_acl$ DECLARE sig regprocedure; BEGIN SELECT p.oid::regprocedure INTO STRICT sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='efg_save_coach_plan_draft' AND pg_get_function_identity_arguments(p.oid)='p_student uuid, p_goal jsonb, p_guide jsonb, p_intake_updated_at timestamp with time zone, p_intake_revision integer, p_expected_revision bigint'; EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'service_role'); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'authenticated'); END $identity_acl$;

DO $identity_acl$ DECLARE sig regprocedure; BEGIN SELECT p.oid::regprocedure INTO STRICT sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='efg_submit_coach_relaunch_intake' AND pg_get_function_identity_arguments(p.oid)='p_completed_version text, p_payload jsonb, p_expected_revision integer, p_share_with_coach boolean'; EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'service_role'); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',sig,'authenticated'); END $identity_acl$;

GRANT USAGE ON SCHEMA efg_private TO authenticated;

ALTER TABLE public.efg_organizations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.efg_organizations FROM public,anon,authenticated;

ALTER TABLE public.efg_profiles ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.efg_profiles FROM public,anon,authenticated; GRANT SELECT ON public.efg_profiles TO authenticated; CREATE POLICY fixture_profiles_read ON public.efg_profiles FOR SELECT TO authenticated USING(user_id=auth.uid() OR efg_private.coach_has_student(user_id));

GRANT EXECUTE ON FUNCTION efg_private.student_belongs_to_coach(uuid) TO authenticated;

COMMIT;
