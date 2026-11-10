begin;
create temp table fixtures(label text,id uuid default gen_random_uuid());
insert into fixtures(label) values ('reporter'),('claimant'),('otherClaimant'),('officerA'),('officerB'),('admin');
grant select on fixtures to authenticated,anon;
insert into auth.users(id,email) select id,id::text||'@example.invalid' from fixtures;
create temp table sites as select id,row_number() over(order by name) n from public.stations where is_demo and is_approved;
grant select on sites to authenticated,anon;
set local time zone 'Asia/Singapore';
update public.profiles set role='officer',station_id=(select id from sites where n=1) where id=(select id from fixtures where label='officerA');
update public.profiles set role='officer',station_id=(select id from sites where n=2) where id=(select id from fixtures where label='officerB');
update public.profiles set role='admin' where id=(select id from fixtures where label='admin');
create function pg_temp.denied(statement text) returns void language plpgsql as $$begin begin execute statement; exception when others then return; end;raise exception 'Operation unexpectedly permitted: %',statement;end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerA'),true);
set local role authenticated;
create temp table summary_before as select * from public.station_summary((select id from sites where n=1),current_date,current_date);
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='reporter'),true);
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
 assert (select count(*)=0 from public.staff_reports() where id=(select id from target));
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
insert into storage.objects(bucket_id,name) values('claim-evidence',auth.uid()::text||'/qa.webp');
select public.submit_claim((select id from target),'Private ownership evidence',auth.uid()::text||'/qa.webp');
do $$begin
 assert (select count(*)=1 from public.claims where claimant_id=auth.uid());
 perform pg_temp.denied('select public.submit_claim((select id from target),''Private ownership evidence'')');
 assert (select count(*)=0 from public.item_detail((select id from target)));
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerB'),true);
do $$begin
 assert (select count(*)=0 from public.claims where item_id=(select id from target));
 assert (select count(*)=0 from storage.objects where bucket_id='claim-evidence' and name=(select id::text||'/qa.webp' from fixtures where label='claimant'));
 perform pg_temp.denied('select public.release_item((select id from target),true)');
 perform pg_temp.denied('select public.station_summary((select id from sites where n=1),current_date,current_date)');
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='otherClaimant'),true);
do $$begin assert (select count(*)=0 from public.claims where item_id=(select id from target)); end;$$;
select public.submit_claim((select id from target),'Competing private evidence');
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerA'),true);
do $$begin
 assert (select count(*)=1 from storage.objects where bucket_id='claim-evidence' and name=(select id::text||'/qa.webp' from fixtures where label='claimant'));
 assert (select s.received=b.received+1 and s.pending_claims=b.pending_claims+2 and s.released=b.released
   from public.station_summary((select id from sites where n=1),current_date,current_date) s cross join summary_before b);
 perform pg_temp.denied('select public.release_item((select id from target),true)');
 perform pg_temp.denied('select public.set_retention(1)');
end;$$;
select public.review_claim((select id from public.claims where claimant_id=(select id from fixtures where label='claimant')),'approved');
do $$begin
 assert (select status='approved_for_pickup' from public.item_detail((select id from target)));
 assert (select status='rejected' and reviewed_at is not null from public.claims where claimant_id=(select id from fixtures where label='otherClaimant'));
 perform pg_temp.denied('select public.review_claim((select id from public.claims where claimant_id=(select id from fixtures where label=''otherClaimant'')),''approved'')');
 perform pg_temp.denied('select public.release_item((select id from target),false)');
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerB'),true);
do $$begin perform pg_temp.denied('select public.release_item((select id from target),true)'); end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='officerA'),true);
select public.release_item((select id from target),true);
do $$begin
 assert (select status='released' from public.item_detail((select id from target)));
 assert (select count(*)=4 from public.custody_events where item_id=(select id from target));
 assert (select s.received=b.received+1 and s.pending_claims=b.pending_claims and s.released=b.released+1
   from public.station_summary((select id from sites where n=1),current_date,current_date) s cross join summary_before b);
 perform pg_temp.denied('select public.release_item((select id from target),true)');
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='claimant'),true);
do $$begin
 assert (select status='approved' and released_at>=reviewed_at from public.claims where claimant_id=auth.uid());
 assert (select count(*)=1 from public.claims);
 perform pg_temp.denied('delete from public.custody_events where item_id=(select id from target)');
end;$$;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='reporter'),true);
select public.withdraw_report((select id from target));
do $$begin
 assert (select count(*)=0 from public.public_items where id=(select id from target));
 assert (select count(*)>=4 from public.report_history where item_id=(select id from target));
end;$$;
reset role;
update public.custody_events set created_at=now()-interval '10 days' where item_id=(select id from target) and to_status='released';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where label='admin'),true);
select public.set_retention(5);
do $$begin
 assert (select count(*)=1 from public.retention_candidates() where id=(select id from target));
 perform pg_temp.denied('select public.archive_report((select id from target),false)');
end;$$;
select public.archive_report((select id from target),true);
select public.seed_demo_cases();
select public.seed_demo_cases();
do $$begin
 assert (select archived_at is not null from public.item_detail((select id from target)));
 assert (select count(*)=1 from public.report_history where item_id=(select id from target) and event_type='Report archived' and actor_id=auth.uid());
 assert (select count(*)=4 from public.custody_events where item_id=(select id from target));
 assert (select count(*)=2 from public.staff_reports() where id in ('93200000-3131-4131-8131-000000000001','93200000-3131-4131-8131-000000000002'));
end;$$;
set local role anon;
do $$begin
 assert (select count(*)=0 from public.public_items where held_at_station_id is not null);
 perform pg_temp.denied('select held_at_station_id from public.items');
 perform pg_temp.denied('select private_answer from public.claims');
end;$$;
rollback;
select 'PASS publication, intake, custody, private claims, approval, release, station summary and archival' as result;
