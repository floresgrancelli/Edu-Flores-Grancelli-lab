truncate public.efg_daily_logs;
alter table public.efg_daily_logs
 add primary key(student_id,log_day),
 alter column meals set default '{}',
 alter column skipped set default '{}',
 add column sports jsonb not null default '[]',
 add column totals jsonb not null default '{}',
 add column updated_at timestamptz not null default now();
create table public.efg_habitual_meals(
 id uuid primary key, student_id uuid not null, meal_slot text not null, items jsonb not null
);
create table public.efg_profiles(user_id uuid primary key, active boolean, role text);
grant select,insert,update on public.efg_daily_logs to authenticated;
