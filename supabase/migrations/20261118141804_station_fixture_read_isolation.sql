-- Keep legacy stations available to their assigned demo staff and admins,
-- while preventing anonymous and ordinary citizen table reads of fixtures.
drop policy if exists stations_public_read on public.stations;
drop policy if exists stations_authenticated_read on public.stations;

create policy stations_public_reference_read
on public.stations for select to anon
using (is_approved and not is_demo);

create policy stations_authenticated_read
on public.stations for select to authenticated
using ((is_approved and not is_demo) or private.can_manage(id));
