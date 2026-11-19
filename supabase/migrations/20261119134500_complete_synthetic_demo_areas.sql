-- Sparse examples still use clearly synthetic areas; their limited details,
-- rather than missing/real-world place labels, keep their matching weak.
create or replace function private.run_demo_report_seed() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.seed_demo_reports();

  update public.items i
  set location_text = 'SyntheticZone' || pg_catalog.chr(65 + ((right(i.id::text, 12)::bigint -
        case when i.kind = 'lost' then 1001 else 2001 end) % 12)::integer),
      public_area = 'SyntheticZone' || pg_catalog.chr(65 + ((right(i.id::text, 12)::bigint -
        case when i.kind = 'lost' then 1001 else 2001 end) % 12)::integer)
  where i.is_demo
    and i.reporter_id = 'a6e10000-46b2-4b68-8fb3-000000000000'::uuid
    and (right(i.id::text, 12)::bigint between 1001 and 1040
      or right(i.id::text, 12)::bigint between 2001 and 2040)
    and i.location_text = '-';

  update public.items i
  set publication_status = 'approved',
      public_title = i.title,
      public_description = i.description,
      public_area = i.location_text
  where i.is_demo
    and i.reporter_id = 'a6e10000-46b2-4b68-8fb3-000000000000'::uuid
    and (right(i.id::text, 12)::bigint between 1001 and 1040
      or right(i.id::text, 12)::bigint between 2001 and 2040)
    and i.publication_status <> 'approved';
end $$;

revoke all on function private.run_demo_report_seed() from public, anon, authenticated;

select private.run_demo_report_seed();
