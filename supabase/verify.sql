select tablename, rowsecurity from pg_tables where schemaname = 'public'
and tablename in ('stations','profiles','items','custody_events','claims') order by tablename;
select extname, extversion, extnamespace::regnamespace as schema from pg_extension where extname = 'postgis';
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'item-photos';
select name, is_demo, is_approved from public.stations order by name;
select schemaname, tablename, policyname, cmd from pg_policies
where schemaname = 'public' or (schemaname = 'storage' and policyname like 'item_photos_%') order by tablename, policyname;
