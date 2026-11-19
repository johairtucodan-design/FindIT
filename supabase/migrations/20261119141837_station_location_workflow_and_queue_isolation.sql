-- Station pins are separate from item coordinates and remain explicitly
-- unverified as station-authorized handover locations.

create table public.station_locations (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null check (length(trim(description)) between 1 and 1200),
  visit_instructions text not null check (length(trim(visit_instructions)) between 1 and 1000),
  location extensions.geography(point,4326) not null,
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reviewed_by is null) = (reviewed_at is null))
);

create index station_locations_station_status_idx on public.station_locations(station_id,status,is_active);
create index station_locations_location_gix on public.station_locations using gist(location);
comment on table public.station_locations is 'Separately reviewed public-reference pins. FindIT review does not establish station authorization, police partnership, or item custody.';

create table public.station_location_events (
  id bigint generated always as identity primary key,
  location_id uuid not null references public.station_locations(id) on delete restrict,
  station_id uuid not null references public.stations(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('proposed','edited','resubmitted','approved','rejected','deactivated')),
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
create index station_location_events_location_created_idx on public.station_location_events(location_id,created_at desc);
alter table public.station_locations enable row level security;
alter table public.station_location_events enable row level security;
revoke all on public.station_locations,public.station_location_events from anon,authenticated;
grant select on public.station_locations,public.station_location_events to authenticated;
grant all on public.station_locations,public.station_location_events to service_role;
create policy station_locations_assigned_read on public.station_locations for select to authenticated
using (private.can_manage(station_id));
create policy station_location_events_assigned_read on public.station_location_events for select to authenticated
using (private.can_manage(station_id));

-- Staff assignment stays explicit and admin-controlled, but can now use
-- sourced public references rather than fictional demo stations.
create or replace function private.assign_profile_role(target_user uuid,target_role public.user_role,target_station uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous_role public.user_role;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(73190412);
  if (select private.current_role()) is distinct from 'admin'::public.user_role then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if target_user is null or target_role is null then raise exception 'Choose a user and a FindIT role'; end if;
  if target_user=(select auth.uid()) then raise exception 'You cannot change your own FindIT access'; end if;
  select p.role into previous_role from public.profiles p where p.id=target_user for update;
  if not found then raise exception 'User profile not found'; end if;
  if target_role='officer' then
    if target_station is null or not exists(
      select 1 from public.stations s where s.id=target_station and s.is_approved and not s.is_demo
    ) then raise exception 'Choose an approved public-reference station for staff'; end if;
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

create function private.station_location_snapshot(pin public.station_locations) returns jsonb
language sql immutable set search_path='' as $$
  select pg_catalog.jsonb_build_object(
    'name',(pin).name,'description',(pin).description,'visit_instructions',(pin).visit_instructions,
    'latitude',extensions.st_y((pin).location::extensions.geometry),
    'longitude',extensions.st_x((pin).location::extensions.geometry),
    'status',(pin).status,'is_active',(pin).is_active
  )
$$;
revoke all on function private.station_location_snapshot(public.station_locations) from public,anon,authenticated;

create function private.propose_station_location(p_station uuid,p_name text,p_description text,p_visit_instructions text,p_latitude double precision,p_longitude double precision)
returns uuid language plpgsql security definer set search_path='' as $$
declare pin_id uuid; pin public.station_locations;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='officer' and p.station_id=p_station) then
    raise exception 'Only staff assigned to this station can propose a pin' using errcode='42501';
  end if;
  if not exists(select 1 from public.stations s where s.id=p_station and s.is_approved and not s.is_demo) then
    raise exception 'Choose an approved public-reference station';
  end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 120
    or length(trim(coalesce(p_description,''))) not between 1 and 1200
    or length(trim(coalesce(p_visit_instructions,''))) not between 1 and 1000 then
    raise exception 'Name, public description and visit instructions are required';
  end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Choose a valid map location';
  end if;
  insert into public.station_locations(station_id,name,description,visit_instructions,location,status,is_active,created_by,updated_by)
  values(p_station,trim(p_name),trim(p_description),trim(p_visit_instructions),
    extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,
    'pending_review',true,auth.uid(),auth.uid()) returning * into pin;
  pin_id:=pin.id;
  insert into public.station_location_events(location_id,station_id,actor_id,event_type,new_values)
  values(pin.id,p_station,auth.uid(),'proposed',private.station_location_snapshot(pin));
  return pin_id;
end $$;

create function private.update_station_location(p_target uuid,p_name text,p_description text,p_visit_instructions text,p_latitude double precision,p_longitude double precision)
returns void language plpgsql security definer set search_path='' as $$
declare pin public.station_locations; before_values jsonb;
begin
  select * into pin from public.station_locations where id=p_target for update;
  if not found or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='officer' and p.station_id=pin.station_id)
    or not exists(select 1 from public.stations s where s.id=pin.station_id and s.is_approved and not s.is_demo) then
    raise exception 'This pin is outside your assigned station access' using errcode='42501';
  end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 120
    or length(trim(coalesce(p_description,''))) not between 1 and 1200
    or length(trim(coalesce(p_visit_instructions,''))) not between 1 and 1000 then
    raise exception 'Name, public description and visit instructions are required';
  end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Choose a valid map location';
  end if;
  before_values:=private.station_location_snapshot(pin);
  update public.station_locations set name=trim(p_name),description=trim(p_description),visit_instructions=trim(p_visit_instructions),
    location=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,
    status='pending_review',is_active=true,updated_by=auth.uid(),updated_at=now(),reviewed_by=null,reviewed_at=null
  where id=p_target returning * into pin;
  insert into public.station_location_events(location_id,station_id,actor_id,event_type,previous_values,new_values)
  values(pin.id,pin.station_id,auth.uid(),case when before_values->>'status'='approved' then 'edited' else 'resubmitted' end,
    before_values,private.station_location_snapshot(pin));
end $$;

create function private.deactivate_station_location(p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare pin public.station_locations; before_values jsonb;
begin
  select * into pin from public.station_locations where id=p_target for update;
  if not found or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='officer' and p.station_id=pin.station_id)
    or not exists(select 1 from public.stations s where s.id=pin.station_id and s.is_approved and not s.is_demo) then
    raise exception 'This pin is outside your assigned station access' using errcode='42501';
  end if;
  if not pin.is_active then raise exception 'This pin is already inactive'; end if;
  before_values:=private.station_location_snapshot(pin);
  update public.station_locations set is_active=false,updated_by=auth.uid(),updated_at=now() where id=p_target returning * into pin;
  insert into public.station_location_events(location_id,station_id,actor_id,event_type,previous_values,new_values)
  values(pin.id,pin.station_id,auth.uid(),'deactivated',before_values,private.station_location_snapshot(pin));
end $$;

create function private.review_station_location(p_target uuid,p_decision text) returns void
language plpgsql security definer set search_path='' as $$
declare pin public.station_locations; before_values jsonb;
begin
  if (select private.current_role()) is distinct from 'admin'::public.user_role then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_decision not in ('approved','rejected') then raise exception 'Choose Approve or Deny'; end if;
  select * into pin from public.station_locations where id=p_target for update;
  if not found or pin.status<>'pending_review' or not pin.is_active then raise exception 'This pin is no longer awaiting review'; end if;
  before_values:=private.station_location_snapshot(pin);
  update public.station_locations set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),updated_by=auth.uid(),updated_at=now()
  where id=p_target returning * into pin;
  insert into public.station_location_events(location_id,station_id,actor_id,event_type,previous_values,new_values)
  values(pin.id,pin.station_id,auth.uid(),p_decision,before_values,private.station_location_snapshot(pin));
end $$;

create function private.station_locations_for_staff()
returns table(id uuid,station_id uuid,station_name text,name text,description text,visit_instructions text,status text,is_active boolean,latitude double precision,longitude double precision,created_at timestamptz,reviewed_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare v_role public.user_role; assigned_station uuid;
begin
  select p.role,p.station_id into v_role,assigned_station from public.profiles p where p.id=auth.uid();
  if v_role not in ('officer','admin') then raise exception 'Station staff access required' using errcode='42501'; end if;
  return query select l.id,l.station_id,s.name,l.name,l.description,l.visit_instructions,l.status,l.is_active,
    extensions.st_y(l.location::extensions.geometry),extensions.st_x(l.location::extensions.geometry),l.created_at,l.reviewed_at
  from public.station_locations l join public.stations s on s.id=l.station_id
  where (v_role='admin' or l.station_id=assigned_station) and not s.is_demo
  order by l.created_at desc,l.id;
end $$;

create function private.station_location_review_queue()
returns table(id uuid,station_id uuid,station_name text,name text,description text,visit_instructions text,status text,is_active boolean,latitude double precision,longitude double precision,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select private.current_role()) is distinct from 'admin'::public.user_role then raise exception 'Admin access required' using errcode='42501'; end if;
  return query select l.id,l.station_id,s.name,l.name,l.description,l.visit_instructions,l.status,l.is_active,
    extensions.st_y(l.location::extensions.geometry),extensions.st_x(l.location::extensions.geometry),l.created_at
  from public.station_locations l join public.stations s on s.id=l.station_id
  where l.status='pending_review' and l.is_active and s.is_approved and not s.is_demo
  order by l.created_at,l.id;
end $$;

create function private.station_location_directory()
returns table(id uuid,station_id uuid,station_name text,name text,description text,visit_instructions text,latitude double precision,longitude double precision)
language sql stable security definer set search_path='' as $$
  select l.id,l.station_id,s.name,l.name,l.description,l.visit_instructions,
    extensions.st_y(l.location::extensions.geometry),extensions.st_x(l.location::extensions.geometry)
  from public.station_locations l join public.stations s on s.id=l.station_id
  where l.status='approved' and l.is_active and s.is_approved and not s.is_demo
  order by s.name,l.name,l.id
$$;

create function public.propose_station_location(p_station uuid,p_name text,p_description text,p_visit_instructions text,p_latitude double precision,p_longitude double precision)
returns uuid language sql security invoker set search_path='' as $$select private.propose_station_location(p_station,p_name,p_description,p_visit_instructions,p_latitude,p_longitude)$$;
create function public.update_station_location(p_target uuid,p_name text,p_description text,p_visit_instructions text,p_latitude double precision,p_longitude double precision)
returns void language sql security invoker set search_path='' as $$select private.update_station_location(p_target,p_name,p_description,p_visit_instructions,p_latitude,p_longitude)$$;
create function public.deactivate_station_location(p_target uuid) returns void language sql security invoker set search_path='' as $$select private.deactivate_station_location(p_target)$$;
create function public.review_station_location(p_target uuid,p_decision text) returns void language sql security invoker set search_path='' as $$select private.review_station_location(p_target,p_decision)$$;
create function public.station_locations_for_staff()
returns table(id uuid,station_id uuid,station_name text,name text,description text,visit_instructions text,status text,is_active boolean,latitude double precision,longitude double precision,created_at timestamptz,reviewed_at timestamptz)
language sql stable security invoker set search_path='' as $$select * from private.station_locations_for_staff()$$;
create function public.station_location_review_queue()
returns table(id uuid,station_id uuid,station_name text,name text,description text,visit_instructions text,status text,is_active boolean,latitude double precision,longitude double precision,created_at timestamptz)
language sql stable security invoker set search_path='' as $$select * from private.station_location_review_queue()$$;
create function public.station_location_directory()
returns table(id uuid,station_id uuid,station_name text,name text,description text,visit_instructions text,latitude double precision,longitude double precision)
language sql stable security invoker set search_path='' as $$select * from private.station_location_directory()$$;

revoke all on function private.propose_station_location(uuid,text,text,text,double precision,double precision),private.update_station_location(uuid,text,text,text,double precision,double precision),private.deactivate_station_location(uuid),private.review_station_location(uuid,text),private.station_locations_for_staff(),private.station_location_review_queue(),private.station_location_directory() from public,anon;
grant execute on function private.propose_station_location(uuid,text,text,text,double precision,double precision),private.update_station_location(uuid,text,text,text,double precision,double precision),private.deactivate_station_location(uuid),private.review_station_location(uuid,text),private.station_locations_for_staff(),private.station_location_review_queue() to authenticated;
revoke all on function public.propose_station_location(uuid,text,text,text,double precision,double precision),public.update_station_location(uuid,text,text,text,double precision,double precision),public.deactivate_station_location(uuid),public.review_station_location(uuid,text),public.station_locations_for_staff(),public.station_location_review_queue(),public.station_location_directory() from public;
grant execute on function public.propose_station_location(uuid,text,text,text,double precision,double precision),public.update_station_location(uuid,text,text,text,double precision,double precision),public.deactivate_station_location(uuid),public.review_station_location(uuid,text),public.station_locations_for_staff(),public.station_location_review_queue() to authenticated;
grant execute on function private.station_location_directory() to anon,authenticated;
grant execute on function public.station_location_directory() to anon,authenticated;

create or replace function private.staff_reports() returns setof public.items
language sql stable security definer set search_path='' as $$
  select i.* from public.items i
  where not i.is_demo and i.archived_at is null
    and private.can_manage(coalesce(i.held_at_station_id,i.intended_station_id))
  order by i.occurred_at desc
$$;

create or replace function private.retention_candidates()
returns table(id uuid,title text,ended_at timestamptz)
language sql stable security definer set search_path='' as $$
  select i.id,i.title,e.ended_at from public.items i
  cross join public.retention_rules r
  cross join lateral (
    select max(c.created_at) as ended_at from public.custody_events c
    where c.item_id=i.id and c.to_status in ('released','closed')
  ) e
  where private.can_manage(null) and not i.is_demo and i.archived_at is null and i.status in ('released','closed')
    and e.ended_at <= now() - make_interval(days=>r.retention_days)
  order by e.ended_at,i.id
$$;

create or replace function private.station_summary(station uuid,start_day date,end_day date)
returns table(received bigint,pending_claims bigint,released bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if station is null or not private.can_manage(station) then raise exception 'Station access denied' using errcode='42501'; end if;
  if start_day is null or end_day is null or end_day<start_day or end_day-start_day>366 then raise exception 'Choose a date range of up to one year'; end if;
  return query select
    count(*) filter(where e.to_status='received_by_police'),
    (select count(*) from public.claims c join public.items i on i.id=c.item_id
     where i.held_at_station_id=station and not i.is_demo and c.status='submitted'
       and (c.submitted_at at time zone 'Asia/Singapore')::date between start_day and end_day),
    count(*) filter(where e.to_status='released')
    from public.custody_events e join public.items i on i.id=e.item_id
    where e.station_id=station and not i.is_demo
      and (e.created_at at time zone 'Asia/Singapore')::date between start_day and end_day;
end $$;

-- Publication seed controls are removed. Existing synthetic rows are retained.
revoke all on function public.seed_demo_cases() from public,anon,authenticated;
revoke all on function private.seed_demo_cases() from public,anon,authenticated;
