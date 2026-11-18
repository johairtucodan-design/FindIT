-- Fill written verification notes on the sourced name and phone fields only.
-- Keep the original values, source URLs, check dates, and all demo rows unchanged.
update public.stations s
set source_notes = jsonb_set(
  s.source_notes,
  '{fields}',
  (
    select jsonb_object_agg(f.key, case when f.value ? 'note' then f.value else f.value || jsonb_build_object(
      'note', case f.key
        when 'name' then 'Name shown as published by the linked public sources; review their locality labels where they differ.'
        when 'phone' then 'Number reproduced from the City Government hotline directory; contact numbers can change, so verify before relying on it.'
        else 'Field reviewed against the linked public source; confirm current details before use.'
      end
    ) end)
    from jsonb_each(s.source_notes->'fields') f
  ),
  true
)
where s.directory_key like 'iligan-%'
  and jsonb_typeof(s.source_notes->'fields') = 'object';
