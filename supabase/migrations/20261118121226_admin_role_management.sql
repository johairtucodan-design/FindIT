create table public.profile_role_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  target_id uuid not null,
  previous_role public.user_role not null,
  new_role public.user_role not null,
  previous_station_id uuid,
  new_station_id uuid,
  created_at timestamptz not null default now()
);

create index profile_role_audit_target_created_idx on public.profile_role_audit(target_id, created_at desc);
alter table public.profile_role_audit enable row level security;
revoke all on public.profile_role_audit from anon, authenticated;
grant select on public.profile_role_audit to authenticated;
grant all on public.profile_role_audit to service_role;
create policy profile_role_audit_admin_read on public.profile_role_audit for select to authenticated
using ((select private.current_role()) = 'admin');

create function private.audit_profile_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role or new.station_id is distinct from old.station_id then
    insert into public.profile_role_audit(actor_id,target_id,previous_role,new_role,previous_station_id,new_station_id)
    values(auth.uid(),old.id,old.role,new.role,old.station_id,new.station_id);
  end if;
  return new;
end;
$$;
revoke all on function private.audit_profile_role_change() from public, anon, authenticated;
create trigger audit_profile_role_change after update on public.profiles
for each row execute function private.audit_profile_role_change();

create function private.admin_user_directory()
returns table(user_id uuid,email text,full_name text,role public.user_role,station_id uuid,station_name text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select private.current_role()) is distinct from 'admin'::public.user_role then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  return query
    select u.id,u.email::text,p.full_name,p.role,p.station_id,s.name,u.created_at
    from auth.users u
    join public.profiles p on p.id=u.id
    left join public.stations s on s.id=p.station_id
    order by u.created_at desc,u.id;
end;
$$;
revoke all on function private.admin_user_directory() from public, anon;
grant execute on function private.admin_user_directory() to authenticated;

create function public.admin_user_directory()
returns table(user_id uuid,email text,full_name text,role public.user_role,station_id uuid,station_name text,created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_user_directory()
$$;
revoke all on function public.admin_user_directory() from public, anon;
grant execute on function public.admin_user_directory() to authenticated;

create function private.assign_profile_role(target_user uuid,target_role public.user_role,target_station uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  previous_role public.user_role;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(73190412);
  if (select private.current_role()) is distinct from 'admin'::public.user_role then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if target_user is null or target_role is null then
    raise exception 'Choose a user and a FindIT role';
  end if;
  if target_user=(select auth.uid()) then
    raise exception 'You cannot change your own FindIT access';
  end if;

  select p.role into previous_role from public.profiles p where p.id=target_user for update;
  if not found then raise exception 'User profile not found'; end if;
  if target_role='officer' then
    if target_station is null or not exists(
      select 1 from public.stations s where s.id=target_station and s.is_demo and s.is_approved
    ) then raise exception 'Choose an approved demo station for staff'; end if;
  elsif target_station is not null then
    raise exception 'Only staff accounts can have a station assignment';
  end if;
  if previous_role='admin' and target_role<>'admin' and
    (select count(*) from public.profiles p where p.role='admin')<=1 then
    raise exception 'FindIT must keep at least one administrator';
  end if;

  update public.profiles set role=target_role,station_id=target_station where id=target_user;
end;
$$;
revoke all on function private.assign_profile_role(uuid,public.user_role,uuid) from public, anon;
grant execute on function private.assign_profile_role(uuid,public.user_role,uuid) to authenticated;

create function public.assign_profile_role(target_user uuid,target_role public.user_role,target_station uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.assign_profile_role(target_user,target_role,target_station)
$$;
revoke all on function public.assign_profile_role(uuid,public.user_role,uuid) from public, anon;
grant execute on function public.assign_profile_role(uuid,public.user_role,uuid) to authenticated;
