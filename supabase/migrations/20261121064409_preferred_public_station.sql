-- Keep a citizen's preferred public reference separate from operational
-- station assignment, custody, and staff queues.
alter table public.items
  add column preferred_station_id uuid references public.stations(id) on delete set null;

create index items_preferred_station_id_idx on public.items(preferred_station_id)
  where preferred_station_id is not null;

comment on column public.items.preferred_station_id is
  'Optional public-reference preference selected by the reporter; it does not assign a report to station staff or confirm a handover.';

grant insert(preferred_station_id), update(preferred_station_id) on public.items to authenticated;

create function private.guard_preferred_station_reference() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.preferred_station_id is not null and not exists (
    select 1 from public.stations s
    where s.id=new.preferred_station_id
      and s.is_approved
      and not s.is_demo
      and s.directory_key is not null
      and s.type='public_reference_police_station'
  ) then
    raise exception 'Choose an available public reference station' using errcode='23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_preferred_station_reference() from public,anon,authenticated;
create trigger guard_preferred_station_reference
before insert or update of preferred_station_id on public.items
for each row execute function private.guard_preferred_station_reference();
