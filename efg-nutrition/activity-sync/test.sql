set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$
declare t timestamptz:=statement_timestamp();
 r public.efg_daily_device_activity;
begin
 r:=public.efg_sync_device_activity('00000000-0000-4000-8000-000000000001','health_connect',t,2000,1300,null);
 if r.steps<>2000 or r.active_kcal is not null then raise exception 'Invalid first snapshot'; end if;
 r:=public.efg_sync_device_activity('00000000-0000-4000-8000-000000000001','health_connect',t+interval '1 millisecond',2100,1400,55);
 if r.steps<>2100 or r.active_kcal<>55 then raise exception 'New snapshot not applied'; end if;
 r:=public.efg_sync_device_activity('00000000-0000-4000-8000-000000000001','health_connect',t,2000,1300,null);
 if r.steps<>2100 then raise exception 'Older snapshot overwrote total'; end if;
 if (select count(*) from public.efg_daily_device_activity)<>1 then raise exception 'Duplicate daily rows'; end if;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$
begin
 if exists(select 1 from public.efg_daily_device_activity) then raise exception 'Cross-account read'; end if;
 begin
  perform public.efg_sync_device_activity('00000000-0000-4000-8000-000000000001',
   'health_connect',statement_timestamp(),1,null,null);
  raise exception 'Stale account request was accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
do $$
begin
 if has_function_privilege('anon','public.efg_sync_device_activity(uuid,text,timestamptz,integer,numeric,numeric)','execute')
 then raise exception 'Anonymous write available'; end if;
end $$;
