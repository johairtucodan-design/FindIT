select tablename, rowsecurity from pg_tables where schemaname = 'public'
and tablename in ('stations','profiles','items','custody_events','claims','report_history','retention_rules') order by tablename;
select extname, extversion, extnamespace::regnamespace as schema from pg_extension where extname = 'postgis';
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id in ('item-photos','claim-evidence');
select name, is_demo, is_approved from public.stations order by name;
select schemaname, tablename, policyname, cmd from pg_policies
where schemaname = 'public' or (schemaname = 'storage' and policyname ~ '^(item_photos|claim_evidence)_') order by tablename, policyname;
