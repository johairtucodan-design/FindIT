# Iligan station reference sources

Checked **18 November 2026**. These are public references for coursework testing. FindIT has no confirmed police partnership, authorized drop-off point, or confirmed lost-property receiving service. Call the listed office and confirm details before visiting.

## Sources

- [Iligan City Government hotline directory](https://iligan.gov.ph/forresidents/hotelinedirectory) — current public station names and phone numbers.
- [PNP PRO-10 station roster (April 2025)](https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf) — confirms Police Stations 1–5 and their roster labels; it predates the city directory's Station 6 listing.
- [PIA: new Station 1 building](https://pia.gov.ph/news/mindanao/nm/iligan-opens-new-police-station-1-building-to-improve-public-service) — reports a new building in Barangay San Miguel inaugurated 25 September 2026.
- [PIA: new ICPO headquarters](https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service) — identifies Camp Tomas Cabili, Barangay Tipanoy.
- Existing [Google Maps pins for Stations 1](https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+1/@8.2435705,124.2593775,17z), [2](https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+2/@8.2037673,124.2032519,17z), [3](https://www.google.com/maps/place/Iligan+City+Police+Station+3/@8.2917247,124.2579481,17z), [4](https://www.google.com/maps/place/Iligan+City+Police+Station+4/@8.2191408,124.2363809,17z), [5](https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+5/@8.2287018,124.2365881,17z), [6](https://www.google.com/maps/place/Iligan+City+Police+Station+6/@8.2490009,124.31789,17z), and [Camp Tomas Cabili](https://www.google.com/maps/place/Philippine+National+Police+Iligan+City+Camp+Tomas+L.+Cabili/@8.1995068,124.2498779,17z) already documented by FindIT. They are not treated as independently field-verified.
- [OpenStreetMap feature 1093145403](https://www.openstreetmap.org/way/1093145403) and [feature 1038607942](https://www.openstreetmap.org/way/1038607942) are secondary map references for the Station 3 and Station 4 pins.

The locator and migration store the source URL, checked date, and note separately for every displayed field. Missing addresses, hours, and service boundaries remain blank. A sourced phone or pin is not a guarantee that it is current.

## Listing notes

| Listing | Public phone source | Address and pin verification |
| --- | --- | --- |
| Police Station 1 | City Government hotline directory | Street address and pin withheld. The hotline directory still labels Station 1 Tambo; PIA reports the newer San Miguel facility; PNP's 2025 roster says Hinaplanon. Confirm the current address and entrance. |
| Police Station 2 | City Government hotline directory | Street address withheld. City directory says Nunucan; PNP roster says Nonocan. Existing map pin is shown with a verification note. |
| Police Station 3 | City Government hotline directory | Street address withheld. City directory uses Tag-Ibo; PNP roster uses Dalipuga. Existing map pin has an OpenStreetMap cross-reference. |
| Police Station 4 | City Government hotline directory | Street address withheld. City/PNP use Tubod while the existing map feature is near Tambacan. Existing pin is flagged for confirmation. |
| Police Station 5 | City Government hotline directory | Poblacion is the published station label, not a verified street address. Existing map pin is shown with a verification note. |
| Police Station 6 | City Government hotline directory | No street address published. The city directory lists PS6; it does not appear in the older April 2025 PNP roster. Existing map pin is shown with a verification note. |
| Iligan City Police Office | City Government hotline directory | PIA reports the new headquarters at Camp Tomas Cabili, Barangay Tipanoy. Existing map pin is linked, with entrance confirmation advised. |

Station service boundaries and lost-property receiving hours were not published by the cited sources, so FindIT does not infer them. The map displays only pins with coordinates; Station 1 has no marker until its current location is confirmed.

## Data and fixtures

Migration `20261118140521_iligan_station_references_and_match_privacy.sql` adds stable `directory_key` and JSONB `source_notes` fields and upserts seven non-demo public-reference rows. The public `station_directory()` RPC filters to approved non-demo rows. Follow-up migration `20261118140829_station_field_verification_notes.sql` fills a note for every field while leaving its value and source links unchanged. Migration `20261118141804_station_fixture_read_isolation.sql` also blocks anonymous and ordinary citizen reads of legacy demo rows from the raw stations table; assigned demo officers and admins retain their access. These migrations do not update or delete the three pre-existing `DEMO ONLY` stations, profiles, items, or custody history. Demo station management and officer assignments remain isolated to those fictional fixtures.
