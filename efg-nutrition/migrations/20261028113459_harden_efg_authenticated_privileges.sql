-- EFG Nutrition Pro — privilege hardening applied and verified on 2026-10-28.
-- Supabase migration history: 20261028113459 harden_efg_authenticated_privileges_20261028.
-- This SQL is a versioned record; do not reapply to production automatically.
-- TRUNCATE bypasses row-level security, while TRIGGER and REFERENCES are schema-level capabilities.
-- Ordinary SELECT/INSERT/UPDATE/DELETE and necessary RPC permissions are intentionally unchanged.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
  public.efg_activities,
  public.efg_billing_settings,
  public.efg_consents,
  public.efg_daily_logs,
  public.efg_food_plans,
  public.efg_goals,
  public.efg_habitual_meals,
  public.efg_invitations,
  public.efg_organizations,
  public.efg_payments,
  public.efg_personal_recipes,
  public.efg_personal_targets,
  public.efg_profiles,
  public.efg_weekly_reports,
  public.efg_weights
FROM authenticated;
