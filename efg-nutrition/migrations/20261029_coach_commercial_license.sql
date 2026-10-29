-- EFG Nutrition Pro · licencias comerciales.
-- Aplicar una sola vez antes de publicar el panel comercial y verificar la seguridad.
-- Solo nuevas columnas y RPC. Los alumnos, diarios, pagos y test EFG no se tocan.
alter table public.efg_organizations
  add column if not exists license_fee_ars numeric(12,2);
alter table public.efg_organizations
  add column if not exists paid_through date;
alter table public.efg_organizations
  add constraint efg_license_fee_range check
    (license_fee_ars is null or (license_fee_ars>0 and license_fee_ars<=10000000));

alter table public.efg_billing_settings
 add column if not exists additional_aliases text[] not null default '{}'::text[];
alter table public.efg_billing_settings
 add constraint efg_billing_alias_count check(cardinality(additional_aliases)<=2);

create or replace function public.efg_set_platform_aliases(
 p_primary text,p_secondary text default null,p_tertiary text default null
) returns boolean language plpgsql security definer set search_path to ''
as $fn$
declare v_main text:=trim(coalesce(p_primary,''));
        v_other text:=trim(coalesce(p_secondary,''));
        v_third text:=trim(coalesce(p_tertiary,''));
begin
 if not efg_private.is_admin() then raise exception 'Sólo EFG administra los alias de cobro'; end if;
 if length(v_main) not between 3 and 100
   or length(v_other)>100 or length(v_third)>100
   or (v_other<>'' and length(v_other)<3) or (v_third<>'' and length(v_third)<3)
   or (v_other<>'' and lower(v_other)=lower(v_main))
   or (v_third<>'' and (lower(v_third)=lower(v_main) or lower(v_third)=lower(v_other)))
 then raise exception 'Alias inválido o repetido'; end if;
 update public.efg_billing_settings
   set alias=v_main,additional_aliases=array_remove(array[v_other,v_third],''::text),updated_at=now()
 where id=1;
 if not found then raise exception 'Configuración EFG no encontrada'; end if;
 return true;
end $fn$;
revoke all on function public.efg_set_platform_aliases(text,text,text) from public,anon;
grant execute on function public.efg_set_platform_aliases(text,text,text) to authenticated;

-- Nueva contratación: la invitación registra un coach comercial PENDIENTE.
-- Ni el acceso inicial ni subir un comprobante activan la licencia.
create or replace function public.efg_invite_coach(p_email text,p_name text,p_seats integer)
 returns uuid language plpgsql security definer set search_path to ''
as $fn$
declare v_org uuid; v_email text:=lower(trim(p_email)); v_name text:=trim(p_name);
begin
 if not efg_private.is_admin() then raise exception 'Only EFG administrator'; end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or length(v_name) not between 2 and 70 or p_seats not between 1 and 10000
 then raise exception 'Datos de coach inválidos'; end if;
 if exists(select 1 from public.efg_profiles where lower(email)=v_email)
  or exists(select 1 from public.efg_invitations where lower(email)=v_email and revoked_at is null)
 then raise exception 'El correo ya está registrado o invitado'; end if;
 insert into public.efg_organizations(name,seat_limit,status,is_test)
 values(v_name,p_seats,'suspended',false) returning id into v_org;
 insert into public.efg_invitations(email,nickname,role,organization_id,invited_by)
 values(v_email,v_name,'coach',v_org,auth.uid());
 return v_org;
end $fn$;

create or replace function public.efg_offer_coach(
 p_email text,p_name text,p_seats integer,p_fee_ars numeric
) returns uuid language plpgsql security definer set search_path to ''
as $fn$
declare v_org uuid;
begin
 if not efg_private.is_admin() then raise exception 'Sólo EFG puede contratar'; end if;
 if p_fee_ars is null or p_fee_ars<=0 or p_fee_ars>10000000
 then raise exception 'Definí un precio mensual válido'; end if;
 if not exists(select 1 from public.efg_billing_settings where id=1
               and alias is not null and length(trim(alias))>=3)
 then raise exception 'Configurá primero tu alias de EFG'; end if;
 v_org:=public.efg_invite_coach(p_email,p_name,p_seats);
 update public.efg_organizations set license_fee_ars=p_fee_ars where id=v_org;
 return v_org;
end $fn$;
revoke all on function public.efg_offer_coach(text,text,integer,numeric) from public,anon;
grant execute on function public.efg_offer_coach(text,text,integer,numeric) to authenticated;

create or replace function public.efg_set_coach_plan(p_org uuid,p_seats integer,p_fee_ars numeric)
 returns boolean language plpgsql security definer set search_path to ''
as $fn$
declare v_org public.efg_organizations%rowtype; v_used integer;
begin
 if not efg_private.is_admin() then raise exception 'Sólo EFG modifica los contratos'; end if;
 if p_seats not between 1 and 10000 or p_fee_ars is null or p_fee_ars<=0 or p_fee_ars>10000000
 then raise exception 'Cupos o precio inválidos'; end if;
 select * into v_org from public.efg_organizations where id=p_org and is_test=false for update;
 if not found then raise exception 'Coach comercial no encontrado'; end if;
 select (select count(*) from public.efg_profiles where organization_id=p_org and role='student' and active)
      +(select count(*) from public.efg_invitations where organization_id=p_org and role='student'
       and claimed_by is null and revoked_at is null) into v_used;
 if p_seats<v_used then raise exception 'No podés disminuir por debajo de los cupos ocupados'; end if;
 if p_seats is distinct from v_org.seat_limit or p_fee_ars is distinct from v_org.license_fee_ars then
   update public.efg_organizations set seat_limit=p_seats,license_fee_ars=p_fee_ars,
     status='suspended',paid_through=null where id=p_org;
 end if;
 return true;
end $fn$;
revoke all on function public.efg_set_coach_plan(uuid,integer,numeric) from public,anon;
grant execute on function public.efg_set_coach_plan(uuid,integer,numeric) to authenticated;

-- La ruta anterior de cambio de cupos queda restringida al laboratorio de EFG.
create or replace function public.efg_set_seats(p_org uuid,p_seats integer)
 returns boolean language plpgsql security definer set search_path to ''
as $fn$
declare v_org public.efg_organizations%rowtype; v_used integer;
begin
 if not efg_private.is_admin() or p_seats not between 1 and 10000
 then raise exception 'Operación no autorizada'; end if;
 select * into v_org from public.efg_organizations where id=p_org for update;
 if not found or not v_org.is_test
 then raise exception 'Para coaches comerciales usá Cambiar plan'; end if;
 select (select count(*) from public.efg_profiles where organization_id=p_org and role='student' and active)
      +(select count(*) from public.efg_invitations where organization_id=p_org and role='student'
       and claimed_by is null and revoked_at is null) into v_used;
 if p_seats<v_used then raise exception 'Hay más cupos ocupados que el límite pedido'; end if;
 update public.efg_organizations set seat_limit=p_seats where id=p_org;
 return true;
end $fn$;

-- Únicamente el administrador activa tras comprobar que hay pago aprobado
-- del MES y que el importe cubre el contrato.
create or replace function public.efg_activate_paid_coach(p_org uuid)
 returns boolean language plpgsql security definer set search_path to ''
as $fn$
declare v_org public.efg_organizations%rowtype; v_month text; v_last date;
begin
 if not efg_private.is_admin() then raise exception 'Sólo EFG puede activar licencias'; end if;
 select * into v_org from public.efg_organizations where id=p_org and not is_test for update;
 if not found or v_org.coach_id is null or v_org.license_fee_ars is null or v_org.license_fee_ars<=0
 then raise exception 'Faltan identidad o contrato de coach'; end if;
 v_month:=to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY-MM');
 if not exists(
  select 1 from public.efg_payments p
  where p.organization_id=p_org and p.payer_id=v_org.coach_id
    and p.payment_kind='coach_efg' and p.status='approved'
    and p.period_label=v_month and p.amount_ars>=v_org.license_fee_ars
 ) then raise exception 'EFG debe aprobar un pago del período que cubra el contrato'; end if;
 v_last:=((date_trunc('month',now() at time zone 'America/Argentina/Buenos_Aires')
           + interval '1 month - 1 day')::date);
 update public.efg_organizations set status='active',paid_through=v_last where id=p_org;
 return true;
end $fn$;
revoke all on function public.efg_activate_paid_coach(uuid) from public,anon;
grant execute on function public.efg_activate_paid_coach(uuid) to authenticated;

-- El panel antiguo NO puede reactivar licencias reales sin pago.
create or replace function public.efg_update_subscription(p_org uuid,p_status text)
 returns boolean language plpgsql security definer set search_path to ''
as $fn$
declare v_test boolean;
begin
 if not efg_private.is_admin() then raise exception 'Only EFG administrator'; end if;
 if p_status not in ('trial','active','grace','suspended') then raise exception 'Estado inválido'; end if;
 select is_test into v_test from public.efg_organizations where id=p_org;
 if not found then raise exception 'Organización no encontrada'; end if;
 if not v_test and p_status<>'suspended'
 then raise exception 'La activación comercial exige comprobante aprobado y función específica'; end if;
 update public.efg_organizations set status=p_status where id=p_org;
 return true;
end $fn$;

-- Para el coach con varios alias EFG: se utiliza la validación existente de
-- foto, propietario, importe, período y destinatario, luego se guarda
-- el alias efectivamente seleccionado en el comprobante.
create or replace function public.efg_submit_coach_payment(
 p_amount_ars numeric,p_period text,p_receipt_path text,p_alias text
) returns uuid language plpgsql security definer set search_path to ''
as $fn$
declare v_alias text:=trim(coalesce(p_alias,'')); v_id uuid;
begin
 if auth.uid() is null then raise exception 'Login requerido'; end if;
 if not exists(select 1 from public.efg_billing_settings
  where id=1 and (lower(alias)=lower(v_alias) or
    exists(select 1 from unnest(additional_aliases) a where lower(a)=lower(v_alias))))
 then raise exception 'Elegí un alias oficial vigente de EFG'; end if;
 v_id:=public.efg_submit_payment('coach_efg',p_amount_ars,p_period,p_receipt_path);
 update public.efg_payments set alias_snapshot=v_alias
   where id=v_id and payer_id=auth.uid() and payment_kind='coach_efg' and status='pending';
 if not found then raise exception 'No se pudo guardar el alias del comprobante'; end if;
 return v_id;
end $fn$;
revoke all on function public.efg_submit_coach_payment(numeric,text,text,text) from public,anon;
grant execute on function public.efg_submit_coach_payment(numeric,text,text,text) to authenticated;


-- Aun si el estado sigue "active" tras fin de mes, la autorización REAL
-- exige paid_through >= hoy. Laboratorio EFG mantiene reglas de prueba.
create or replace function efg_private.coach_has_student(p_student uuid)
 returns boolean language sql stable security definer set search_path to ''
as $fn$
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
$fn$;

-- En invitaciones también se valida pago mensual vigente.
create or replace function public.efg_invite_student(p_email text,p_name text)
 returns uuid language plpgsql security definer set search_path to ''
as $fn$
declare v_org public.efg_organizations%rowtype; v_email text:=lower(trim(p_email)); v_name text:=trim(p_name); v_taken integer; v_id uuid;
begin
 select * into v_org from public.efg_organizations where coach_id=auth.uid() for update;
 if not found or v_org.status not in ('trial','active','grace')
   or not (v_org.is_test or (v_org.status='active' and v_org.paid_through >= (now() at time zone 'America/Argentina/Buenos_Aires')::date))
   or not exists(select 1 from public.efg_profiles where user_id=auth.uid() and role='coach' and active)
 then raise exception 'Licencia comercial pendiente, vencida o sin permiso'; end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   or length(v_name)<2 or length(v_name)>70 then raise exception 'Datos de alumno inválidos'; end if;
 if exists(select 1 from public.efg_profiles where email=v_email)
   or exists(select 1 from public.efg_invitations where lower(email)=v_email and revoked_at is null)
 then raise exception 'Correo ya registrado o invitado'; end if;
 select (select count(*) from public.efg_profiles where organization_id=v_org.id and role='student' and active)
      +(select count(*) from public.efg_invitations where organization_id=v_org.id and role='student'
        and claimed_by is null and revoked_at is null) into v_taken;
 if v_taken>=v_org.seat_limit then raise exception 'Alcanzaste el cupo contratado'; end if;
 insert into public.efg_invitations(email,nickname,role,organization_id,invited_by)
 values(v_email,v_name,'student',v_org.id,auth.uid()) returning id into v_id;
 return v_id;
end $fn$;

-- Una invitación de alumno no se puede reclamar si la licencia comercial
-- fue suspendida o venció. El coach sí puede reclamar la suya para pagar.
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
