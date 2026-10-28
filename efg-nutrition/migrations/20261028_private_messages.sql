-- EFG Nutrition Pro private coach/student inbox. Additive only; never exposes messages to unrelated coaches or admins.
create table if not exists public.efg_messages (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references auth.users(id),
 coach_id uuid not null references auth.users(id),
 sender_id uuid not null references auth.users(id),
 body text not null check (char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 constraint efg_messages_sender_party check (sender_id in (student_id,coach_id))
);
create index if not exists efg_messages_student_coach_time on public.efg_messages(student_id,coach_id,created_at desc);
alter table public.efg_messages enable row level security;
revoke all on public.efg_messages from public,anon,authenticated;
grant select,insert on public.efg_messages to authenticated;
grant update (read_at) on public.efg_messages to authenticated;
drop policy if exists "efg messages party read" on public.efg_messages;
drop policy if exists "efg messages party write" on public.efg_messages;
drop policy if exists "efg messages recipient read receipt" on public.efg_messages;
-- The student's own history remains readable; coach sees only active consented relationships.
create policy "efg messages party read" on public.efg_messages for select to authenticated using (
 student_id=(select auth.uid()) or
 (coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id))
);
-- Both parties must be actively linked, and sender_id must equal the authenticated caller.
create policy "efg messages party write" on public.efg_messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and
 ((coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id))
 or
 (student_id=(select auth.uid()) and exists (
  select 1 from public.efg_profiles p
  join public.efg_organizations o on o.id=p.organization_id
  join public.efg_consents c on c.student_id=p.user_id and c.organization_id=o.id
  join public.efg_profiles coach on coach.user_id=o.coach_id
  where p.user_id=efg_messages.student_id and p.active and p.role='student' and
        c.accepted and o.coach_id=efg_messages.coach_id and
        o.status in ('trial','active','grace') and coach.active and
        (coach.role='coach' or (coach.role='admin' and o.is_test))
 ))));
-- Only the recipient can acknowledge; column-level GRANT prevents editing text/participants.
create policy "efg messages recipient read receipt" on public.efg_messages for update to authenticated
 using(sender_id<>(select auth.uid()) and
       (student_id=(select auth.uid()) or (coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id))))
 with check(sender_id<>(select auth.uid()) and
       (student_id=(select auth.uid()) or (coach_id=(select auth.uid()) and efg_private.coach_has_student(student_id))));
create or replace function public.efg_notify_message() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.efg_notifications(recipient_id,actor_id,kind,event_key,title,body,target_tab,target_student)
 values (case when new.sender_id=new.student_id then new.coach_id else new.student_id end,
         new.sender_id,'message','msg:'||new.id::text,
         'Nuevo mensaje','Tenés un mensaje nuevo en EFG Nutrition Pro.','messages',
         case when new.sender_id=new.student_id then new.student_id else null end)
 on conflict(recipient_id,event_key) do nothing;
 return new;
end $$;
revoke all on function public.efg_notify_message() from public,anon,authenticated;
drop trigger if exists trg_efg_notify_message on public.efg_messages;
create trigger trg_efg_notify_message after insert on public.efg_messages
for each row execute function public.efg_notify_message();
