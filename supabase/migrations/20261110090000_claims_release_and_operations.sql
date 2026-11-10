alter table public.claims
  add column submitted_at timestamptz,
  add column released_at timestamptz,
  add column evidence_path text unique;
alter table public.claims alter column submitted_at set default now();

alter table public.items add column archived_at timestamptz;
alter table public.report_history add column event_type text not null default 'Report updated';

-- Keep the existing view shape for clients while removing station-level custody data.
create or replace view public.public_items with(security_invoker=true, security_barrier=true) as
  select id,kind,public_title as title,public_description as description,category,color,
         public_area as location_text,occurred_at,status,null::uuid as held_at_station_id
  from public.items where publication_status='approved';
revoke select(held_at_station_id) on public.items from anon,authenticated;

create or replace function private.log_report_edit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.report_history(item_id,actor_id,previous_record,event_type)
  values(old.id,auth.uid(),to_jsonb(old),case
    when new.archived_at is distinct from old.archived_at then 'Report archived'
    when new.status is distinct from old.status then 'Item status changed'
    when new.publication_status is distinct from old.publication_status then 'Publication changed'
    when new.storage_location is distinct from old.storage_location then 'Storage updated'
    else 'Report updated' end);
  return new;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('claim-evidence','claim-evidence',false,4194304,array['image/webp']);

create policy claim_evidence_upload on storage.objects for insert to authenticated
with check(bucket_id='claim-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy claim_evidence_read on storage.objects for select to authenticated using(
  bucket_id='claim-evidence' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(
    select 1 from public.claims c where c.evidence_path=name and private.can_manage_item(c.item_id)
  ))
);

create policy claim_evidence_cleanup on storage.objects for delete to authenticated using(
  bucket_id='claim-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists(select 1 from public.claims c where c.evidence_path=name)
);

drop function public.submit_claim(uuid,text);
drop function private.submit_claim(uuid,text);
create function private.submit_claim(target uuid,evidence text,attachment text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
  perform 1 from public.items where id=target and kind='found' and publication_status='approved'
    and status not in ('approved_for_pickup','released','closed') and reporter_id<>auth.uid() for share;
  if not found then raise exception 'This report is unavailable for new claims'; end if;
  if length(trim(coalesce(evidence,''))) not between 10 and 3000 then
    raise exception 'Provide private evidence between 10 and 3000 characters';
  end if;
  if attachment is not null then
    if split_part(attachment,'/',1)<>auth.uid()::text then raise exception 'Evidence image unavailable'; end if;
    perform 1 from storage.objects where bucket_id='claim-evidence' and name=attachment for share;
    if not found then raise exception 'Evidence image unavailable'; end if;
  end if;
  insert into public.claims(item_id,claimant_id,private_answer,evidence_path)
  values(target,auth.uid(),evidence,attachment) returning id into result;
  return result;
end $$;
revoke all on function private.submit_claim(uuid,text,text) from public;
grant execute on function private.submit_claim(uuid,text,text) to authenticated;

create function public.submit_claim(target uuid,evidence text,attachment text default null) returns uuid
language sql security invoker set search_path='' as $$
  select private.submit_claim(target,evidence,attachment)
$$;
revoke all on function public.submit_claim(uuid,text,text) from public;
grant execute on function public.submit_claim(uuid,text,text) to authenticated;

create function private.review_claim(target uuid,decision text) returns void
language plpgsql security definer set search_path='' as $$
declare item public.items; claim public.claims;
begin
  -- All claim and custody mutations lock the item first.
  select * into item from public.items where id=(select item_id from public.claims where id=target) for update;
  if not found or not private.can_manage(coalesce(item.held_at_station_id,item.intended_station_id)) then
    raise exception 'Station access denied' using errcode='42501';
  end if;
  select * into claim from public.claims where id=target;
  if claim.status<>'submitted' or decision is null or decision not in ('approved','rejected') then
    raise exception 'Only submitted claims can be reviewed';
  end if;
  if decision='approved' then
    if item.held_at_station_id is null or item.status not in ('received_by_police','in_custody') then
      raise exception 'Confirm physical receipt before approving pickup';
    end if;
    update public.items set status='approved_for_pickup' where id=item.id;
    insert into public.custody_events(item_id,station_id,actor_id,from_status,to_status)
    values(item.id,item.held_at_station_id,auth.uid(),item.status,'approved_for_pickup');
    update public.claims set status='rejected',reviewed_at=now(),reviewed_by=auth.uid()
    where item_id=item.id and id<>target and status='submitted';
  end if;
  update public.claims set status=decision::public.claim_status,reviewed_at=now(),reviewed_by=auth.uid()
  where id=target;
end $$;
revoke all on function private.review_claim(uuid,text) from public;
grant execute on function private.review_claim(uuid,text) to authenticated;
create function public.review_claim(target uuid,decision text) returns void
language sql security invoker set search_path='' as $$select private.review_claim(target,decision)$$;
revoke all on function public.review_claim(uuid,text) from public;
grant execute on function public.review_claim(uuid,text) to authenticated;

create function private.release_item(target uuid,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare item public.items; release_ref uuid;
begin
  select * into item from public.items where id=target for update;
  if not found or not private.can_manage(item.held_at_station_id) then
    raise exception 'Station access denied' using errcode='42501';
  end if;
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
revoke all on function private.release_item(uuid,boolean) from public;
grant execute on function private.release_item(uuid,boolean) to authenticated;
create function public.release_item(target uuid,confirmed boolean) returns uuid
language sql security invoker set search_path='' as $$select private.release_item(target,confirmed)$$;
revoke all on function public.release_item(uuid,boolean) from public;
grant execute on function public.release_item(uuid,boolean) to authenticated;

create table public.retention_rules (
  id boolean primary key default true check(id),
  retention_days integer not null check(retention_days between 1 and 3650)
);
insert into public.retention_rules(retention_days) values(90);
alter table public.retention_rules enable row level security;
revoke all on public.retention_rules from anon,authenticated;
grant select on public.retention_rules to authenticated;
create policy retention_admin_read on public.retention_rules for select to authenticated using(private.can_manage(null));

create function private.set_retention(days integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.can_manage(null) then raise exception 'Admin access required' using errcode='42501'; end if;
  if days is null or days not between 1 and 3650 then raise exception 'Choose 1 to 3650 days'; end if;
  -- Lock the rule so an archive always evaluates one complete rule.
  update public.retention_rules set retention_days=days where id;
end $$;
revoke all on function private.set_retention(integer) from public;
grant execute on function private.set_retention(integer) to authenticated;
create function public.set_retention(days integer) returns void
language sql security invoker set search_path='' as $$select private.set_retention(days)$$;
revoke all on function public.set_retention(integer) from public;
grant execute on function public.set_retention(integer) to authenticated;

create function private.retention_candidates() returns table(id uuid,title text,ended_at timestamptz)
language sql stable security definer set search_path='' as $$
  select i.id,i.title,e.ended_at from public.items i
  cross join public.retention_rules r
  cross join lateral (
    select max(c.created_at) as ended_at from public.custody_events c
    where c.item_id=i.id and c.to_status in ('released','closed')
  ) e
  where private.can_manage(null) and i.archived_at is null and i.status in ('released','closed')
    and e.ended_at <= now() - make_interval(days=>r.retention_days)
  order by e.ended_at,i.id
$$;
revoke all on function private.retention_candidates() from public;
grant execute on function private.retention_candidates() to authenticated;
create function public.retention_candidates() returns table(id uuid,title text,ended_at timestamptz)
language sql security invoker set search_path='' as $$select * from private.retention_candidates()$$;
revoke all on function public.retention_candidates() from public;
grant execute on function public.retention_candidates() to authenticated;

create function private.archive_report(target uuid,confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.can_manage(null) then raise exception 'Admin access required' using errcode='42501'; end if;
  if confirmed is distinct from true then raise exception 'Confirm archival'; end if;
  perform 1 from public.retention_rules where id for share;
  perform 1 from public.items where id=target for update;
  if not exists(select 1 from private.retention_candidates() where id=target) then
    raise exception 'This report is no longer eligible for archival';
  end if;
  update public.items set archived_at=now(),publication_status='withdrawn' where id=target;
end $$;
revoke all on function private.archive_report(uuid,boolean) from public;
grant execute on function private.archive_report(uuid,boolean) to authenticated;
create function public.archive_report(target uuid,confirmed boolean) returns void
language sql security invoker set search_path='' as $$select private.archive_report(target,confirmed)$$;
revoke all on function public.archive_report(uuid,boolean) from public;
grant execute on function public.archive_report(uuid,boolean) to authenticated;

create function private.station_summary(station uuid,start_day date,end_day date)
returns table(received bigint,pending_claims bigint,released bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if station is null or not private.can_manage(station) then
    raise exception 'Station access denied' using errcode='42501';
  end if;
  if start_day is null or end_day is null or end_day<start_day or end_day-start_day>366 then
    raise exception 'Choose a date range of up to one year';
  end if;
  return query select
    count(*) filter(where e.to_status='received_by_police'),
    (select count(*) from public.claims c join public.items i on i.id=c.item_id
     where i.held_at_station_id=station and c.status='submitted'
       and (c.submitted_at at time zone 'Asia/Singapore')::date between start_day and end_day),
    count(*) filter(where e.to_status='released')
    from public.custody_events e where e.station_id=station
      and (e.created_at at time zone 'Asia/Singapore')::date between start_day and end_day;
end $$;
revoke all on function private.station_summary(uuid,date,date) from public;
grant execute on function private.station_summary(uuid,date,date) to authenticated;
create function public.station_summary(station uuid,start_day date,end_day date)
returns table(received bigint,pending_claims bigint,released bigint)
language sql security invoker set search_path='' as $$select * from private.station_summary(station,start_day,end_day)$$;
revoke all on function public.station_summary(uuid,date,date) from public;
grant execute on function public.station_summary(uuid,date,date) to authenticated;

create function private.seed_demo_cases() returns void
language plpgsql security definer set search_path='' as $$
declare station uuid; seeded uuid;
begin
  if not private.can_manage(null) then raise exception 'Admin access required' using errcode='42501'; end if;
  select id into station from public.stations where is_demo and is_approved order by name,id limit 1;
  if station is null then raise exception 'Approve a fictional demo station first'; end if;
  insert into public.items(id,kind,reporter_id,title,description,category,color,location_text,
    occurred_at,contact_method,intended_station_id,private_details)
  values('93200000-3131-4131-8131-000000000001','found',auth.uid(),'Demo case: keys near Central Plaza',
    'Fictional silver keys with a mint strap.','Keys','Silver','Demo City',now(),
    'demo@example.invalid',station,'Demo proof: the reverse of the tag says SAMPLE-27')
  on conflict(id) do nothing returning id into seeded;
  if seeded is not null then
    update public.items set publication_status='approved',public_title='Demo case: keys near Central Plaza',
      public_description='Fictional set of keys found near Central Plaza.',public_area='Demo City' where id=seeded;
  end if;
  insert into public.items(id,kind,reporter_id,title,description,category,color,location_text,occurred_at,contact_method)
  values('93200000-3131-4131-8131-000000000002','lost',auth.uid(),'Demo case: missing keys',
    'Fictional keys last seen near Central Plaza.','Keys','Silver','Demo City',now(),'demo@example.invalid')
  on conflict(id) do nothing returning id into seeded;
  if seeded is not null then
    update public.items set publication_status='approved',public_title='Demo case: missing keys',
      public_description='Fictional keys last seen near Central Plaza.',public_area='Demo City' where id=seeded;
  end if;
end $$;
revoke all on function private.seed_demo_cases() from public;
grant execute on function private.seed_demo_cases() to authenticated;
create function public.seed_demo_cases() returns void
language sql security invoker set search_path='' as $$select private.seed_demo_cases()$$;
revoke all on function public.seed_demo_cases() from public;
grant execute on function public.seed_demo_cases() to authenticated;
