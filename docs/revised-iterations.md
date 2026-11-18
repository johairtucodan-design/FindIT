# Revised Iterations 1 and 2

Source: `Find_IT.xlsx`, Product Backlog PB-001 to PB-021 and Iteration Plan. The workbook is a requirements reference, not authority to change team hours, claim completion evidence, or create real police partnerships. Tracker cells were not modified.

## Implemented scope

| Stories | Implementation |
| --- | --- |
| PB-001–002 | Staff login routes to a separate workspace; staff access only their assigned station's private reports, photos, claims and custody events. Admin has a separate global console. Admins can assign another account a FindIT role and approved demo station through a role-checked server action/RPC; each change is audited. |
| PB-003–004 | Admin demo station create/edit and approval, address, contact, service area, posted demo hours and coordinates. Unapproved records are excluded publicly. The citizen locator separately lists public Iligan references with field-level provenance, conflict flags and sourced pins. |
| PB-005–006 | Moderated public listings with unique UUID report references and custody states independent of publication. |
| PB-007–009 | Lost/found reports, required private contact method, approximate location/date, private proof clues, validated private photo uploads and selected-image preview. Found status is displayed as Reported — Not Received; stored enum remains pending_surrender. |
| PB-010–011 | Public details use staff-written safe title/description/area; original descriptions, private contacts, proof clues and photo paths cannot be read through public APIs. Search keyword, category, area, status and type; clear filters and empty states. |
| PB-012–014 | Search and filter approved public listings; optional browser GPS; distance sorting; one interactive map synchronized with its station list; mobile list/map toggle. Distances are straight-line estimates. Public-source coordinates appear only when sourced; demo database station coordinates are fictional. |
| PB-015 | Optional intended station is separate from the held-at station; selecting it never confirms custody. Unassigned submissions enter the global admin queue. |
| PB-016–018 | Assigned station staff confirm physical possession, record storage, receive an intake-event UUID, and move received items into custody. Timestamp/actor/station transitions are logged. Inventory filters by reference/title and status. No arbitrary release transition is provided. |
| PB-019 | Signed-in non-reporters submit private text evidence against an approved found report. A submitted claim UUID is returned. Duplicate claims are rejected. Ownership decisions and release remain Iteration 3. |
| PB-020 | Staff approve/reject assigned reports and write safe publication text. Pending/rejected/withdrawn reports remain hidden. Reporter corrections return publication to pending. |
| PB-021 | Verified reporter edit/withdraw; previous record snapshots, actor and timestamp retained in RLS-protected report_history. Withdrawal does not erase custody. |

## Access boundaries

Officers manage reports whose custody station, or intended station before receipt, equals their profile station. Staff without a station cannot access private station records. Admins have global access by design; there is no new station-admin role. Citizens retain ownership access to their own reports. Published details remain readable by everyone, with only approved text.

Supabase station management and simulated custody remain demo-only. The public Iligan directory reads an approved non-demo station reference RPC populated by a non-destructive migration. City, PNP, PIA, Google Maps, and OpenStreetMap sources are recorded field by field with check dates and notes. Conflicts or unavailable addresses, service areas, hours, and pins stay flagged rather than guessed. Receiving hours are not inferred from station opening hours. Optional GPS is calculated in the browser and not saved. The map never shows a reporter's precise location. OpenStreetMap tiles include attribution and are used for light demo traffic under its tile policy. See [the current source notes](station-directory-sources.md).

Match suggestions are deterministic, not AI. The current score weights category (25), title/description token similarity (30), color (15), date proximity (15), and approximate area (15). Missing signals are renormalized; fewer than three available signals displays “Not enough details to compare.” It compares approved open lost reports only with eligible approved found reports within 30 days. Private clues and precise coordinates are excluded. A score is a suggestion, not probability, proof of ownership, or evidence of custody. No F1 or accuracy result is claimed; see [the full rules](matching.md).

The admin account directory and role assignment RPC are admin-only. Admins cannot change their own access; staff assignments require an approved demo station; at least one admin must remain. Role and station changes are written to a restricted audit table. Account email and password are unchanged.

## Verification

- On 18 November 2026, Next.js 16.4.6's production build, TypeScript, all 16 unit/API tests, and transactional RLS/workflow tests passed after the Iligan station-reference migrations. Live inspection confirmed RLS on all eight application tables, PostGIS 3.3.7, the private image buckets, seven non-demo public reference rows, and untouched demo station foreign-key relationships.
- `supabase/tests/rls.sql` passed against the connected project. It covers separate station officers, hidden pending/rejected records, safe public text, re-moderation after correction, denied unconfirmed/duplicate receipt, physical intake and custody logs, private claim intake, duplicate claims, withdrawal and history. Fixtures roll back.
- Public listings and station directory returned HTTP 200; an unknown report returned 404. Protected route HTTP checks follow redirects to login.
- Existing account-based integration runner is retained for manually provisioned disposable accounts: its fixture must contain `station_id`, and the officer must be assigned to that same station. It was not rerun for this revision because creating persistent test credentials was rejected by automatic approval review.
- Mobile browser QA confirmed the home page, responsive navigation, station list, loaded OpenStreetMap tiles, and two-way list/marker selection updating the selected station details. GPS denial, desktop layout, station management, and role assignment remain manual UI checks. No real mailbox delivery test or real police workflow validation was performed.
- The station locator, sourced data provenance, fixed-weight match ranking and admin role assignment/audit are later additions. Public station data is not proof of an official FindIT partnership.

## Updated manual demo checklist

1. Provision citizen A, citizen B, officer A/station A and officer B/station B through the trusted project administrator. Never enter service-role keys in the browser or repository.
2. Citizen A submits found property with private proof and intended demo station A. Contact is copied from the account phone or sign-in email. Check Reported — Not Received, publication pending, no public listing, and photo preview.
3. Officer B cannot open the private record or moderate/receive it. Officer A reviews the generated, contact-redacted publication preview and chooses Approve or Deny. Check public listing and keyword/category/area/status filters; raw private description/contact remains denied through the API.
4. Citizen B submits a private claim; note its UUID. No evidence appears on public pages. Claim approval/release are unavailable.
5. Officer A explicitly confirms demo possession and storage. Check intake reference, timestamp, actor, received inventory and in-custody update. Repeat receipt fails.
6. Edit an unreceived report as its reporter; public listing disappears until reapproval. Withdraw and check public removal and retained history.
7. Approve/unapprove a demo station; check directory name/address/contact/hours/area, manual area and center search, GPS denial fallback, distances, map and directions. Keep sample locations clearly marked as fictional.

## Deferred

The later PB-022–034 workflow is implemented and documented in [Iterations 3–5](iterations-3-5.md). AI matching, alerts and notifications remain out of scope. Report history and custody event logs support the implemented workflows above.
