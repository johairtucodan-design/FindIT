-- Guest reports: people can submit a lost or found report without an account.
-- Guest reports are stored separately from account-owned items, are never public,
-- and are readable only by staff assigned to the chosen public-reference station (or admins).

create table public.guest_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind = 'found'),  -- guest reports are found reports only
  title text not null check (length(trim(title)) between 1 and 120),
  category text not null check (length(trim(category)) between 1 and 80),
  color text not null check (length(trim(color)) between 1 and 80),
  description text not null check (length(trim(description)) between 1 and 3000),
  location_text text not null check (length(trim(location_text)) between 1 and 300),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  occurred_at timestamptz not null,
  contact_method text not null check (length(trim(contact_method)) between 1 and 250),
  private_details text check (private_details is null or length(private_details) <= 3000),
  preferred_station_id uuid references public.stations(id),
  status text not null default 'pending_review' check (status in ('pending_review','reviewed','dismissed')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint guest_reports_occurred_not_future check (occurred_at <= now() + interval '1 day')
);
create index on public.guest_reports(preferred_station_id);

alter table public.guest_reports enable row level security;
revoke all on public.guest_reports from anon, authenticated;
grant select on public.guest_reports to authenticated;
create policy guest_reports_staff_read on public.guest_reports for select to authenticated
  using (preferred_station_id is not null and private.can_manage(preferred_station_id));

create function public.submit_guest_report(
  p_kind text, p_title text, p_category text, p_color text, p_description text,
  p_location_text text, p_occurred_at timestamptz, p_contact_method text,
  p_latitude double precision, p_longitude double precision,
  p_private_details text, p_station uuid, p_website text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  -- Honeypot: real forms leave this empty; bots tend to fill every field.
  if p_website is not null and length(p_website) > 0 then
    raise exception 'Submission rejected' using errcode = '42501';
  end if;
  if p_station is not null and not exists (
    select 1 from public.stations s where s.id = p_station and s.is_approved and not s.is_demo
  ) then
    raise exception 'Choose an approved public reference station' using errcode = '22023';
  end if;
  insert into public.guest_reports (
    kind, title, category, color, description, location_text, occurred_at,
    contact_method, private_details, preferred_station_id, latitude, longitude
  ) values (
    p_kind, trim(p_title), trim(p_category), trim(p_color), trim(p_description), trim(p_location_text),
    p_occurred_at, trim(p_contact_method), nullif(trim(coalesce(p_private_details, '')), ''), p_station,
    p_latitude, p_longitude
  ) returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_guest_report(text,text,text,text,text,text,timestamptz,text,double precision,double precision,text,uuid,text) from public;
grant execute on function public.submit_guest_report(text,text,text,text,text,text,timestamptz,text,double precision,double precision,text,uuid,text) to anon, authenticated;

-- Staff review: only staff assigned to the report's station (or an admin) can decide, and only once.
create function public.review_guest_report(p_id uuid, p_decision text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_decision not in ('reviewed','dismissed') then
    raise exception 'Choose reviewed or dismissed' using errcode = '22023';
  end if;
  update public.guest_reports
     set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id and status = 'pending_review' and preferred_station_id is not null
     and private.can_manage(preferred_station_id);
  if not found then
    raise exception 'Report not found, already decided, or outside your station' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.review_guest_report(uuid, text) from public;
grant execute on function public.review_guest_report(uuid, text) to authenticated;
