create function private.can_manage_item(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.items i where i.id=target and private.can_manage(coalesce(i.held_at_station_id,i.intended_station_id)))
$$;
revoke all on function private.can_manage_item(uuid) from public;
grant execute on function private.can_manage_item(uuid) to authenticated;
alter policy claims_scoped_read on public.claims using(claimant_id=(select auth.uid()) or private.can_manage_item(item_id));
