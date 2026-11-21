-- Assigned station staff can publish public-reference pins immediately.
-- Admin review is removed; staff scope, audit history, and public caveats remain.

alter table public.station_locations drop constraint if exists station_locations_status_check;
alter table public.station_locations add constraint station_locations_status_check
  check (status in ('pending_review','approved','rejected','published'));

alter table public.station_location_events drop constraint if exists station_location_events_event_type_check;
alter table public.station_location_events add constraint station_location_events_event_type_check
  check (event_type in ('proposed','edited','resubmitted','approved','rejected','deactivated','published'));

comment on table public.station_locations is
  'Staff-published public-reference pins. Publication does not establish station authorization, police partnership, or item custody.';

create or replace function private.propose_station_location(p_station uuid,p_name text,p_description text,p_visit_instructions text,p_latitude double precision,p_longitude double precision)
returns uuid language plpgsql security definer set search_path='' as $$
declare pin public.station_locations;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='officer' and p.station_id=p_station) then
    raise exception 'Only staff assigned to this station can publish a pin' using errcode='42501';
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
    'published',true,auth.uid(),auth.uid()) returning * into pin;
  insert into public.station_location_events(location_id,station_id,actor_id,event_type,new_values)
  values(pin.id,p_station,auth.uid(),'published',private.station_location_snapshot(pin));
  return pin.id;
end $$;

create or replace function private.update_station_location(p_target uuid,p_name text,p_description text,p_visit_instructions text,p_latitude double precision,p_longitude double precision)
returns void language plpgsql security definer set search_path='' as $$
declare pin public.station_locations; before_values jsonb; next_event text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
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
  next_event:=case when pin.status in ('approved','published') and pin.is_active then 'edited' else 'published' end;
  update public.station_locations set name=trim(p_name),description=trim(p_description),visit_instructions=trim(p_visit_instructions),
    location=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,
    status='published',is_active=true,updated_by=auth.uid(),updated_at=now(),reviewed_by=null,reviewed_at=null
  where id=p_target returning * into pin;
  insert into public.station_location_events(location_id,station_id,actor_id,event_type,previous_values,new_values)
  values(pin.id,pin.station_id,auth.uid(),next_event,before_values,private.station_location_snapshot(pin));
end $$;

create or replace function private.station_location_directory()
returns table(id uuid,station_id uuid,station_name text,name text,description text,visit_instructions text,latitude double precision,longitude double precision)
language sql stable security definer set search_path='' as $$
  select l.id,l.station_id,s.name,l.name,l.description,l.visit_instructions,
    extensions.st_y(l.location::extensions.geometry),extensions.st_x(l.location::extensions.geometry)
  from public.station_locations l join public.stations s on s.id=l.station_id
  where l.status in ('approved','published') and l.is_active and s.is_approved and not s.is_demo
  order by s.name,l.name,l.id
$$;

drop function if exists public.review_station_location(uuid,text);
drop function if exists private.review_station_location(uuid,text);
drop function if exists public.station_location_review_queue();
drop function if exists private.station_location_review_queue();

revoke all on function private.propose_station_location(uuid,text,text,text,double precision,double precision),private.update_station_location(uuid,text,text,text,double precision,double precision),private.deactivate_station_location(uuid),private.station_locations_for_staff(),private.station_location_directory() from public,anon,authenticated;
grant execute on function private.propose_station_location(uuid,text,text,text,double precision,double precision),private.update_station_location(uuid,text,text,text,double precision,double precision),private.deactivate_station_location(uuid),private.station_locations_for_staff() to authenticated;
grant execute on function private.station_location_directory() to anon,authenticated;

revoke all on function public.propose_station_location(uuid,text,text,text,double precision,double precision),public.update_station_location(uuid,text,text,text,double precision,double precision),public.deactivate_station_location(uuid),public.station_locations_for_staff(),public.station_location_directory() from public;
grant execute on function public.propose_station_location(uuid,text,text,text,double precision,double precision),public.update_station_location(uuid,text,text,text,double precision,double precision),public.deactivate_station_location(uuid),public.station_locations_for_staff() to authenticated;
grant execute on function public.station_location_directory() to anon,authenticated;
