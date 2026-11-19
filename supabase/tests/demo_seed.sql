begin;

create temp table real_rows_before as
select id, reporter_id, title, description, photo_path, status, publication_status
from public.items
where not is_demo;

-- Temporarily remove only the last four known seed-owned IDs to exercise top-up.
delete from public.items
where is_demo
  and reporter_id = 'a6e10000-46b2-4b68-8fb3-000000000000'::uuid
  and id in (
    'a6e10000-46b2-4b68-8fb3-000000001036',
    'a6e10000-46b2-4b68-8fb3-000000001037',
    'a6e10000-46b2-4b68-8fb3-000000002035',
    'a6e10000-46b2-4b68-8fb3-000000002036'
  );

select private.run_demo_report_seed();
select private.run_demo_report_seed();

do $$
declare
  lost_count integer;
  found_count integer;
begin
  select count(*) into lost_count from public.items where is_demo and kind = 'lost';
  select count(*) into found_count from public.items where is_demo and kind = 'found';
  if lost_count <> 40 or found_count <> 40 then
    raise exception 'Expected 40 demo lost and 40 demo found; got % lost, % found', lost_count, found_count;
  end if;
  if exists (select 1 from public.items where is_demo and kind = 'lost' and (status <> 'open' or publication_status <> 'approved')) then
    raise exception 'Demo lost reports must remain open and approved for the demo view';
  end if;
  if exists (select 1 from public.items where is_demo and kind = 'found' and (status <> 'pending_surrender' or held_at_station_id is not null or publication_status <> 'approved')) then
    raise exception 'Demo found reports must remain pending surrender and have no custody station';
  end if;
  if exists (select 1 from public.items where is_demo and (right(id::text, 12)::bigint between 1001 and 1040 or right(id::text, 12)::bigint between 2001 and 2040)
    and (photo_path is not null or private_details is not null or contact_method is not null)) then
    raise exception 'Demo reports must not contain private details, user uploads, or contact information';
  end if;
  if exists (
    select 1 from public.items i
    where i.is_demo and (right(i.id::text, 12)::bigint between 1001 and 1040 or right(i.id::text, 12)::bigint between 2001 and 2040)
      and (exists (select 1 from public.claims c where c.item_id = i.id)
        or exists (select 1 from public.custody_events e where e.item_id = i.id)
        or exists (select 1 from public.report_history h where h.item_id = i.id))
  ) then
    raise exception 'Generated examples must not create claims, custody events, or report history';
  end if;
  if exists (
    select id, reporter_id, title, description, photo_path, status, publication_status from real_rows_before
    except
    select id, reporter_id, title, description, photo_path, status, publication_status from public.items where not is_demo
  ) then
    raise exception 'Demo seeding modified a real report';
  end if;
end $$;

rollback;
