-- Hiding synthetic rows from queues is not sufficient: block operational RPCs
-- from changing demo reports even if a caller knows their IDs.

create or replace function private.moderate_report(target uuid,decision text,safe_title text,safe_description text,safe_area text)
returns void language plpgsql security definer set search_path='' as $$
declare i public.items;
begin
  select * into i from public.items where id=target for update;
  if not found or i.is_demo or not private.can_manage(coalesce(i.held_at_station_id,i.intended_station_id)) then
    raise exception 'Station access denied' using errcode='42501';
  end if;
  if decision not in ('approved','rejected') or i.publication_status='withdrawn' then raise exception 'Invalid moderation'; end if;
  if decision='approved' and (length(trim(coalesce(safe_title,''))) not between 1 and 120 or length(trim(coalesce(safe_description,''))) not between 1 and 3000 or length(trim(coalesce(safe_area,''))) not between 1 and 300) then
    raise exception 'Provide safe public title, description and approximate area';
  end if;
  update public.items set publication_status=decision,public_title=safe_title,public_description=safe_description,public_area=safe_area where id=target;
end $$;

create or replace function private.receive_item(target uuid,station uuid,storage text,confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare i public.items; event_id uuid;
begin
  select * into i from public.items where id=target for update;
  if not found or i.is_demo or not private.can_manage(station) then raise exception 'Station access denied' using errcode='42501'; end if;
  if confirmed is distinct from true or i.kind<>'found' or i.status<>'pending_surrender' or i.publication_status='withdrawn' or i.intended_station_id is distinct from station then
    raise exception 'Confirm actual possession at the intended station';
  end if;
  if length(trim(coalesce(storage,''))) not between 1 and 200 then raise exception 'Storage location is required'; end if;
  update public.items set status='received_by_police',held_at_station_id=station,storage_location=storage where id=target;
  insert into public.custody_events(item_id,station_id,actor_id,from_status,to_status) values(target,station,auth.uid(),i.status,'received_by_police') returning id into event_id;
  return event_id;
end $$;

create or replace function private.store_item(target uuid,storage text)
returns void language plpgsql security definer set search_path='' as $$
declare i public.items;
begin
  select * into i from public.items where id=target for update;
  if not found or i.is_demo or not private.can_manage(i.held_at_station_id) then raise exception 'Station access denied' using errcode='42501'; end if;
  if i.status not in ('received_by_police','in_custody') or length(trim(coalesce(storage,''))) not between 1 and 200 then
    raise exception 'Only received items may enter storage';
  end if;
  update public.items set status='in_custody',storage_location=storage where id=target;
  insert into public.custody_events(item_id,station_id,actor_id,from_status,to_status) values(target,i.held_at_station_id,auth.uid(),i.status,'in_custody');
end $$;

create or replace function private.release_item(target uuid,confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare item public.items; release_ref uuid;
begin
  select * into item from public.items where id=target for update;
  if not found or item.is_demo or not private.can_manage(item.held_at_station_id) then raise exception 'Station access denied' using errcode='42501'; end if;
  if confirmed is distinct from true or item.held_at_station_id is null or item.status<>'approved_for_pickup' then
    raise exception 'Confirm handover of an item approved for pickup';
  end if;
  update public.claims set released_at=now() where item_id=target and status='approved' and released_at is null;
  if not found then raise exception 'An approved claim is required'; end if;
  update public.items set status='released' where id=target;
  insert into public.custody_events(item_id,station_id,actor_id,from_status,to_status)
  values(target,item.held_at_station_id,auth.uid(),item.status,'released') returning id into release_ref;
  return release_ref;
end $$;

create or replace function private.review_claim(target uuid,decision text)
returns void language plpgsql security definer set search_path='' as $$
declare item public.items; claim public.claims;
begin
  select * into item from public.items where id=(select item_id from public.claims where id=target) for update;
  if not found or item.is_demo or not private.can_manage(coalesce(item.held_at_station_id,item.intended_station_id)) then
    raise exception 'Station access denied' using errcode='42501';
  end if;
  select * into claim from public.claims where id=target;
  if claim.status<>'submitted' or decision is null or decision not in ('approved','rejected') then raise exception 'Only submitted claims can be reviewed'; end if;
  if decision='approved' then
    if item.held_at_station_id is null or item.status not in ('received_by_police','in_custody') then raise exception 'Confirm physical receipt before approving pickup'; end if;
    update public.items set status='approved_for_pickup' where id=item.id;
    insert into public.custody_events(item_id,station_id,actor_id,from_status,to_status) values(item.id,item.held_at_station_id,auth.uid(),item.status,'approved_for_pickup');
    update public.claims set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where item_id=item.id and id<>target and status='submitted';
  end if;
  update public.claims set status=decision::public.claim_status,reviewed_at=now(),reviewed_by=auth.uid() where id=target;
end $$;

create or replace function private.submit_claim(target uuid,evidence text,attachment text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
  perform 1 from public.items where id=target and not is_demo and kind='found' and publication_status='approved'
    and status not in ('approved_for_pickup','released','closed') and reporter_id<>auth.uid() for share;
  if not found then raise exception 'This report is unavailable for new claims'; end if;
  if length(trim(coalesce(evidence,''))) not between 10 and 3000 then raise exception 'Provide private evidence between 10 and 3000 characters'; end if;
  if attachment is not null then
    if split_part(attachment,'/',1)<>auth.uid()::text then raise exception 'Evidence image unavailable'; end if;
    perform 1 from storage.objects where bucket_id='claim-evidence' and name=attachment for share;
    if not found then raise exception 'Evidence image unavailable'; end if;
  end if;
  insert into public.claims(item_id,claimant_id,private_answer,evidence_path) values(target,auth.uid(),evidence,attachment) returning id into result;
  return result;
end $$;
