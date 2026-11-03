# Revised Iterations 1 and 2

Source: `Find_IT.xlsx`, Product Backlog PB-001 to PB-021 and Iteration Plan. The workbook is a requirements reference, not authority to change team hours, claim completion evidence, or create real police partnerships. Tracker cells were not modified.

## Implemented scope

| Stories | Implementation |
| --- | --- |
| PB-001–002 | Staff login routes to a workspace; officers access only their assigned station's private reports, photos, claims and custody events. Admin is an explicitly global role. Role/station assignment remains trusted SQL only. |
| PB-003–004 | Admin demo station create/edit, directory approval, address, contact, service area and posted receiving hours. Coordinate updates enable locator maps. Unapproved records are excluded publicly. |
| PB-005–006 | Moderated public listings with unique UUID report references and custody states independent of publication. |
| PB-007–009 | Lost/found reports, required private contact method, approximate location/date, private proof clues, validated private photo uploads and selected-image preview. Found status is displayed as Reported — Not Received; stored enum remains pending_surrender. |
| PB-010–011 | Public details use staff-written safe title/description/area; original descriptions, private contacts, proof clues and photo paths cannot be read through public APIs. Search keyword, category, area, status and type; clear filters and empty states. |
| PB-012–014 | Manual area search, optional GPS, manual demo area center, distance ordering, map and directions. Distances are straight-line estimates. Address list works independently of map/GPS. All seeded coordinates are fictional. |
| PB-015 | Optional intended station is separate from the held-at station; selecting it never confirms custody. Unassigned submissions enter the global admin queue. |
| PB-016–018 | Assigned station staff confirm physical possession, record storage, receive an intake-event UUID, and move received items into custody. Timestamp/actor/station transitions are logged. Inventory filters by reference/title and status. No arbitrary release transition is provided. |
| PB-019 | Signed-in non-reporters submit private text evidence against an approved found report. A submitted claim UUID is returned. Duplicate claims are rejected. Ownership decisions and release remain Iteration 3. |
| PB-020 | Staff approve/reject assigned reports and write safe publication text. Pending/rejected/withdrawn reports remain hidden. Reporter corrections return publication to pending. |
| PB-021 | Verified reporter edit/withdraw; previous record snapshots, actor and timestamp retained in RLS-protected report_history. Withdrawal does not erase custody. |

## Access boundaries

Officers manage reports whose custody station, or intended station before receipt, equals their profile station. Staff without a station cannot access private station records. Admins have global access by design; there is no new station-admin role. Citizens retain ownership access to their own reports. Published details remain readable by everyone, with only approved text.

Station management is demo-only in the app. Receiving hours are explicitly posted demo hours, not assumed police operating hours. Optional GPS is calculated in the browser and not saved to the database; opening map/directions transmits the station coordinates to OpenStreetMap. The public map never shows a reporter's precise location.

## Verification

- Production build, TypeScript and seven unit/API tests passed.
- `supabase/tests/rls.sql` passed against the connected project. It covers separate station officers, hidden pending/rejected records, safe public text, re-moderation after correction, denied unconfirmed/duplicate receipt, physical intake and custody logs, private claim intake, duplicate claims, withdrawal and history. Fixtures roll back.
- Public listings and station directory returned HTTP 200; an unknown report returned 404. Protected route HTTP checks follow redirects to login.
- Existing account-based integration runner is retained for manually provisioned disposable accounts: its fixture must contain `station_id`, and the officer must be assigned to that same station. It was not rerun for this revision because creating persistent test credentials was rejected by automatic approval review.
- Browser checks passed for directory rendering, manual area search, empty results and distance sorting from a chosen demo center. GPS denial, external map rendering, station management and new staff forms remain manual checks. No real mailbox delivery test or real police workflow validation was performed.

## Updated manual demo checklist

1. Provision citizen A, citizen B, officer A/station A and officer B/station B through the trusted project administrator. Never enter service-role keys in the browser or repository.
2. Citizen A submits found property with private contact/proof and intended demo station A. Check Reported — Not Received, publication pending, no public listing, and photo preview.
3. Officer B cannot open the private record or moderate/receive it. Officer A approves safe text. Check public listing and keyword/category/area/status filters; raw private description/contact remains denied through the API.
4. Citizen B submits a private claim; note its UUID. No evidence appears on public pages. Claim approval/release are unavailable.
5. Officer A explicitly confirms demo possession and storage. Check intake reference, timestamp, actor, received inventory and in-custody update. Repeat receipt fails.
6. Edit an unreceived report as its reporter; public listing disappears until reapproval. Withdraw and check public removal and retained history.
7. Approve/unapprove a demo station; check directory name/address/contact/hours/area, manual area and center search, GPS denial fallback, distances, map and directions. Keep sample locations clearly marked as fictional.

## Deferred

PB-022 onward: claim review decisions, controlled release, claimant tracking/history screens, broad audit UI, basic matching and later polish/retention/dashboard work. AI, alerts and notifications are not part of these revised iterations. Report history and custody event logs exist to support the workflows above.
