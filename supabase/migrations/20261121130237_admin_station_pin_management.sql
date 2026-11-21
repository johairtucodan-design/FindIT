-- Admins may manage pins for any approved, non-demo public reference.
-- Staff remain limited to their own assigned station through private.can_manage.
create or replace function private.propose_station_location(
  p_station uuid,p_name text,p_description text,p_visit_instructions text,
  p_latitude double precision,p_longitude double precision
)
returns uuid language plpgsql security definer set search_path='' as $$
declare pin public.station_locations;
begin
  if auth.uid() is null or not private.can_manage(p_station) then
    raise exception 'Station map access required' using errcode='42501';
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

create or replace function private.update_station_location(
  p_target uuid,p_name text,p_description text,p_visit_instructions text,
  p_latitude double precision,p_longitude double precision
)
returns void language plpgsql security definer set search_path='' as $$
declare pin public.station_locations; before_values jsonb; next_event text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into pin from public.station_locations where id=p_target for update;
  if not found or not private.can_manage(pin.station_id)
    or not exists(select 1 from public.stations s where s.id=pin.station_id and s.is_approved and not s.is_demo) then
    raise exception 'This pin is outside your station access' using errcode='42501';
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

create or replace function private.deactivate_station_location(p_target uuid)
returns void language plpgsql security definer set search_path='' as $$
declare pin public.station_locations; before_values jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into pin from public.station_locations where id=p_target for update;
  if not found or not private.can_manage(pin.station_id)
    or not exists(select 1 from public.stations s where s.id=pin.station_id and s.is_approved and not s.is_demo) then
    raise exception 'This pin is outside your station access' using errcode='42501';
  end if;
  if not pin.is_active then raise exception 'This pin is already inactive'; end if;
  before_values:=private.station_location_snapshot(pin);
  update public.station_locations set is_active=false,updated_by=auth.uid(),updated_at=now() where id=p_target returning * into pin;
  insert into public.station_location_events(location_id,station_id,actor_id,event_type,previous_values,new_values)
  values(pin.id,pin.station_id,auth.uid(),'deactivated',before_values,private.station_location_snapshot(pin));
end $$;
