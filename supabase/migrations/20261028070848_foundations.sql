create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.user_role as enum ('citizen', 'officer', 'admin');
create type public.item_kind as enum ('lost', 'found');
create type public.item_status as enum ('open', 'pending_surrender', 'received_by_police', 'in_custody', 'approved_for_pickup', 'released', 'closed');
create type public.claim_status as enum ('submitted', 'approved', 'rejected');

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 150),
  type text not null,
  address text not null,
  phone text,
  location extensions.geography(point,4326),
  is_demo boolean not null default true,
  is_approved boolean not null default false
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 150),
  phone text check (length(phone) <= 40),
  role public.user_role not null default 'citizen',
  station_id uuid references public.stations(id)
);
create table public.items (
  id uuid primary key default gen_random_uuid(),
  kind public.item_kind not null,
  reporter_id uuid not null default auth.uid() references public.profiles(id),
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null check (length(trim(description)) between 1 and 3000),
  category text not null check (length(trim(category)) between 1 and 80),
  color text not null check (length(trim(color)) between 1 and 80),
  photo_path text,
  location extensions.geography(point,4326),
  location_text text not null check (length(trim(location_text)) between 1 and 300),
  occurred_at timestamptz not null,
  status public.item_status not null,
  held_at_station_id uuid references public.stations(id),
  private_details text check (length(private_details) <= 3000),
  constraint photo_owned_path check (photo_path is null or photo_path like reporter_id::text || '/%')
);
create table public.custody_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  station_id uuid not null references public.stations(id),
  actor_id uuid not null references public.profiles(id),
  from_status public.item_status not null,
  to_status public.item_status not null,
  created_at timestamptz not null default now()
);
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  claimant_id uuid not null references public.profiles(id),
  private_answer text not null,
  status public.claim_status not null default 'submitted',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);

create index on public.profiles(station_id);
create index on public.items(reporter_id);
create index on public.items(held_at_station_id);
create index on public.custody_events(item_id);
create index on public.custody_events(station_id);
create index on public.custody_events(actor_id);
create index on public.claims(item_id);
create index on public.claims(claimant_id);
create index on public.claims(reviewed_by);

-- Internal lookup avoids recursive profiles RLS. Role comes from the database,
-- never user-editable signup metadata or stale JWT role claims.
create function private.current_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and auth.uid() is not null
$$;
revoke all on function private.current_role() from public;
grant execute on function private.current_role() to authenticated;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 150), 'citizen');
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Role/station assignment is a trusted SQL/server operation, including for admins.
-- No browser session may change these fields, even through a forged REST request.
create function private.guard_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and
    (new.role is distinct from old.role or new.station_id is distinct from old.station_id or new.id is distinct from old.id) then
    raise exception 'Role and station assignments require a trusted administrator operation.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_profile() from public;
create trigger guard_profile before update on public.profiles
for each row execute function private.guard_profile();

create function private.guard_report() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.status := case when new.kind = 'lost' then 'open'::public.item_status else 'pending_surrender'::public.item_status end;
    new.held_at_station_id := null;
  elsif current_user in ('anon', 'authenticated') and
    (new.id is distinct from old.id or new.reporter_id is distinct from old.reporter_id or
     new.kind is distinct from old.kind or new.status is distinct from old.status or
     new.held_at_station_id is distinct from old.held_at_station_id) then
    raise exception 'Report ownership, kind and custody fields cannot be changed here.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_report() from public;
create trigger guard_report before insert or update on public.items
for each row execute function private.guard_report();

alter table public.stations enable row level security;
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.custody_events enable row level security;
alter table public.claims enable row level security;

revoke all on public.stations, public.profiles, public.items, public.custody_events, public.claims from anon, authenticated;
grant select on public.stations to anon, authenticated;
grant insert, update, delete on public.stations to authenticated;
grant select on public.profiles to authenticated;
grant update(full_name, phone) on public.profiles to authenticated;
grant all on public.stations, public.profiles, public.items, public.custody_events, public.claims to service_role;

create policy stations_approved_read on public.stations for select to anon, authenticated using (is_approved);
create policy stations_admin_read on public.stations for select to authenticated using ((select private.current_role()) = 'admin');
create policy stations_admin_insert on public.stations for insert to authenticated with check ((select private.current_role()) = 'admin');
create policy stations_admin_update on public.stations for update to authenticated
using ((select private.current_role()) = 'admin') with check ((select private.current_role()) = 'admin');
create policy stations_admin_delete on public.stations for delete to authenticated using ((select private.current_role()) = 'admin');
create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.current_role()) = 'admin');
create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Public reads are deliberately column-limited. RLS controls rows, not columns.
-- SELECT * on items is denied; use public_items or the authorized detail RPC.
grant select(id, kind, title, description, category, color, location_text, occurred_at, status, held_at_station_id) on public.items to anon, authenticated;
grant insert(kind, reporter_id, title, description, category, color, photo_path, location, location_text, occurred_at, private_details) on public.items to authenticated;
grant update(title, description, category, color, photo_path, location, location_text, occurred_at, private_details) on public.items to authenticated;
create policy items_public_read on public.items for select to anon, authenticated using (true);
create policy items_owner_insert on public.items for insert to authenticated
with check (reporter_id = (select auth.uid()) and held_at_station_id is null and
  status = case when kind = 'lost' then 'open'::public.item_status else 'pending_surrender'::public.item_status end);
create policy items_owner_update on public.items for update to authenticated
using (reporter_id = (select auth.uid()) and status in ('open', 'pending_surrender'))
with check (reporter_id = (select auth.uid()) and status in ('open', 'pending_surrender') and held_at_station_id is null);

create view public.public_items with (security_invoker = true, security_barrier = true) as
select id, kind, title, description, category, color, location_text, occurred_at, status, held_at_station_id from public.items;
grant select on public.public_items to anon, authenticated;

-- Full records never pass through a public view. The internal function checks
-- the current user before bypassing RLS/column grants; the exposed wrapper is invoker.
create function private.item_detail(target_id uuid) returns setof public.items
language sql stable security definer set search_path = '' as $$
  select i.* from public.items i where i.id = target_id and (select auth.uid()) is not null
  and (i.reporter_id = (select auth.uid()) or (select private.current_role()) in ('officer', 'admin'))
$$;
revoke all on function private.item_detail(uuid) from public;
grant execute on function private.item_detail(uuid) to authenticated;
create function public.item_detail(target_id uuid) returns setof public.items
language sql stable security invoker set search_path = '' as $$
  select * from private.item_detail(target_id)
$$;
revoke all on function public.item_detail(uuid) from public;
grant execute on function public.item_detail(uuid) to authenticated;

-- TODO: Receipt/custody and claims workflows. No browser writes granted yet.
grant select on public.custody_events, public.claims to authenticated;
create policy custody_staff_read on public.custody_events for select to authenticated
using ((select private.current_role()) in ('officer', 'admin'));
create policy claims_authorized_read on public.claims for select to authenticated
using (claimant_id = (select auth.uid()) or (select private.current_role()) in ('officer', 'admin'));
