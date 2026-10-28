-- Fictional locations, addresses and non-dialable phone placeholders only.
insert into public.stations(name, type, address, phone, location, is_demo, is_approved)
values
  ('DEMO ONLY - North Station', 'demo_police_station', 'Fictional North Road, Demo City', 'DEMO-NOT-A-NUMBER', extensions.st_geogfromtext('SRID=4326;POINT(0.01 0.01)'), true, true),
  ('DEMO ONLY - Central Station', 'demo_police_station', 'Fictional Central Avenue, Demo City', 'DEMO-NOT-A-NUMBER', extensions.st_geogfromtext('SRID=4326;POINT(0.02 0.02)'), true, true),
  ('DEMO ONLY - South Station', 'demo_police_station', 'Fictional South Street, Demo City', 'DEMO-NOT-A-NUMBER', extensions.st_geogfromtext('SRID=4326;POINT(0.03 0.03)'), true, true);
