begin;
create temp table fixtures(label text,id uuid default gen_random_uuid());
insert into fixtures(label) values ('reporter'),('claimant'),('officerA'),('officerB'),('admin');
grant select on fixtures to authenticated,anon;
insert into auth.users(id,email) select id,id::text||'@example.invalid' from fixtures;
create temp table sites as select id,row_number() over(order by name) n from public.stations where is_demo and is_approved;
grant select on sites to authenticated,anon;
update public.profiles set role='officer',station_id=(select id from sites where n=1) where id=(select id from fixtures where label='officerA');
update public.profiles set role='officer',station_id=(select id from sites where n=2) where id=(select id from fixtures where label='officerB');
update public.profiles set role='admin' where id=(select id from fixtures where label='admin');
create function pg_temp.denied(statement text) returns void language plpgsql as $$begin begin execute statement; exception when others then return; end;raise exception 'Operation unexpectedly permitted: %',statement;end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='reporter'),true);
set local role authenticated;
insert into public.items(kind,title,description,category,color,location_text,occurred_at,contact_method,intended_station_id,private_details)
select 'found','Sensitive title','Original secret engraving','Keys','Silver','Exact place',now(),'private@example.invalid',id,'Unique secret' from sites where n=1;
create temp table target as select id from public.my_reports();
grant select on target to authenticated,anon;
do $$begin
 assert (select status='pending_surrender' and held_at_station_id is null and publication_status='pending' from public.item_detail((select id from target)));
 assert (select count(*)=0 from public.public_items where id=(select id from target));
 perform pg_temp.denied('select description from public.items');
 perform pg_temp.denied('select public.receive_item((select id from target),(select id from sites where n=1),''Shelf'',true)');
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerB'),true);
do $$begin
 assert (select count(*)=0 from public.item_detail((select id from target)));
 assert (select count(*)=0 from public.staff_reports());
 perform pg_temp.denied('select public.receive_item((select id from target),(select id from sites where n=1),''Shelf'',true)');
 perform pg_temp.denied('select public.moderate_report((select id from target),''approved'',''Keys'',''Safe description'',''Demo area'')');
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerA'),true);
select public.moderate_report((select id from target),'approved','Keys','Safe description','Demo area');
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='reporter'),true);
update public.items set description='Corrected original secret' where id=(select id from target);
do $$begin assert (select count(*)=0 from public.public_items where id=(select id from target)), 'Edits must return to moderation';end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerA'),true);
select public.moderate_report((select id from target),'rejected','','','');
do $$begin assert (select count(*)=0 from public.public_items where id=(select id from target)), 'Rejected records hidden';end;$$;
select public.moderate_report((select id from target),'approved','Keys','Safe description','Demo area');
do $$begin
 assert (select description='Safe description' from public.public_items where id=(select id from target));
 perform pg_temp.denied('select public.receive_item((select id from target),(select id from sites where n=1),''Shelf'',false)');
end;$$;
select public.receive_item((select id from target),(select id from sites where n=1),'Shelf A',true);
select public.store_item((select id from target),'Shelf B');
do $$begin
 assert (select status='in_custody' and storage_location='Shelf B' from public.item_detail((select id from target)));
 assert (select count(*)=2 from public.custody_events where item_id=(select id from target));
 perform pg_temp.denied('select public.receive_item((select id from target),(select id from sites where n=1),''Shelf'',true)');
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='claimant'),true);
select public.submit_claim((select id from target),'Private ownership evidence');
do $$begin
 assert (select count(*)=1 from public.claims where claimant_id=auth.uid());
 perform pg_temp.denied('select public.submit_claim((select id from target),''Private ownership evidence'')');
 assert (select count(*)=0 from public.item_detail((select id from target)));
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerB'),true);
do $$begin assert (select count(*)=0 from public.claims where item_id=(select id from target));end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='reporter'),true);
select public.withdraw_report((select id from target));
do $$begin
 assert (select count(*)=0 from public.public_items where id=(select id from target));
 assert (select count(*)>=4 from public.report_history where item_id=(select id from target));
end;$$;
rollback;
select 'PASS station isolation, safe publication, physical intake, custody, private claims, withdrawal and history' as result;
