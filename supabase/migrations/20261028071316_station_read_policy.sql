drop policy stations_approved_read on public.stations;
drop policy stations_admin_read on public.stations;
create policy stations_public_read on public.stations for select to anon using (is_approved);
create policy stations_authenticated_read on public.stations for select to authenticated
using (is_approved or (select private.current_role()) = 'admin');
