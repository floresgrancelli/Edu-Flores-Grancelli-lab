begin;

create table public.efg_meal_reminder_preferences (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 meal text not null check (meal in ('desayuno','media_manana','almuerzo','media_tarde','merienda','cena')),
 remind_at time(0) not null check (remind_at < time '24:00' and extract(second from remind_at) = 0),
 time_zone text not null check (length(time_zone) between 1 and 128),
 enabled boolean not null default false,
 primary key (user_id, meal)
);

create table public.efg_meal_reminder_devices (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 endpoint text not null check (endpoint like 'https://%' and length(endpoint) <= 2048),
 p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
 auth_key text not null check (auth_key ~ '^[A-Za-z0-9_-]{22}$'),
 primary key (user_id, endpoint),
 unique (endpoint)
);

alter table public.efg_meal_reminder_preferences enable row level security;
alter table public.efg_meal_reminder_devices enable row level security;

create policy meal_reminder_preferences_owner on public.efg_meal_reminder_preferences
 for all to authenticated using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));
create policy meal_reminder_devices_owner on public.efg_meal_reminder_devices
 for all to authenticated using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));

revoke all on public.efg_meal_reminder_preferences, public.efg_meal_reminder_devices from public, anon, authenticated;
grant select, insert, update, delete on public.efg_meal_reminder_preferences, public.efg_meal_reminder_devices to authenticated;
grant select, delete on public.efg_meal_reminder_preferences, public.efg_meal_reminder_devices to service_role;

commit;
