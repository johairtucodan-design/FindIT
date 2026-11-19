# FindIT

Working on FindIT with the team? [Start with the Obsidian vault](docs/README.md).

> The [Iterations 3–5 handoff](docs/iterations-3-5.md) covers the claim and release workflow, station dashboard, retention, deployment, and the complete demo. The earlier notes below describe the foundation.

> Updated 18 November 2026: the revised workbook redefines Iterations 1 and 2 as PB-001 through PB-021. See [revised scope and verification](docs/revised-iterations.md) and the [Iterations 3–5 handoff](docs/iterations-3-5.md).


Community lost-and-found **coursework prototype**. The Supabase demo stations and custody records are fictional; the public Iligan station locator separately displays sourced public references with field-level links, check dates, and conflicts. FindIT has no confirmed police partnership or authorized handover points.

## Implemented: Iterations 1 and 2

Next.js App Router, TypeScript and Tailwind with Supabase Auth, PostGIS, RLS and private photo storage. The current build includes citizen reports, a source-linked station locator with a synchronized map and list, simulated staff custody/claims workflows, a distinct admin console, role assignment with audit history, and deterministic item-match suggestions. Suggestions are explainable similarities, not AI, probabilities, or evidence of ownership.

## Run

Use Node.js 22.18+ and npm. Run `npm ci`, then `npm run dev` and open http://localhost:3000. `npm run build` creates the production build; `npm start` serves it. Webpack is selected because Turbopack's CSS worker fails on this Windows host.

`.env.local` is configured locally with the connected project's API URL and enabled legacy anon key. It is ignored by Git. On another checkout, copy `.env.example` to `.env.local` and supply that project's URL and anon key. Never put a service role or secret key in a `NEXT_PUBLIC_` variable. No service role key is used by this application.

## GitHub Codespaces

Create a Codespace from `main`, configure its ignored `.env.local` with the same two Supabase values, then run `npm ci`, `npm run build` and `npm start -- --hostname 0.0.0.0`. Open port **3000** from the Ports panel in a separate browser tab. Keep the Codespace running while testing.

The app derives the exact forwarded hostname from GitHub's `CODESPACE_NAME` and `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`. In Codespaces only, Server Actions accept that host and the `localhost:3000` Origin used by its embedded preview. Other origins remain blocked. Development assets allow only that Codespace's exact host. Confirmation links and callback redirects use the public HTTPS hostname.

In Supabase Authentication → URL Configuration, keep the Site URL on the live FindIT deployment. Add the exact current Codespace URL plus `/auth/callback` to Redirect URLs when testing email confirmation there. Restart/rebuild after pulling configuration changes; reload the browser tab so its Server Action IDs match the current build.

## Database and migrations

SQL lives in `supabase/migrations`, in order: foundations (PostGIS, enums, tables, triggers, grants and RLS), storage, demo fixtures, citizen reporting and revised workflows, admin role management, and the non-destructive Iligan reference-data upsert. Apply only migrations not already recorded in the intended project. The new directory migration adds field-level source notes and a public RPC that returns approved non-demo references only; it does not alter existing demo assignments or reports.

Schema: `stations`, `profiles`, `items`, `custody_events`, `claims`; all have RLS enabled. `profiles.id` references `auth.users.id`. The signup trigger always assigns `citizen`, ignoring any supplied role metadata. There is no finder role.

| Resource | Read | Write |
| --- | --- | --- |
| Profiles | Own row; admins use a role-checked directory | Own name/phone. Admin role/station changes go through a server-checked RPC, cannot change the acting admin, require approved demo stations for staff, and are audited. |
| Public reports | Explicit safe columns, through `public_items` | No anonymous writes |
| Full report | `item_detail(target_id)` RPC returns a row only to its reporter or an officer/admin | Signed-in reporter creates/edits own reports before custody. Identity, kind, status and custody fields cannot be edited from the browser. |
| Demo stations | Approved stations; admins can also read unapproved | Admin only |
| Custody events | Officers/admins | Denied to browser sessions until the later custody workflow |
| Claims | Claimant or officers/admins | Denied to browser sessions until the later claims workflow |
| Photos | Own user folder or officer/admin | Own user folder only |

`public_items` is a security-invoker view. Column grants prevent direct access to `private_details`, `reporter_id`, precise coordinates or photo paths. `items.select('*')` is intentionally denied; use the safe view or the authorized detail RPC. The detail RPC delegates to a non-exposed, tightly granted function with an explicit user/role check. Photo URLs must be signed for authorized users; the bucket has no public URL access.

Report insert triggers assign **Open** to lost reports and **Pending Surrender** to found reports, always without a custody station. A found report does not prove police receipt. Reporters cannot advance custody status. Reports in later custody states cannot be edited by their reporter in this build.

The private `item-photos` bucket allows JPEG, PNG and WebP, up to **5 MiB**. Object paths start with the authenticated user's UUID and `/`. The server decodes images with Sharp, caps input at 25 megapixels, strips metadata and resizes/re-encodes to WebP. Renaming a text file to `.png` does not bypass validation. The app stores only the object path, then generates a fresh five-minute signed URL for a reporter or authorized staff member. `/my` and authorized report detail pages render the private image; a failed or expired URL can be refreshed after the server rechecks access. If the report write fails after upload, the new orphan object is removed. Replaced images are removed after the new path is saved.

## Citizen workflow

Open `/auth` to register or sign in with email/password. New passwords require at least eight characters. If email confirmation is enabled, follow the confirmation link in the same browser used to register. `/auth/callback` exchanges the confirmation code; the homepage also forwards codes when Supabase redirects to the configured site root. Delivery to a real mailbox is a manual check below; no real confirmation email was sent during automated testing.

Use `/report/lost` or `/report/found`, then `/my` to open a saved report. Edit links use `/report/lost?edit=<id>` or `/report/found?edit=<id>`. The detail route `/items/[id]` requires the reporter or staff/admin for private fields. Public projections use the safe database view; search and filters only use approved public text.

The server validates sessions with `getUser()` and reads roles from `profiles`. Resident sign-in at `/auth` leads to `/my`. Staff sign-in at `/staff` leads to `/security` for staff and admins. Admin sign-in at `/admin` leads to the admin-only console at `/manager`. The sign-in pages share one Supabase account system. Optional server-only `FINDIT_DEMO_*_EMAIL` variables let demo users enter `findituser`, `finditstaff`, or `finditadmin` instead of an email address; the database role still controls access. Admins can change another account's FindIT role and demo-station assignment; this does not change its email or password. Invited users set their own passwords at `/auth/setup`. No service-role key is used by the app. Mutations use the user's session, server role checks and RLS. Authenticated pages and session-refresh responses are not publicly cached.

Required report fields: title, category, color, description, date and location text. Private identifying details and a photo are optional. Dates cannot be in the future (Singapore calendar date). Validation and upload errors keep the other entered fields and selected file in the form. Network errors are retryable. Session expiry asks the user to sign in in another tab before retrying, preserving the form.

## Verification

- `npm run build` and `npm run typecheck`: production compilation and types.
- `npm test`: tests cover live anonymous API access and demo/public station separation, synthetic lost/found matching eligibility and explanations, report validation, forged/oversized image rejection and valid image re-encoding.
- `node --env-file=.env.local scripts/test-codespaces.mjs`: regression check against a built, running Codespaces-configured app. Verifies both public and localhost Origins, rejection of unrelated origins, and a public confirmation-callback redirect. Run with the same Codespaces environment variables used by the build/server.
- `npm run test:integration`: run against an already-built, running app using **disposable confirmed test accounts only**. Supply ignored `.env.e2e.local` with `E2E_FIXTURE={"password":"<test-only password>","users":[{"role":"citizen","email":"<test account>"},{"role":"other","email":"<second citizen>"},{"role":"officer","email":"<test officer>"},{"role":"admin","email":"<test admin>"}]}`. These accounts must start without reports. The runner exercises actual Next.js server actions, Supabase Auth/Storage and protected pages; it uses the compiled action manifest. It removes uploaded test photos. Remove its report/account fixtures through the trusted test administrator connection afterward. Test credentials and users from this development session were removed.
- `supabase/tests/rls.sql`: transactional database assertions for signup role, self/other ownership, private details, officer access, admin access, station writes and forbidden custody/role changes. Test users and reports are rolled back; no test emails are sent.
- `supabase/tests/demo_seed.sql`: transactionally reruns the demo seed twice and asserts 40/40 totals, status semantics, no synthetic private data or custody history, and unchanged real rows; changes are rolled back.
- `tests/report-photo.test.mjs`: synthetic image conversion to WebP, object-path-only persistence, fresh signed URL generation, signing failures, and orphan cleanup. The live integration runner also checks signed image rendering on `/items/[id]` and `/my`, and that another citizen cannot receive or download those URLs.
- `supabase/verify.sql`: table RLS, PostGIS, bucket constraints, station seed and policy inspection.

Verified on 28 October 2026: production build and types; all seven unit/API tests; live integration tests for login, invalid login, both report types, status, edit, photo upload, private details, cross-user denial, officer/admin permissions and sign out; transactional RLS tests including `my_reports` isolation. Browser checks confirmed invalid-login errors, successful login/report creation, retained form entries after validation errors and no horizontal overflow at a 390px mobile viewport. Test fixtures were removed afterward.

Redesign verification on 18 November 2026: `npm ci` reported zero vulnerabilities; Next.js 16.4.6 production build and TypeScript passed; the earlier 12 unit/API tests passed; the transactional `supabase/tests/rls.sql` suite passed after applying admin role-management migration `20261118121226`. Live schema inspection confirmed RLS on all eight application tables, PostGIS 3.3.7, and private item-photo and claim-evidence buckets with image-only MIME rules. Mobile browser QA verified the home page, responsive navigation, map tiles, and selection synchronization.

Station and matching update on 18 November 2026: the live project has seven sourced public-reference rows, each field has a URL, checked date and verification note, and the public directory RPC excludes demo fixtures. The three existing demo stations and their profile/report relationships remain unchanged. Reports now use account contact automatically, matching can show private-to-reporter suggestions before publication approval, and score details expand per signal. Staff approve or deny an automatic public preview. `npm test` passes 19 unit/API tests, TypeScript passes, and the production build passes.

Photo and demo data update on 19 November 2026: `/my`, authorized citizen details, and authorized station details render private uploaded photos with fresh signed URLs and an access-checked refresh action. Failed report saves remove the just-uploaded orphan; replacements remove the old object after the database update. A local synthetic PNG verifies decoding and WebP conversion. Supabase seed/RLS transactions pass; live API checks verify 40 lost and 40 found demo examples, correct initial statuses, no exposed photo paths, a private 5 MiB image-only bucket, seven RLS-enabled application tables, and unchanged real report rows. All 27 unit/API tests, TypeScript, and the production build pass. A full signed-in app flow was not run because this session has no disposable confirmed test-account credentials; the regression is covered by the synthetic image/unit tests and the integration script now checks rendered signed URLs when test credentials are supplied.

Foundation verification: five application tables with RLS; Storage object RLS; PostGIS 3.3.7 in `extensions`; private photo bucket with the specified MIME/size restrictions; three approved, clearly marked dummy stations. Security advisor found no schema/RLS warnings. It reports the project's existing [leaked-password protection setting is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); that project setting was not changed.

## Short test checklist

- [ ] Register with a real mailbox, confirm the email in the same browser, then sign in. Automated coverage verifies registration validation and the citizen signup trigger; actual email delivery remains untested.
- [x] Login: confirmed citizen account reaches `/my`.
- [x] Invalid login: clear error; entered email/password remain.
- [x] Lost report: create, view and edit; initial status **Open**.
- [x] Found report: initial status **Pending Surrender**, no custody station, handover notice visible.
- [x] Photo upload: valid image saves privately and is readable by its reporter/officers/admins.
- [x] Invalid file: text, forged PNG and oversized images rejected; form entries retained on validation error.
- [x] Citizen blocked from `/security` and `/manager`; another citizen cannot edit/read private details or download private photos.

## Iligan directory, matching, and demo photos

- The locator reads the `station_directory()` RPC, which returns only approved, non-demo references. The migration preserves the three existing `DEMO ONLY` stations and their profile/report relationships for the simulated staff workflow. Each public field has a source URL, checked date, status, and verification note. Full source and conflict notes are in [docs/station-directory-sources.md](docs/station-directory-sources.md). The public data is for reference only and does not imply a police partnership or confirmed handover service. Unknown street addresses, hours, and service areas remain blank; the conflicting old PS1 pin is withheld.
- The synchronized station map uses OpenStreetMap's public tile service for light demo traffic and includes its attribution. It has no service guarantee; see the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). It does not show lost-item locations.
- Report contact is filled from the signed-in account: profile phone when set, otherwise login email. Categories use fixed choices. Color uses the browser color picker and HEX presets; new color choices are saved as `#RRGGBB`, while unchanged legacy named values remain intact when editing. Matching compares standard legacy names with HEX via CIE76 Lab distance; details are in [docs/matching.md](docs/matching.md).
- Matching is a deterministic suggestion using weighted category (25), item-detail token similarity (30), color (15), date proximity (15), and approximate area (15). A reporter can see suggestions for an open, still-private lost report against eligible public found reports. Available weights are renormalized; fewer than three signals shows “Not enough details to compare.” Expanded match cards explain each signal and its score contribution without showing area text or exact coordinates. Scores appear as accessible, reduced-motion-aware progress bars and remain suggestions, not probabilities or proof of ownership or custody. See [docs/matching.md](docs/matching.md). It is not AI and has no measured accuracy or F1 score.
- Staff see an automatically generated, contact-redacted public listing preview and choose **Approve** or **Deny**. They no longer have to retype its title, description, or area.
- The `/demo` page contains exactly 40 lost and 40 found clearly labeled synthetic examples. It is isolated from `/items`, matching runs only within the same demo/real dataset, and demo rows contain no contact details, private clues, uploaded photos, claims, report history, or custody events. Found examples remain **Pending Surrender** with no custody station. All example areas use synthetic zone labels. `private.run_demo_report_seed()` fills deficits to 40 per kind, normalizes its synthetic areas, skips conflicting IDs, and is safe to rerun from the Supabase SQL Editor. The migration marks only seven existing rows by their dedicated demo account, fixed IDs, and `Demo:%` title; it does not delete real reports. Review the migrations dated 19 November 2026 in `supabase/migrations/`.
- Demo listings use six credited Wikimedia Commons photos bundled in `public/demo/` as WebP. Together they are **251,520 bytes** and ship with the app, separate from user-upload storage. Credits, licenses, retrieval date and final sizes are in [docs/demo-photo-credits.md](docs/demo-photo-credits.md). Photos are representative illustrations, never proof of an actual report.

### Photo storage and free-tier check

Checked **19 November 2026**. Supabase Free includes **1 GB** file storage and **5 GB cached plus 5 GB uncached egress**; the private `item-photos` bucket currently has **2 objects / 39,778 bytes**. The available usage view did not expose project-level Supabase egress totals, so current egress consumption could not be verified. Vercel's connected Hobby usage view (last 30 days) showed **31.14 MB Fast Data Transfer / 100 GB** and **19.45 MB Fast Origin Transfer / 10 GB**; grouping those charts by project identified **find-it** as the source of those transfer amounts. The usage summary displayed **4,772 CDN requests / 1 million** and **2 image transformations** without a project-specific breakdown. The 246 KiB demo photo set is static WebP, separate from Supabase. A cold browser downloading all six sends about 246 KiB through Vercel Fast Data Transfer; browser/CDN caching can reuse them. Static assets do not incur Vercel image-optimization transformations because Next image optimization is disabled for them. Sources: [Supabase Storage pricing](https://supabase.com/docs/guides/storage/pricing), [Supabase egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), and [Vercel CDN usage](https://vercel.com/docs/manage-cdn-usage).
