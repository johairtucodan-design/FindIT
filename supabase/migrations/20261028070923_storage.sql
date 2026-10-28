insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Supabase manages storage.objects and enables RLS on it by default.
create policy item_photos_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy item_photos_authorized_read on storage.objects for select to authenticated
using (bucket_id = 'item-photos' and
  ((storage.foldername(name))[1] = (select auth.uid())::text or
   (select private.current_role()) in ('officer', 'admin')));
create policy item_photos_owner_update on storage.objects for update to authenticated
using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy item_photos_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
