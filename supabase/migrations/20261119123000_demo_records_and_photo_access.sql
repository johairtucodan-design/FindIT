alter table public.items
  add column is_demo boolean not null default false;

-- Mark only the seven existing records created by the dedicated demo account.
update public.items
set is_demo = true
where reporter_id = 'a6e10000-46b2-4b68-8fb3-000000000000'::uuid
  and id in (
    'a6e10000-46b2-4b68-8fb3-000000000001',
    'a6e10000-46b2-4b68-8fb3-000000000002',
    'a6e10000-46b2-4b68-8fb3-000000000003',
    'a6e10000-46b2-4b68-8fb3-000000000004',
    'a6e10000-46b2-4b68-8fb3-000000000005',
    'a6e10000-46b2-4b68-8fb3-000000000006',
    'a6e10000-46b2-4b68-8fb3-000000000007'
  )
  and title like 'Demo:%';

grant select(is_demo) on public.items to anon, authenticated;

create or replace view public.public_items with (security_invoker = true, security_barrier = true) as
  select id, kind, public_title as title, public_description as description, category, color,
         public_area as location_text, occurred_at, status, null::uuid as held_at_station_id, is_demo
  from public.items
  where publication_status = 'approved';

create or replace function private.my_reports() returns setof public.items
language sql stable security definer set search_path = '' as $$
  select i.* from public.items i
  where (select auth.uid()) is not null
    and i.reporter_id = (select auth.uid())
    and not i.is_demo
  order by i.occurred_at desc, i.id
$$;
revoke all on function private.my_reports() from public;
grant execute on function private.my_reports() to authenticated;

create or replace function private.log_report_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_demo or new.is_demo then return new; end if;
  insert into public.report_history(item_id, actor_id, previous_record, event_type)
  values(old.id, auth.uid(), to_jsonb(old), case
    when new.archived_at is distinct from old.archived_at then 'Report archived'
    when new.status is distinct from old.status then 'Item status changed'
    when new.publication_status is distinct from old.publication_status then 'Publication changed'
    when new.storage_location is distinct from old.storage_location then 'Storage updated'
    else 'Report updated' end);
  return new;
end $$;
revoke all on function private.log_report_edit() from public;

create or replace function private.seed_demo_reports() returns void
language plpgsql security definer set search_path = '' as $$
begin
  with patterns(id, category, lost_title, found_title, color, near_color, lost_description, found_description) as (
    values
      (1, 'Wallet', 'Black bifold wallet', 'Slim dark leather wallet', '#202124', '#30343B', 'Folded black wallet with a brass snap and worn outer corners.', 'Dark bifold wallet with brass-colored snap and lightly worn edges.'),
      (2, 'Bag', 'Canvas tote bag', 'Reusable canvas shoulder bag', '#B78B5A', '#C9A77D', 'Natural canvas tote with two blue stitched handles and a flat base.', 'Canvas shoulder bag with blue handles and a plain rectangular base.'),
      (3, 'Keys', 'Three keys on a green tag', 'Small key ring with green fob', '#7A7A72', '#849178', 'Three silver keys attached to a small green plastic tag.', 'Three metal keys on a ring with a green plastic label.'),
      (4, 'Accessories', 'Navy folding umbrella', 'Compact dark blue umbrella', '#142B4A', '#263D5A', 'Compact umbrella with a navy canopy and curved rubber grip.', 'Folded blue rain umbrella with a curved handle and fabric sleeve.'),
      (5, 'Sports equipment', 'Steel water bottle', 'Reusable metal bottle', '#1686A0', '#247F91', 'Blue steel bottle with a narrow dent close to the bottom edge.', 'Reusable blue metal bottle with a small dent near its base.'),
      (6, 'Electronics', 'White wireless earbuds case', 'Bluetooth earbud charging case', '#F0F0EC', '#D8D8D2', 'White earbud charging case with a fine scratch across the lid.', 'Small white Bluetooth case with a light mark on the top.'),
      (7, 'Accessories', 'Black reading glasses', 'Dark rectangular eyeglasses', '#242424', '#3B3B3B', 'Narrow black frames with straight arms and clear lenses.', 'Dark rectangular glasses with slim arms and transparent lenses.'),
      (8, 'Documents', 'Pocket notebook with red band', 'Small journal with elastic strap', '#9E3434', '#A94B4B', 'Small plain notebook with a red elastic band around the cover.', 'Pocket-sized journal with a red band and unmarked cover.'),
      (9, 'Jewelry', 'Round wristwatch with brown strap', 'Analog watch with leather band', '#70513A', '#806447', 'Round-faced analog watch with a dark brown strap and silver buckle.', 'Wristwatch with a round dial, brown band, and metal clasp.'),
      (10, 'Clothing', 'Gray scarf with thin stripes', 'Soft striped winter scarf', '#777A80', '#8C8E92', 'Soft gray scarf with narrow cream stripes and short fringe.', 'Gray striped scarf with pale lines and fringed ends.'),
      (11, 'Toys', 'Small yellow toy figure', 'Yellow plastic play figure', '#E5B52C', '#D1A735', 'Small yellow plastic figure with one blue painted detail.', 'Yellow toy figure with a small blue mark on its side.'),
      (12, 'Other', 'Green lunch container', 'Rectangular food container', '#4E8A58', '#688A5E', 'Green rectangular lunch container with a clear snap-on lid.', 'Green food box with a transparent lid and side clips.')
  ),
  numbered as (
    select k.kind, n.i as pair_no, ((n.i - 1) % 12) + 1 as pattern_no,
           case when n.i <= 10 then 0 when n.i <= 20 then 1 when n.i <= 30 then 2 else 3 end as tier,
           (case when k.kind = 'lost' then 1000 else 2000 end + n.i) as id_suffix
    from (values ('lost'), ('found')) as k(kind)
    cross join pg_catalog.generate_series(1, 40) as n(i)
  ),
  candidates as (
    select n.kind, n.pair_no,
      ('a6e10000-46b2-4b68-8fb3-' || pg_catalog.lpad(n.id_suffix::text, 12, '0'))::uuid as id,
      case when n.tier = 3 then 'Unknown' else p.category end as category,
      case when n.tier = 3 then 'Item'
           when n.kind = 'found' and n.tier = 2 then pf.found_title
           when n.kind = 'found' then p.found_title else p.lost_title end
        || case when n.tier = 3 then '' else ' (sample ' || n.pair_no::text || ')' end as title,
      case when n.tier = 3 then case when n.kind = 'lost' then 'Lost item' else 'Found item' end
           when n.kind = 'found' and n.tier = 2 then pf.found_description
           when n.kind = 'found' then p.found_description else p.lost_description end as description,
      case when n.tier = 3 then 'Unknown'
           when n.kind = 'found' and n.tier = 1 then p.near_color
           when n.kind = 'found' and n.tier = 2 then pf.color else p.color end as color,
      case when n.tier = 3 then '-'
           when n.kind = 'lost' then 'SyntheticZone' || pg_catalog.chr(65 + ((n.pair_no - 1) % 12))
           when n.tier = 0 then 'SyntheticZone' || pg_catalog.chr(65 + ((n.pair_no - 1) % 12))
           when n.tier = 1 then 'SyntheticZone' || pg_catalog.chr(65 + (n.pair_no % 12))
           else 'SyntheticZone' || pg_catalog.chr(65 + ((n.pair_no + 5) % 12)) end as location_text,
      (timestamptz '2026-08-01 00:00:00+00' + interval '1 day' * ((n.pair_no - 1) * 2 +
        case when n.kind = 'found' and n.tier = 1 then 14
             when n.kind = 'found' and n.tier = 2 then 28
             when n.kind = 'found' and n.tier = 0 then n.pair_no % 2
             else 0 end)) as occurred_at,
      'a6e10000-46b2-4b68-8fb3-000000000000'::uuid as reporter_id,
      (case when n.kind = 'lost' then 'open' else 'pending_surrender' end)::public.item_status as status,
      true as is_demo
    from numbered n
    join patterns p on p.id = n.pattern_no
    join patterns pf on pf.id = ((n.pattern_no + 5) % 12) + 1
  ),
  ranked_missing as (
    select c.*, row_number() over (partition by c.kind order by c.pair_no) as missing_no
    from candidates c
    where not exists (select 1 from public.items i where i.id = c.id)
  ),
  to_insert as (
    select r.* from ranked_missing r
    where r.missing_no <= greatest(0, 40 - (select count(*) from public.items i where i.is_demo and i.kind = r.kind::public.item_kind))
  ),
  inserted as (
    insert into public.items(id, kind, reporter_id, title, description, category, color,
                             location_text, occurred_at, status, is_demo)
    select id, kind::public.item_kind, reporter_id, title, description, category, color,
           location_text, occurred_at, status, is_demo
    from to_insert
    order by kind, pair_no
    on conflict (id) do nothing
    returning id
  )
  update public.items i
  set publication_status = 'approved', public_title = i.title,
      public_description = i.description, public_area = i.location_text
  from inserted x
  where i.id = x.id;
end $$;
revoke all on function private.seed_demo_reports() from public, anon, authenticated;

-- Demo rows are distinct from community submissions, and the function fills only deficits.
select private.seed_demo_reports();
