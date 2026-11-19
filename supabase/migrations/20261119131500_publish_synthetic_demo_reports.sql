-- The seed INSERT and the publication UPDATE cannot share one data-modifying CTE:
-- PostgreSQL's statement snapshot cannot see rows inserted by a sibling CTE.
-- Run the existing idempotent seed first, then publish only its reserved IDs.
create or replace function private.run_demo_report_seed() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.seed_demo_reports();

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
