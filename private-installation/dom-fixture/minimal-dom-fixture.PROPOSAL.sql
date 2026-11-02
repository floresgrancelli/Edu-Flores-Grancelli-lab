-- SYNTHETIC DOM FIXTURE ONLY. Never a product/hosted migration.
-- Transaction and attested session marker supplied exclusively by install.mjs.
DO $guard$ BEGIN
 IF current_user<>'postgres' OR current_database()<>'postgres'
 OR current_setting('efg.qa.dom_fixture',true) IS DISTINCT FROM 'attested_empty_incremental'
 OR EXISTS(SELECT 1 FROM auth.users)
 OR EXISTS(SELECT 1 FROM public.efg_profiles)
 OR EXISTS(SELECT 1 FROM public.efg_organizations)
 OR to_regprocedure('public.efg_claim_invitation()') IS NOT NULL
 THEN RAISE EXCEPTION 'Attested empty DOM fixture required'; END IF;
END $guard$;
SET LOCAL search_path=public,pg_catalog;
create table public."efg_activities" (
 "student_id" uuid not null,
 "activity_day" date not null,
 "steps" integer,
 "exercise_minutes" integer,
 "kind" text,
 "walking_pace" text,
 "walking_height_cm" numeric(5,1),
 "walking_weight_kg" numeric(5,1),
 constraint "efg_activities_exercise_minutes_check" CHECK (((exercise_minutes >= 0) AND (exercise_minutes <= 1440))),
 constraint "efg_activities_pkey" PRIMARY KEY (student_id, activity_day),
 constraint "efg_activities_steps_check" CHECK (((steps >= 0) AND (steps <= 100000))),
 constraint "efg_activities_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE,
 constraint "efg_activity_walking_height_valid" CHECK (((walking_height_cm IS NULL) OR ((walking_height_cm >= (100)::numeric) AND (walking_height_cm <= (250)::numeric)))),
 constraint "efg_activity_walking_pace_valid" CHECK (((walking_pace IS NULL) OR (walking_pace = ANY (ARRAY['slow'::text, 'moderate'::text, 'brisk'::text])))),
 constraint "efg_activity_walking_weight_valid" CHECK (((walking_weight_kg IS NULL) OR ((walking_weight_kg >= (20)::numeric) AND (walking_weight_kg <= (400)::numeric))))
);

create table public."efg_billing_settings" (
 "id" integer default 1 not null,
 "alias" text,
 "updated_at" timestamp with time zone default now() not null,
 "additional_aliases" text[] default '{}'::text[] not null,
 constraint "efg_billing_alias_count" CHECK ((cardinality(additional_aliases) <= 2)),
 constraint "efg_billing_settings_id_check" CHECK ((id = 1)),
 constraint "efg_billing_settings_pkey" PRIMARY KEY (id)
);

create table public."efg_invitations" (
 "id" uuid default gen_random_uuid() not null,
 "email" text not null,
 "nickname" text not null,
 "role" text not null,
 "organization_id" uuid,
 "invited_by" uuid,
 "claimed_by" uuid,
 "created_at" timestamp with time zone default now() not null,
 "revoked_at" timestamp with time zone,
 constraint "efg_invitations_claimed_by_fkey" FOREIGN KEY (claimed_by) REFERENCES auth.users(id),
 constraint "efg_invitations_claimed_by_key" UNIQUE (claimed_by),
 constraint "efg_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id),
 constraint "efg_invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES efg_organizations(id),
 constraint "efg_invitations_pkey" PRIMARY KEY (id),
 constraint "efg_invitations_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'coach'::text, 'student'::text]))),
 constraint "invitation_org_role" CHECK ((((role = ANY (ARRAY['student'::text, 'coach'::text])) AND (organization_id IS NOT NULL)) OR ((role = 'admin'::text) AND (organization_id IS NULL))))
);

create table public."efg_payments" (
 "id" uuid default gen_random_uuid() not null,
 "payer_id" uuid not null,
 "recipient_id" uuid not null,
 "organization_id" uuid,
 "payment_kind" text not null,
 "amount_ars" numeric(12,2) not null,
 "period_label" text not null,
 "alias_snapshot" text not null,
 "receipt_path" text not null,
 "status" text default 'pending'::text not null,
 "reviewed_at" timestamp with time zone,
 "created_at" timestamp with time zone default now() not null,
 constraint "efg_payments_amount_ars_check" CHECK ((amount_ars > (0)::numeric)),
 constraint "efg_payments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES efg_organizations(id),
 constraint "efg_payments_payer_id_fkey" FOREIGN KEY (payer_id) REFERENCES auth.users(id),
 constraint "efg_payments_payment_kind_check" CHECK ((payment_kind = ANY (ARRAY['student_coach'::text, 'coach_efg'::text]))),
 constraint "efg_payments_pkey" PRIMARY KEY (id),
 constraint "efg_payments_receipt_path_key" UNIQUE (receipt_path),
 constraint "efg_payments_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id),
 constraint "efg_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

create table public."efg_personal_targets" (
 "user_id" uuid not null,
 "kcal" integer not null,
 "protein_g" integer not null,
 "carb_g" integer not null,
 "fat_g" integer not null,
 "fiber_g" integer not null,
 "updated_at" timestamp with time zone default now() not null,
 constraint "efg_personal_targets_carb_g_check" CHECK (((carb_g >= 0) AND (carb_g <= 2000))),
 constraint "efg_personal_targets_fat_g_check" CHECK (((fat_g >= 0) AND (fat_g <= 1000))),
 constraint "efg_personal_targets_fiber_g_check" CHECK (((fiber_g >= 0) AND (fiber_g <= 150))),
 constraint "efg_personal_targets_kcal_check" CHECK (((kcal >= 1200) AND (kcal <= 10000))),
 constraint "efg_personal_targets_pkey" PRIMARY KEY (user_id),
 constraint "efg_personal_targets_protein_g_check" CHECK (((protein_g >= 0) AND (protein_g <= 1000))),
 constraint "efg_personal_targets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE
);

create table public."efg_weights" (
 "student_id" uuid not null,
 "measured_on" date not null,
 "kg" numeric(6,2) not null,
 "created_at" timestamp with time zone default now() not null,
 "measured_time" time without time zone,
 constraint "efg_weights_kg_check" CHECK (((kg >= (20)::numeric) AND (kg <= (400)::numeric))),
 constraint "efg_weights_pkey" PRIMARY KEY (student_id, measured_on),
 constraint "efg_weights_student_id_fkey" FOREIGN KEY (student_id) REFERENCES efg_profiles(user_id) ON DELETE CASCADE
);

create table public.efg_daily_logs(
 student_id uuid not null references public.efg_profiles(user_id),
 log_day date not null,
 meals jsonb not null default '{}'::jsonb,
 sports jsonb not null default '[]'::jsonb,
 skipped jsonb not null default '{}'::jsonb,
 totals jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(student_id,log_day)
);

create table public.efg_weekly_reports (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references auth.users(id) on delete cascade,
 coach_id uuid not null references auth.users(id),
 week_ending date not null,
 report_text text not null check(char_length(report_text) between 1 and 8000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(student_id,week_ending)
);
ALTER TABLE public.efg_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_activities FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_activities TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_activities FOR SELECT TO authenticated USING(student_id=auth.uid() OR efg_private.coach_has_student(student_id));
ALTER TABLE public.efg_billing_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_billing_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_billing_settings TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_billing_settings FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.efg_profiles p WHERE p.user_id=auth.uid() AND p.active));
ALTER TABLE public.efg_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_invitations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_invitations TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_invitations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.efg_organizations o WHERE o.id=efg_invitations.organization_id AND o.coach_id=auth.uid()));
ALTER TABLE public.efg_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_payments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_payments TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_payments FOR SELECT TO authenticated USING(payer_id=auth.uid() OR recipient_id=auth.uid());
ALTER TABLE public.efg_personal_targets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_personal_targets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_personal_targets TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_personal_targets FOR SELECT TO authenticated USING(user_id=auth.uid());
ALTER TABLE public.efg_weights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_weights FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_weights TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_weights FOR SELECT TO authenticated USING(student_id=auth.uid() OR efg_private.coach_has_student(student_id));
ALTER TABLE public.efg_daily_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_daily_logs FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_daily_logs TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_daily_logs FOR SELECT TO authenticated USING(student_id=auth.uid() OR efg_private.coach_has_student(student_id));
ALTER TABLE public.efg_weekly_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.efg_weekly_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.efg_weekly_reports TO authenticated;
CREATE POLICY dom_fixture_read ON public.efg_weekly_reports FOR SELECT TO authenticated USING(student_id=auth.uid() OR (coach_id=auth.uid() AND efg_private.coach_has_student(student_id)));
-- Organization columns already exist; no ALTER COLUMN, no DML permission.
GRANT SELECT ON public.efg_organizations TO authenticated;
CREATE POLICY dom_fixture_org_read ON public.efg_organizations FOR SELECT TO authenticated USING(
 coach_id=auth.uid() OR EXISTS(SELECT 1 FROM public.efg_profiles p WHERE p.user_id=auth.uid() AND p.active AND p.role='student' AND p.organization_id=efg_organizations.id));
-- Existing-account hydration only, deliberately NOT invitation acceptance.
-- Verifies actual local Auth and existing profile. Never inserts/claims anything.
CREATE FUNCTION public.efg_claim_invitation() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE p public.efg_profiles%rowtype;BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Verified authentication required' USING ERRCODE='42501';END IF;
 SELECT * INTO p FROM public.efg_profiles WHERE user_id=auth.uid() AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Existing fixture account required; invitation claim unsupported' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('role',p.role,'status','existing');
END $f$;
REVOKE ALL ON FUNCTION public.efg_claim_invitation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.efg_claim_invitation() TO authenticated;
