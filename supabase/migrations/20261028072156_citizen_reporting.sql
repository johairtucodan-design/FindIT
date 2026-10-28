-- Ownership is checked inside a non-exposed function because private columns
-- cannot be selected directly through the public Data API.
create function private.my_reports() returns setof public.items
language sql stable security definer set search_path = '' as $$
  select i.* from public.items i
  where (select auth.uid()) is not null and i.reporter_id = (select auth.uid())
  order by i.occurred_at desc, i.id
$$;
revoke all on function private.my_reports() from public;
grant execute on function private.my_reports() to authenticated;
create function public.my_reports() returns setof public.items
language sql stable security invoker set search_path = '' as $$
  select * from private.my_reports()
$$;
revoke all on function public.my_reports() from public;
grant execute on function public.my_reports() to authenticated;
