-- Publication exposes only reviewed text, never original report descriptions.
revoke select(title,description,location_text) on public.items from anon,authenticated;
-- Row and column authorization remain separate. Owner reads use item_detail.
