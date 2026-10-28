-- Run against a migrated Supabase database using SQL Editor or execute_sql.
-- Fixtures and changes are rolled back, including auth users. No emails sent.
begin;
create temporary table test_users(label text, id uuid default gen_random_uuid());
insert into test_users(label) values ('alice'), ('bob'), ('officer'), ('admin');
grant select on test_users to authenticated, anon;
insert into auth.users(id, email, raw_user_meta_data)
select id, id::text || '@example.invalid', '{"role":"admin","full_name":"RLS test"}'::jsonb from test_users;
update public.profiles set role = 'officer' where id = (select id from test_users where label = 'officer');
update public.profiles set role = 'admin' where id = (select id from test_users where label = 'admin');

create function pg_temp.expect_denied(statement text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege then return;
  end;
  raise exception 'Expected permission denial: %', statement;
end;
$$;
grant execute on function pg_temp.expect_denied(text) to authenticated, anon;
select set_config('request.jwt.claim.sub', (select id::text from test_users where label = 'alice'), true);
set local role authenticated;
do $$
begin
  assert (select role = 'citizen' from public.profiles where id = auth.uid()), 'Signup must ignore metadata role';
  assert (select count(*) = 1 from public.profiles), 'Citizen reads only own profile';
  perform pg_temp.expect_denied('update public.profiles set role = ''admin'' where id = auth.uid()');
  perform pg_temp.expect_denied('update public.profiles set station_id = null where id = auth.uid()');
  update public.profiles set full_name = 'Alice edited' where id = auth.uid();
  assert (select full_name = 'Alice edited' from public.profiles where id = auth.uid());
end;
$$;
insert into public.items(kind,title,description,category,color,location_text,occurred_at,private_details)
values ('lost','RLS lost','Description','Keys','Silver','Fictional place',now(),'Secret lost'),
       ('found','RLS found','Description','Keys','Silver','Fictional place',now(),'Secret found');
-- Check initial status and private access independently.
do $$
begin
  assert (select status = 'open' from public_items where title = 'RLS lost');
  assert (select status = 'pending_surrender' and held_at_station_id is null from public_items where title = 'RLS found');
  assert (select private_details = 'Secret found' from public.item_detail((select id from public_items where title = 'RLS found')));
  update public.items set description = 'Owner edited' where title = 'RLS found';
  assert (select description = 'Owner edited' from public_items where title = 'RLS found');
  perform pg_temp.expect_denied('select private_details from public.items');
  perform pg_temp.expect_denied('update public.items set status = ''in_custody'' where title = ''RLS found''');
  perform pg_temp.expect_denied('update public.items set reporter_id = auth.uid() where title = ''RLS found''');
  perform pg_temp.expect_denied('insert into public.items(kind,reporter_id,title,description,category,color,location_text,occurred_at) select ''lost'',id,''Forgery'',''D'',''Keys'',''Silver'',''Place'',now() from test_users where label = ''bob''');
end;
$$;
select set_config('request.jwt.claim.sub', (select id::text from test_users where label = 'bob'), true);
do $$
declare affected integer;
begin
  assert (select count(*) = 0 from public.item_detail((select id from public_items where title = 'RLS found'))), 'Other citizen must not read secrets';
  update public.items set title = 'Tampered' where title = 'RLS found';
  get diagnostics affected = row_count;
  assert affected = 0, 'Other citizen must not edit report';
  perform pg_temp.expect_denied('insert into public.stations(name,type,address) values (''Forged'',''demo'',''Nowhere'')');
  perform pg_temp.expect_denied('insert into public.claims(item_id,claimant_id,private_answer) values (gen_random_uuid(),auth.uid(),''Forged'')');
end;
$$;
select set_config('request.jwt.claim.sub', (select id::text from test_users where label = 'officer'), true);
do $$
begin
  assert (select private_details = 'Secret found' from public.item_detail((select id from public_items where title = 'RLS found'))), 'Officer reads full record';
end;
$$;
select set_config('request.jwt.claim.sub', (select id::text from test_users where label = 'admin'), true);
do $$
begin
  assert (select count(*) >= 4 from public.profiles), 'Admin reads all profiles';
  perform pg_temp.expect_denied('update public.profiles set role = ''officer'' where id = auth.uid()');
end;
$$;
insert into public.stations(name,type,address,is_approved) values ('DEMO ONLY - Hidden RLS fixture','demo','Nowhere',false);
set local role anon;
do $$
begin
  assert not exists (select 1 from public.stations where name = 'DEMO ONLY - Hidden RLS fixture');
  perform pg_temp.expect_denied('select private_details from public.items');
  perform pg_temp.expect_denied('select * from public.item_detail(gen_random_uuid())');
  assert not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'public_items' and column_name = 'private_details');
end;
$$;
rollback;
select 'RLS checks passed; all test fixtures rolled back' as result;
