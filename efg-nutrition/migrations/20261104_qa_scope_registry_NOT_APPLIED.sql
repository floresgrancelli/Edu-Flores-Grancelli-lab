-- CANDIDATE ONLY. No enrollment, switch change or integration installed here.
-- Integrate all three consumers in one validated transaction before enrollment.
begin;
create table efg_private.p29_qa_release_scope (
 student_id uuid primary key references public.efg_profiles(user_id),
 organization_id uuid not null references public.efg_organizations(id),
 coach_id uuid not null references public.efg_profiles(user_id),
 created_at timestamptz not null default pg_catalog.clock_timestamp(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 reason text not null check (length(reason)>0),
 check (expires_at>created_at and expires_at<=created_at+interval '24 hours')
);
alter table efg_private.p29_qa_release_scope enable row level security;
revoke all on efg_private.p29_qa_release_scope from public,anon,authenticated;
-- Registered but invalid must RAISE, not return false and fall into legacy OFF.
create function efg_private.p29_qa_scope_required(p_student uuid,p_actor_kind text)
returns boolean language plpgsql security definer set search_path='' as $$
declare q efg_private.p29_qa_release_scope%rowtype; actor uuid:=auth.uid();
begin
 if p_actor_kind is null or p_actor_kind not in ('student','coach') then
  raise exception 'Invalid QA actor kind' using errcode='42501';
 end if;
 select * into q from efg_private.p29_qa_release_scope where student_id=p_student for share;
 if not found then return false; end if;
 if q.revoked_at is not null or q.expires_at<=pg_catalog.clock_timestamp() or q.created_at>pg_catalog.clock_timestamp() then
  raise exception 'QA scope expired or revoked' using errcode='42501';
 end if;
 perform 1 from public.efg_profiles s
 join public.efg_organizations o on o.id=s.organization_id
 join public.efg_profiles c on c.user_id=o.coach_id
 where s.user_id=q.student_id and s.role='student' and s.active
 and o.id=q.organization_id and o.is_test is true and o.coach_id=q.coach_id
 and c.role='coach' and c.active
 for share of s,o,c;
 if not found or actor is null or actor is distinct from
  (case when p_actor_kind='student' then q.student_id else q.coach_id end) then
  raise exception 'QA assignment or signed actor invalid' using errcode='42501';
 end if;
 return true;
end $$;
revoke all on function efg_private.p29_qa_scope_required(uuid,text) from public,anon,authenticated;
commit;
