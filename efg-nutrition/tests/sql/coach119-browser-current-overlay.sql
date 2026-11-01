-- PRIVATE LOCAL-ONLY schema overlay; not a production migration or restore.
-- Metadata cyjvddhimbsfipjfctsl observed 2026-11-01 13:00:17 UTC.
-- No user records copied. Apply only through guarded fresh local setup.
begin;
do $guard$ begin
 if current_database() <> 'postgres'
   or not exists(select 1 from efg_private.nut57_isolated_staging_marker where local_only)
   or exists(select 1 from auth.users)
 then raise exception 'Empty isolated local fixture required'; end if;
end $guard$;
set local search_path = public, pg_catalog;

-- SDK form fixture addition: the older API-only setup grants SELECT only.
-- Not a claim that these statements are an exact hosted policy export.
-- No identity column, INSERT or DELETE privilege; immutable-owner trigger remains.
grant update(accepted,email_report_opt_in,updated_at) on public.efg_consents to authenticated;
create policy sdk_local_consent_owner_update on public.efg_consents
 for update to authenticated
 using (student_id=(select auth.uid()) and exists(
  select 1 from public.efg_profiles p where p.user_id=(select auth.uid())
   and p.role='student' and p.active=true and p.organization_id=efg_consents.organization_id))
 with check (student_id=(select auth.uid()) and exists(
  select 1 from public.efg_profiles p where p.user_id=(select auth.uid())
   and p.role='student' and p.active=true and p.organization_id=efg_consents.organization_id));


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
alter table public."efg_activities" enable row level security;
revoke all on public."efg_activities" from public, anon, authenticated;
grant INSERT on public."efg_activities" to "authenticated";
grant SELECT on public."efg_activities" to "authenticated";
grant UPDATE on public."efg_activities" to "authenticated";
grant DELETE on public."efg_activities" to "authenticated";
create policy "activity_private_read" on public."efg_activities" for SELECT to "authenticated" using (((student_id = ( SELECT auth.uid() AS uid)) OR efg_private.coach_has_student(student_id)));
create policy "activity_self_delete" on public."efg_activities" for DELETE to "authenticated" using ((student_id = ( SELECT auth.uid() AS uid)));
create policy "activity_self_insert" on public."efg_activities" for INSERT to "authenticated" with check ((student_id = ( SELECT auth.uid() AS uid)));
create policy "activity_self_update" on public."efg_activities" for UPDATE to "authenticated" using ((student_id = ( SELECT auth.uid() AS uid))) with check ((student_id = ( SELECT auth.uid() AS uid)));

create table public."efg_billing_settings" (
 "id" integer default 1 not null,
 "alias" text,
 "updated_at" timestamp with time zone default now() not null,
 "additional_aliases" text[] default '{}'::text[] not null,
 constraint "efg_billing_alias_count" CHECK ((cardinality(additional_aliases) <= 2)),
 constraint "efg_billing_settings_id_check" CHECK ((id = 1)),
 constraint "efg_billing_settings_pkey" PRIMARY KEY (id)
);
alter table public."efg_billing_settings" enable row level security;
revoke all on public."efg_billing_settings" from public, anon, authenticated;
grant INSERT on public."efg_billing_settings" to "authenticated";
grant SELECT on public."efg_billing_settings" to "authenticated";
grant UPDATE on public."efg_billing_settings" to "authenticated";
grant DELETE on public."efg_billing_settings" to "authenticated";
create policy "billing_signed_in_read" on public."efg_billing_settings" for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM efg_profiles
  WHERE ((efg_profiles.user_id = ( SELECT auth.uid() AS uid)) AND efg_profiles.active))));

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
alter table public."efg_invitations" enable row level security;
revoke all on public."efg_invitations" from public, anon, authenticated;
grant INSERT on public."efg_invitations" to "authenticated";
grant SELECT on public."efg_invitations" to "authenticated";
grant UPDATE on public."efg_invitations" to "authenticated";
grant DELETE on public."efg_invitations" to "authenticated";
create policy "invites_admin_and_coach_read" on public."efg_invitations" for SELECT to "authenticated" using ((((role = 'coach'::text) AND efg_private.is_admin()) OR (EXISTS ( SELECT 1
   FROM efg_organizations o
  WHERE ((o.id = efg_invitations.organization_id) AND (o.coach_id = ( SELECT auth.uid() AS uid)))))));

-- Existing nut56 overlay already supplies organization columns/constraints.
alter table public."efg_organizations" enable row level security;
revoke all on public."efg_organizations" from public, anon, authenticated;
grant INSERT on public."efg_organizations" to "authenticated";
grant SELECT on public."efg_organizations" to "authenticated";
grant UPDATE on public."efg_organizations" to "authenticated";
grant DELETE on public."efg_organizations" to "authenticated";
create policy "org_admin_and_owner_select" on public."efg_organizations" for SELECT to "authenticated" using ((( SELECT efg_private.is_admin() AS is_admin) OR (coach_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM efg_profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.role = 'student'::text) AND (p.organization_id = efg_organizations.id) AND p.active)))));

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
alter table public."efg_payments" enable row level security;
revoke all on public."efg_payments" from public, anon, authenticated;
grant INSERT on public."efg_payments" to "authenticated";
grant SELECT on public."efg_payments" to "authenticated";
grant UPDATE on public."efg_payments" to "authenticated";
grant DELETE on public."efg_payments" to "authenticated";
create policy "payments_party_read" on public."efg_payments" for SELECT to "authenticated" using (((payer_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));

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
alter table public."efg_personal_targets" enable row level security;
revoke all on public."efg_personal_targets" from public, anon, authenticated;
grant INSERT on public."efg_personal_targets" to "authenticated";
grant SELECT on public."efg_personal_targets" to "authenticated";
grant UPDATE on public."efg_personal_targets" to "authenticated";
grant DELETE on public."efg_personal_targets" to "authenticated";
create policy "coach_or_admin_personal_target_insert" on public."efg_personal_targets" for INSERT to "authenticated" with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles
  WHERE ((efg_profiles.user_id = auth.uid()) AND (efg_profiles.role = ANY (ARRAY['admin'::text, 'coach'::text])) AND efg_profiles.active)))));
create policy "coach_or_admin_personal_target_update" on public."efg_personal_targets" for UPDATE to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles
  WHERE ((efg_profiles.user_id = auth.uid()) AND (efg_profiles.role = ANY (ARRAY['admin'::text, 'coach'::text])) AND efg_profiles.active))))) with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM efg_profiles
  WHERE ((efg_profiles.user_id = auth.uid()) AND (efg_profiles.role = ANY (ARRAY['admin'::text, 'coach'::text])) AND efg_profiles.active)))));
create policy "own_personal_target_read" on public."efg_personal_targets" for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));

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
alter table public."efg_weights" enable row level security;
revoke all on public."efg_weights" from public, anon, authenticated;
grant INSERT on public."efg_weights" to "authenticated";
grant SELECT on public."efg_weights" to "authenticated";
grant UPDATE on public."efg_weights" to "authenticated";
grant DELETE on public."efg_weights" to "authenticated";
create policy "weight_private_read" on public."efg_weights" for SELECT to "authenticated" using (((student_id = ( SELECT auth.uid() AS uid)) OR efg_private.coach_has_student(student_id)));
create policy "weight_self_delete" on public."efg_weights" for DELETE to "authenticated" using ((student_id = ( SELECT auth.uid() AS uid)));
create policy "weight_self_insert" on public."efg_weights" for INSERT to "authenticated" with check ((student_id = ( SELECT auth.uid() AS uid)));
create policy "weight_self_update" on public."efg_weights" for UPDATE to "authenticated" using ((student_id = ( SELECT auth.uid() AS uid))) with check ((student_id = ( SELECT auth.uid() AS uid)));

-- Exact function body from candidate migration; no success stub.
create or replace function public.efg_claim_invitation()
 returns jsonb language plpgsql security definer set search_path to ''
as $fn$
declare v_uid uuid:=auth.uid(); v_email text; v_inv public.efg_invitations%rowtype; v_existing public.efg_profiles%rowtype;
begin
 if v_uid is null then raise exception 'Login required'; end if;
 select lower(email) into v_email from auth.users where id=v_uid and email_confirmed_at is not null;
 if v_email is null then raise exception 'Verify your email first'; end if;
 select * into v_existing from public.efg_profiles where user_id=v_uid;
 if found then return jsonb_build_object('role',v_existing.role,'status','existing'); end if;
 select * into v_inv from public.efg_invitations
  where lower(email)=v_email and claimed_by is null and revoked_at is null
  order by created_at desc limit 1 for update;
 if not found then raise exception 'Cuenta aún no habilitada por EFG o tu coach'; end if;
 if v_inv.role='coach' then
  update public.efg_organizations set coach_id=v_uid where id=v_inv.organization_id and coach_id is null;
  if not found then raise exception 'Entrenador ya asignado'; end if;
 elsif v_inv.role='student' then
  if not exists(select 1 from public.efg_organizations o
      where o.id=v_inv.organization_id and o.status in ('trial','active','grace')
        and (o.is_test or (o.status='active' and o.paid_through >= (now() at time zone 'America/Argentina/Buenos_Aires')::date)))
  then raise exception 'La licencia del coach no está activa para incorporar alumnos'; end if;
 end if;
 insert into public.efg_profiles(user_id,email,nickname,role,organization_id)
 values(v_uid,v_email,v_inv.nickname,v_inv.role,
        case when v_inv.role='student' then v_inv.organization_id else null end);
 if v_inv.role='student' then
   insert into public.efg_consents(student_id,organization_id,accepted)
   values(v_uid,v_inv.organization_id,false);
 end if;
 update public.efg_invitations set claimed_by=v_uid where id=v_inv.id;
 return jsonb_build_object('role',v_inv.role,'status','claimed');
end $fn$;

-- Restrict this local RPC to authenticated; no hosted privilege alteration.
revoke all on function public.efg_claim_invitation() from public, anon, authenticated;
grant execute on function public.efg_claim_invitation() to authenticated;
commit;

