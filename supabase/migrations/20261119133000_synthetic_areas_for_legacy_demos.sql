-- These seven pre-existing demo examples used unsourced city landmarks.
-- Keep them useful for matching while clearly marking their areas synthetic.
update public.items
set location_text = case id
      when 'a6e10000-46b2-4b68-8fb3-000000000001'::uuid then 'SyntheticZoneA'
      when 'a6e10000-46b2-4b68-8fb3-000000000002'::uuid then 'SyntheticZoneB'
      when 'a6e10000-46b2-4b68-8fb3-000000000003'::uuid then 'SyntheticZoneC'
      when 'a6e10000-46b2-4b68-8fb3-000000000004'::uuid then 'SyntheticZoneD'
      when 'a6e10000-46b2-4b68-8fb3-000000000005'::uuid then 'SyntheticZoneE'
      when 'a6e10000-46b2-4b68-8fb3-000000000006'::uuid then 'SyntheticZoneF'
      when 'a6e10000-46b2-4b68-8fb3-000000000007'::uuid then 'SyntheticZoneG'
    end,
    public_area = case id
      when 'a6e10000-46b2-4b68-8fb3-000000000001'::uuid then 'SyntheticZoneA'
      when 'a6e10000-46b2-4b68-8fb3-000000000002'::uuid then 'SyntheticZoneB'
      when 'a6e10000-46b2-4b68-8fb3-000000000003'::uuid then 'SyntheticZoneC'
      when 'a6e10000-46b2-4b68-8fb3-000000000004'::uuid then 'SyntheticZoneD'
      when 'a6e10000-46b2-4b68-8fb3-000000000005'::uuid then 'SyntheticZoneE'
      when 'a6e10000-46b2-4b68-8fb3-000000000006'::uuid then 'SyntheticZoneF'
      when 'a6e10000-46b2-4b68-8fb3-000000000007'::uuid then 'SyntheticZoneG'
    end
where is_demo
  and reporter_id = 'a6e10000-46b2-4b68-8fb3-000000000000'::uuid
  and id in (
    'a6e10000-46b2-4b68-8fb3-000000000001',
    'a6e10000-46b2-4b68-8fb3-000000000002',
    'a6e10000-46b2-4b68-8fb3-000000000003',
    'a6e10000-46b2-4b68-8fb3-000000000004',
    'a6e10000-46b2-4b68-8fb3-000000000005',
    'a6e10000-46b2-4b68-8fb3-000000000006',
    'a6e10000-46b2-4b68-8fb3-000000000007'
  )
  and title like 'Demo:%';
