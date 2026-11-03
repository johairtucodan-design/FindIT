
alter table public.stations add column receiving_hours text not null default 'Not posted', add column service_area text not null default 'Demo City';
update public.stations set receiving_hours='Demo hours only: Mon-Fri 09:00-17:00' where is_demo;
alter table public.items
 add column contact_method text check(length(contact_method) between 1 and 250),
 add column intended_station_id uuid references public.stations(id),
 add column storage_location text check(length(storage_location)<=200),
 add column publication_status text not null default 'pending' check(publication_status in ('pending','approved','rejected','withdrawn')),
 add column public_title text, add column public_description text, add column public_area text;
create index on public.items(intended_station_id);
create table public.report_history (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references public.items(id),
 actor_id uuid references auth.users(id), created_at timestamptz not null default now(), previous_record jsonb not null
);
create index on public.report_history(item_id);
alter table public.report_history enable row level security;
revoke all on public.report_history from anon,authenticated;
grant select on public.report_history to authenticated;
create unique index one_claim_per_user on public.claims(item_id,claimant_id);
alter table public.claims add constraint proof_length check(length(trim(private_answer)) between 10 and 3000) not valid;

create function private.can_manage(station uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and auth.uid() is not null and
 (role='admin' or (role='officer' and station_id=station and station is not null)))
$$;
revoke all on function private.can_manage(uuid) from public;
grant execute on function private.can_manage(uuid) to authenticated;
create function private.can_read_item(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.items i where i.id=target and auth.uid() is not null and
 (i.reporter_id=auth.uid() or private.can_manage(coalesce(i.held_at_station_id,i.intended_station_id))))
$$;
revoke all on function private.can_read_item(uuid) from public;
grant execute on function private.can_read_item(uuid) to authenticated;
create or replace function private.item_detail(target_id uuid) returns setof public.items language sql stable security definer set search_path='' as $$
 select i.* from public.items i where i.id=target_id and private.can_read_item(i.id)
$$;

drop policy items_public_read on public.items;
create policy items_safe_read on public.items for select to anon using(publication_status='approved');
create policy items_authenticated_read on public.items for select to authenticated
 using(publication_status='approved' or reporter_id=(select auth.uid()) or private.can_manage(coalesce(held_at_station_id,intended_station_id)));
grant select(publication_status,public_title,public_description,public_area) on public.items to anon,authenticated;
create or replace view public.public_items with(security_invoker=true,security_barrier=true) as
 select id,kind,public_title as title,public_description as description,category,color,public_area as location_text,occurred_at,status,held_at_station_id
 from public.items where publication_status='approved';
grant insert(contact_method,intended_station_id),update(contact_method,intended_station_id) on public.items to authenticated;

create or replace function private.guard_report() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
   new.status := case when new.kind='lost' then 'open'::public.item_status else 'pending_surrender'::public.item_status end;
   new.held_at_station_id:=null;
   new.publication_status:='pending'; new.public_title:=null; new.public_description:=null; new.public_area:=null;
 elsif current_user in ('anon','authenticated') then
   if new.id is distinct from old.id or new.reporter_id is distinct from old.reporter_id or new.kind is distinct from old.kind
    or new.status is distinct from old.status or new.held_at_station_id is distinct from old.held_at_station_id
    or new.publication_status is distinct from old.publication_status or new.public_title is distinct from old.public_title
    or new.public_description is distinct from old.public_description or new.public_area is distinct from old.public_area
    or new.storage_location is distinct from old.storage_location then
     raise exception 'Protected fields require an authorized operation' using errcode='42501';
   end if;
   new.publication_status:='pending'; new.public_title:=null; new.public_description:=null; new.public_area:=null;
 end if;
 if current_user in ('anon','authenticated') then
   if new.contact_method is null or length(trim(new.contact_method))=0 then raise exception 'Private contact method is required'; end if;
   if new.intended_station_id is not null and not exists(select 1 from public.stations where id=new.intended_station_id and is_approved) then raise exception 'Choose an approved demo station'; end if;
 end if;
 return new;
end;
$$;
create function private.log_report_edit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.report_history(item_id,actor_id,previous_record) values(old.id,auth.uid(),to_jsonb(old)); return new;
end;
$$;
revoke all on function private.log_report_edit() from public;
create trigger report_edit_history after update on public.items for each row execute function private.log_report_edit();
create policy history_authorized on public.report_history for select to authenticated using(private.can_read_item(item_id));
drop policy custody_staff_read on public.custody_events;
create policy custody_station_read on public.custody_events for select to authenticated using(private.can_manage(station_id));
drop policy claims_authorized_read on public.claims;
create policy claims_scoped_read on public.claims for select to authenticated using(claimant_id=(select auth.uid()) or exists(
 select 1 from public.items i where i.id=item_id and private.can_manage(coalesce(i.held_at_station_id,i.intended_station_id))));

create function private.photo_access(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.items i where i.photo_path=path and private.can_read_item(i.id))
$$;
revoke all on function private.photo_access(text) from public;
grant execute on function private.photo_access(text) to authenticated;

drop policy item_photos_authorized_read on storage.objects;
create policy item_photos_authorized_read on storage.objects for select to authenticated using(bucket_id='item-photos' and
 ((storage.foldername(name))[1]=(select auth.uid())::text or private.photo_access(name)));

create function private.staff_reports() returns setof public.items language sql stable security definer set search_path='' as $fn$ select i.* from public.items i where private.can_manage(coalesce(i.held_at_station_id,i.intended_station_id)) order by i.occurred_at desc $fn$;
revoke all on function private.staff_reports() from public;
grant execute on function private.staff_reports() to authenticated;
create function public.staff_reports() returns setof public.items language sql stable security invoker set search_path='' as $fn$ select * from private.staff_reports() $fn$;
revoke all on function public.staff_reports() from public;
grant execute on function public.staff_reports() to authenticated;

create function private.station_directory() returns table(id uuid,name text,address text,phone text,receiving_hours text,service_area text,is_demo boolean,latitude double precision,longitude double precision) language sql stable security definer set search_path='' as $fn$ select id,name,address,phone,receiving_hours,service_area,is_demo,extensions.st_y(location::extensions.geometry),extensions.st_x(location::extensions.geometry) from public.stations where is_approved order by name $fn$;
revoke all on function private.station_directory() from public;
grant execute on function private.station_directory() to anon, authenticated;
create function public.station_directory() returns table(id uuid,name text,address text,phone text,receiving_hours text,service_area text,is_demo boolean,latitude double precision,longitude double precision) language sql stable security invoker set search_path='' as $fn$ select * from private.station_directory() $fn$;
revoke all on function public.station_directory() from public;
grant execute on function public.station_directory() to anon, authenticated;

create function private.moderate_report(target uuid, decision text, safe_title text, safe_description text, safe_area text) returns void language plpgsql  security definer set search_path='' as $fn$ 
declare i public.items;
begin
 select * into i from public.items where id=target for update;
 if not found or not private.can_manage(coalesce(i.held_at_station_id,i.intended_station_id)) then raise exception 'Station access denied' using errcode='42501'; end if;
 if decision not in ('approved','rejected') or i.publication_status='withdrawn' then raise exception 'Invalid moderation'; end if;
 if decision='approved' and (length(trim(coalesce(safe_title,''))) not between 1 and 120 or length(trim(coalesce(safe_description,''))) not between 1 and 3000 or length(trim(coalesce(safe_area,''))) not between 1 and 300) then raise exception 'Provide safe public title, description and approximate area'; end if;
 update public.items set publication_status=decision,public_title=safe_title,public_description=safe_description,public_area=safe_area where id=target;
end $fn$;
revoke all on function private.moderate_report(uuid, text, text, text, text) from public;
grant execute on function private.moderate_report(uuid, text, text, text, text) to authenticated;
create function public.moderate_report(target uuid, decision text, safe_title text, safe_description text, safe_area text) returns void language sql  security invoker set search_path='' as $fn$ select private.moderate_report(target, decision, safe_title, safe_description, safe_area) $fn$;
revoke all on function public.moderate_report(uuid, text, text, text, text) from public;
grant execute on function public.moderate_report(uuid, text, text, text, text) to authenticated;

create function private.receive_item(target uuid, station uuid, storage text, confirmed boolean) returns uuid language plpgsql  security definer set search_path='' as $fn$ 
declare i public.items; event_id uuid;
begin
 select * into i from public.items where id=target for update;
 if not found or not private.can_manage(station) then raise exception 'Station access denied' using errcode='42501'; end if;
 if confirmed is distinct from true or i.kind<>'found' or i.status<>'pending_surrender' or i.publication_status='withdrawn' or i.intended_station_id is distinct from station then raise exception 'Confirm actual possession at the intended station'; end if;
 if length(trim(coalesce(storage,''))) not between 1 and 200 then raise exception 'Storage location is required'; end if;
 update public.items set status='received_by_police',held_at_station_id=station,storage_location=storage where id=target;
 insert into public.custody_events(item_id,station_id,actor_id,from_status,to_status) values(target,station,auth.uid(),i.status,'received_by_police') returning id into event_id;
 return event_id;
end $fn$;
revoke all on function private.receive_item(uuid, uuid, text, boolean) from public;
grant execute on function private.receive_item(uuid, uuid, text, boolean) to authenticated;
create function public.receive_item(target uuid, station uuid, storage text, confirmed boolean) returns uuid language sql  security invoker set search_path='' as $fn$ select private.receive_item(target, station, storage, confirmed) $fn$;
revoke all on function public.receive_item(uuid, uuid, text, boolean) from public;
grant execute on function public.receive_item(uuid, uuid, text, boolean) to authenticated;

create function private.store_item(target uuid, storage text) returns void language plpgsql  security definer set search_path='' as $fn$ 
declare i public.items;
begin
 select * into i from public.items where id=target for update;
 if not found or not private.can_manage(i.held_at_station_id) then raise exception 'Station access denied' using errcode='42501'; end if;
 if i.status not in ('received_by_police','in_custody') or length(trim(coalesce(storage,''))) not between 1 and 200 then raise exception 'Only received items may enter storage'; end if;
 update public.items set status='in_custody',storage_location=storage where id=target;
 insert into public.custody_events(item_id,station_id,actor_id,from_status,to_status) values(target,i.held_at_station_id,auth.uid(),i.status,'in_custody');
end $fn$;
revoke all on function private.store_item(uuid, text) from public;
grant execute on function private.store_item(uuid, text) to authenticated;
create function public.store_item(target uuid, storage text) returns void language sql  security invoker set search_path='' as $fn$ select private.store_item(target, storage) $fn$;
revoke all on function public.store_item(uuid, text) from public;
grant execute on function public.store_item(uuid, text) to authenticated;

create function private.submit_claim(target uuid, evidence text) returns uuid language plpgsql  security definer set search_path='' as $fn$ 
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 perform 1 from public.items where id=target and kind='found' and publication_status='approved' and status not in ('released','closed') and reporter_id<>auth.uid() for share;
 if not found then raise exception 'Published found report unavailable'; end if;
 if length(trim(coalesce(evidence,''))) not between 10 and 3000 then raise exception 'Provide private evidence between 10 and 3000 characters'; end if;
 insert into public.claims(item_id,claimant_id,private_answer) values(target,auth.uid(),evidence) returning id into result;
 return result;
end $fn$;
revoke all on function private.submit_claim(uuid, text) from public;
grant execute on function private.submit_claim(uuid, text) to authenticated;
create function public.submit_claim(target uuid, evidence text) returns uuid language sql  security invoker set search_path='' as $fn$ select private.submit_claim(target, evidence) $fn$;
revoke all on function public.submit_claim(uuid, text) from public;
grant execute on function public.submit_claim(uuid, text) to authenticated;

create function private.withdraw_report(target uuid) returns void language plpgsql  security definer set search_path='' as $fn$ 
begin
 update public.items set publication_status='withdrawn' where id=target and reporter_id=auth.uid() and publication_status<>'withdrawn';
 if not found then raise exception 'Report unavailable' using errcode='42501'; end if;
end $fn$;
revoke all on function private.withdraw_report(uuid) from public;
grant execute on function private.withdraw_report(uuid) to authenticated;
create function public.withdraw_report(target uuid) returns void language sql  security invoker set search_path='' as $fn$ select private.withdraw_report(target) $fn$;
revoke all on function public.withdraw_report(uuid) from public;
grant execute on function public.withdraw_report(uuid) to authenticated;

grant usage on schema private to anon;
