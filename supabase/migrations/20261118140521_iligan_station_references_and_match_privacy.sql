-- Add sourced public reference listings without changing existing demo stations
-- or any profile, item, claim, custody, or history foreign-key relationship.
alter table public.stations
  add column directory_key text unique,
  add column source_notes jsonb not null default '{}'::jsonb,
  add constraint stations_source_notes_object check (jsonb_typeof(source_notes) = 'object');

comment on column public.stations.directory_key is 'Stable key for a sourced public reference listing; null for operational demo fixtures.';
comment on column public.stations.source_notes is 'Field-level public source URLs, check date, and verification notes for reference listings.';

insert into public.stations(directory_key,name,type,address,phone,location,is_demo,is_approved,receiving_hours,service_area,source_notes)
values
('iligan-ps1','Iligan City Police Station 1','public_reference_police_station','',
 '0917-166-3440 / 221-9315 / 911',null,false,true,'','',
 $$
 {"checkedAt":"2026-11-18","fields":{
   "name":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"Station number confirmed; city and PNP sources use different locality labels."},
   "address":{"status":"conflict","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PIA report on the new Station 1 building","url":"https://pia.gov.ph/news/mindanao/nm/iligan-opens-new-police-station-1-building-to-improve-public-service"}],"note":"No exact street address published. The city directory still labels the station Tambo while PIA reports a new building in Barangay San Miguel; left blank pending confirmation."},
   "phone":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}]},
   "receivingHours":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No lost-property receiving hours published."},
   "serviceArea":{"status":"conflict","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"},{"label":"PIA report on the new Station 1 building","url":"https://pia.gov.ph/news/mindanao/nm/iligan-opens-new-police-station-1-building-to-improve-public-service"}],"note":"Sources list Tambo, Hinaplanon, and a new facility in San Miguel; no official service-area boundary was found."},
   "coordinates":{"status":"conflict","sources":[{"label":"Existing Google Maps pin for Station 1","url":"https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+1/@8.2435705,124.2593775,17z"},{"label":"PIA report on the new Station 1 building","url":"https://pia.gov.ph/news/mindanao/nm/iligan-opens-new-police-station-1-building-to-improve-public-service"}],"note":"The existing pin is at the earlier Tambo location and conflicts with the newer San Miguel facility report; no marker is shown until the current pin is verified."}
 }}
 $$::jsonb),
('iligan-ps2','Iligan City Police Station 2','public_reference_police_station','',
 '0917-725-2854 / 0998-598-7008 / 165',extensions.st_geogfromtext('SRID=4326;POINT(124.2032519 8.2037673)'),false,true,'','',
 $$
 {"checkedAt":"2026-11-18","fields":{
   "name":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}]},
   "address":{"status":"conflict","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"},{"label":"Existing Google Maps pin for Station 2","url":"https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+2/@8.2037673,124.2032519,17z"}],"note":"The city directory says Nunucan and the PNP roster says Nonocan; neither publishes an exact street address, so this field is blank."},
   "phone":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}]},
   "receivingHours":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No lost-property receiving hours published."},
   "serviceArea":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"No official service-area boundaries published."},
   "coordinates":{"status":"sourced","sources":[{"label":"Existing Google Maps pin for Station 2","url":"https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+2/@8.2037673,124.2032519,17z"}],"note":"Pin already documented in FindIT; no independent cross-check was available. Confirm before travelling."}
 }}
 $$::jsonb),
('iligan-ps3','Iligan City Police Station 3','public_reference_police_station','',
 '0935-432-0803 / 225-2091 / 168',extensions.st_geogfromtext('SRID=4326;POINT(124.2579481 8.2917247)'),false,true,'','',
 $$
 {"checkedAt":"2026-11-18","fields":{
   "name":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}]},
   "address":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"The city calls it Tag-Ibo and the PNP roster calls it Dalipuga; neither publishes a street address."},
   "phone":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}]},
   "receivingHours":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No lost-property receiving hours published."},
   "serviceArea":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"No official service-area boundaries published."},
   "coordinates":{"status":"sourced","sources":[{"label":"Existing Google Maps pin for Station 3","url":"https://www.google.com/maps/place/Iligan+City+Police+Station+3/@8.2917247,124.2579481,17z"},{"label":"OpenStreetMap feature 1093145403","url":"https://www.openstreetmap.org/way/1093145403"}],"note":"The existing Google pin is also represented by the mapped OpenStreetMap feature; verify the entrance before visiting."}
 }}
 $$::jsonb),
('iligan-ps4','Iligan City Police Station 4','public_reference_police_station','',
 '0935-484-7972 / 224-4088 / 162',extensions.st_geogfromtext('SRID=4326;POINT(124.2363809 8.2191408)'),false,true,'','',
 $$
 {"checkedAt":"2026-11-18","fields":{
   "name":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}]},
   "address":{"status":"conflict","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"},{"label":"Existing Google Maps pin for Station 4","url":"https://www.google.com/maps/place/Iligan+City+Police+Station+4/@8.2191408,124.2363809,17z"},{"label":"OpenStreetMap feature 1038607942","url":"https://www.openstreetmap.org/way/1038607942"}],"note":"The city and PNP label the station Tubod; the existing map feature is near Tambacan. No exact street address is published, so this field is blank."},
   "phone":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}]},
   "receivingHours":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No lost-property receiving hours published."},
   "serviceArea":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"Station lists use Tubod as a label; no official service-area boundaries published."},
   "coordinates":{"status":"sourced","sources":[{"label":"Existing Google Maps pin for Station 4","url":"https://www.google.com/maps/place/Iligan+City+Police+Station+4/@8.2191408,124.2363809,17z"},{"label":"OpenStreetMap feature 1038607942","url":"https://www.openstreetmap.org/way/1038607942"}],"note":"Existing Google pin and OpenStreetMap feature; locality labels differ. Confirm this pin before travelling."}
 }}
 $$::jsonb),
('iligan-ps5','Iligan City Police Station 5','public_reference_police_station','',
 '0965-539-0808 / 225-5505 / 166',extensions.st_geogfromtext('SRID=4326;POINT(124.2365881 8.2287018)'),false,true,'','',
 $$
 {"checkedAt":"2026-11-18","fields":{
   "name":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}]},
   "address":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"The city and PNP list the station as Poblacion; neither publishes an exact street address."},
   "phone":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}]},
   "receivingHours":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No lost-property receiving hours published."},
   "serviceArea":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"No official service-area boundaries published."},
   "coordinates":{"status":"sourced","sources":[{"label":"Existing Google Maps pin for Station 5","url":"https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+5/@8.2287018,124.2365881,17z"}],"note":"Pin already documented in FindIT; no independent cross-check was available. Confirm before travelling."}
 }}
 $$::jsonb),
('iligan-ps6','Iligan City Police Station 6','public_reference_police_station','',
 '0927-383-2181',extensions.st_geogfromtext('SRID=4326;POINT(124.31789 8.2490009)'),false,true,'','',
 $$
 {"checkedAt":"2026-11-18","fields":{
   "name":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PNP PRO-10 station list (April 2025)","url":"https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf"}],"note":"The current city directory lists Station 6; the April 2025 PNP roster predates and does not list it."},
   "address":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No street address published."},
   "phone":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}]},
   "receivingHours":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No lost-property receiving hours published."},
   "serviceArea":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"No official service-area boundaries published."},
   "coordinates":{"status":"sourced","sources":[{"label":"Existing Google Maps pin for Station 6","url":"https://www.google.com/maps/place/Iligan+City+Police+Station+6/@8.2490009,124.31789,17z"}],"note":"Pin already documented in FindIT; no independent cross-check was available. Confirm before travelling."}
 }}
 $$::jsonb),
('iligan-icpo-hq','Iligan City Police Office','public_reference_headquarters','Camp Tomas Cabili, Barangay Tipanoy, Iligan City',
 '0917-712-7411 / 0998-955-3538 / 221-6699 / 167',extensions.st_geogfromtext('SRID=4326;POINT(124.2498779 8.1995068)'),false,true,'','',
 $$
 {"checkedAt":"2026-11-18","fields":{
   "name":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PIA report on the new ICPO headquarters","url":"https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service"}]},
   "address":{"status":"sourced","sources":[{"label":"PIA report on the new ICPO headquarters","url":"https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service"}],"note":"PIA identifies Camp Tomas Cabili in Barangay Tipanoy; confirm the public-service entrance before visiting."},
   "phone":{"status":"sourced","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}]},
   "receivingHours":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"},{"label":"PIA report on the new ICPO headquarters","url":"https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service"}],"note":"No lost-property receiving hours published."},
   "serviceArea":{"status":"not-published","sources":[{"label":"Iligan City Government hotline directory","url":"https://iligan.gov.ph/forresidents/hotelinedirectory"}],"note":"This is an office reference, not a station service-area listing."},
   "coordinates":{"status":"sourced","sources":[{"label":"Existing Google Maps pin for Camp Tomas Cabili","url":"https://www.google.com/maps/place/Philippine+National+Police+Iligan+City+Camp+Tomas+L.+Cabili/@8.1995068,124.2498779,17z"},{"label":"PIA report on the new ICPO headquarters","url":"https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service"}],"note":"Existing project pin for Camp Tomas Cabili; not independently reverse-geocoded in this session. Confirm before travelling."}
 }}
 $$::jsonb)
on conflict (directory_key) do update set
  name=excluded.name,
  type=excluded.type,
  address=excluded.address,
  phone=excluded.phone,
  location=excluded.location,
  is_demo=false,
  is_approved=true,
  receiving_hours=excluded.receiving_hours,
  service_area=excluded.service_area,
  source_notes=excluded.source_notes;

-- Public directory returns only explicitly approved, non-demo reference rows.
drop function if exists public.station_directory();
drop function if exists private.station_directory();
create function public.station_directory()
returns table(
  id uuid,name text,type text,address text,phone text,receiving_hours text,service_area text,
  latitude double precision,longitude double precision,directory_key text,source_notes jsonb
)
language sql stable security invoker set search_path=''
as $function$
  select s.id,s.name,s.type,s.address,s.phone,s.receiving_hours,s.service_area,
         extensions.st_y(s.location::extensions.geometry),extensions.st_x(s.location::extensions.geometry),
         s.directory_key,s.source_notes
  from public.stations s
  where s.is_approved and not s.is_demo and s.directory_key is not null
  order by s.name;
$function$;
revoke all on function public.station_directory() from public;
grant execute on function public.station_directory() to anon,authenticated;
