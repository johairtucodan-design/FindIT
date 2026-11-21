# Station map suggestions and custody flow

FindIT is a coursework prototype. It has no confirmed police partners or station-authorized handover locations. A pin published by assigned station staff is a public reference only; it does not assert station permission, an official service, item acceptance, or police custody.

## Map pins

Staff accounts are assigned by an admin to an approved, non-demo public-reference station. The assignment grants that account FindIT access to reports routed to the reference; it does not verify employment or police authorization. Existing demo-station assignments are retained but cannot propose public pins.

At `/security/locations`, assigned staff can pick a point on the shared Leaflet map or enter coordinates, then submit a name, public description, and visit instructions. The station workspace sidebar links to **Map locations**; its home page also has a **Manage map locations** shortcut. New pins and edits publish immediately without admin review. Staff can deactivate a pin, which removes it from public display immediately. Pins must not include unverified station services, hours, or handover promises.

The public station map lets visitors explicitly use their device location or choose a starting point on the map. It ranks only the currently visible, approved public references with valid sourced coordinates; the selected starting point stays in browser state and is not stored or sent to Supabase. Missing coordinates are omitted from distance ranking. Distances are straight-line estimates, not route distances. The closest result becomes the selected map/list entry. Staff can click the map to place a proposal pin, drag it to adjust, or enter valid coordinates.

Active pins attached to approved, non-demo references appear in the `/stations` list and on its shared map. The public page marks them as staff-published references, says they are not reviewed or station-approved, and advises visitors to confirm details directly. The admin console has a read-only pin activity log; approval is not part of this flow. Demo-station pins and inactive pins are never returned by the public directory RPC. Legacy pending or rejected records remain private until assigned staff edit and publish them.

`station_locations` stores only a pin, its public text, publication state, and actor IDs. It is separate from item coordinates and claim data. The public `station_location_directory()` RPC projects active published pins and legacy approved pins for approved public references; it does not expose reviewer or submitter account IDs. Direct table access is restricted by RLS to an assigned station or an admin. The `station_location_events` table stores publication, edits, deactivation, and older review events with before/after snapshots. Browser sessions cannot insert, update, or delete audit rows. Neither table has a delete workflow.

## Receiving and custody

Publication review and physical receipt are separate. A found report stays `pending_surrender` (**Reported — Not Received**) after publication approval and remains in the receiving queue. A staff member must explicitly confirm actual physical possession at the assigned station and supply a storage location. `receive_item()` locks the report, validates the actor, station, status, confirmation, and storage value, then atomically sets `received_by_police`, records `held_at_station_id` and `storage_location`, and inserts a custody event.

The receiving queue contains only actionable non-demo found reports that have not been physically received. Publication review is a separate staff view and can include a received report whose public listing still needs review. Active custody inventory contains held reports in `received_by_police`, `in_custody`, or `approved_for_pickup`. Released and closed reports leave active inventory; custody events remain as history. The server-side `staff_reports()` function and admin retention/activity views exclude synthetic examples. The synthetic data and existing demo stations are retained in the database; the admin UI's station-editing and one-click demo-case seed controls are removed. Execute privilege on the old `seed_demo_cases()` RPC is revoked.

## Migration and verification

Migration `20261119141837_station_location_workflow_and_queue_isolation.sql` adds the pin and audit tables, RLS policies, scoped RPCs, and filters demo rows from station operations. Migration `20261121061518_staff_published_map_locations.sql` removes the admin review RPCs and publishes new/edited pins immediately while retaining assigned-station checks and audit events. Migration `20261119143359_block_demo_case_operations.sql` also prevents the operational report, custody, and claim RPCs from mutating synthetic cases even when a caller knows a demo report ID. No reports, users, stations, or custody events are changed. Staff assignment eligibility remains limited to approved public references through the existing admin-only audited role-assignment RPC.

The transactional SQL test in `supabase/tests/rls.sql` covers station scoping, rejection of cross-station edits, immediate public projection, audit events, demo exclusion, and revoked seed access. Node tests cover score-bar calculations and queue transitions. See the root README for the current build, test, and deployment status.
