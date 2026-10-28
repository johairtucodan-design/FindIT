# FindIT

Police-coordinated community lost-and-found **coursework prototype**. No real police partnership is claimed. All seeded stations, addresses, phone placeholders and coordinates are fictional.

## Implemented: Iterations 1 and 2

Next.js App Router, TypeScript and Tailwind with Supabase Auth, PostGIS, RLS and private photo storage. Citizens can register/sign in, create/edit lost or found reports, upload photos, view their reports and open authorized details. The attached planner is reference material; the user's requested scope takes precedence.

## Run

Use Node.js 22.18+ and npm. Run `npm ci`, then `npm run dev` and open http://localhost:3000. `npm run build` creates the production build; `npm start` serves it. Webpack is selected because Turbopack's CSS worker fails on this Windows host.

`.env.local` is configured locally with the connected project's API URL and enabled legacy anon key. It is ignored by Git. On another checkout, copy `.env.example` to `.env.local` and supply that project's URL and anon key. Never put a service role or secret key in a `NEXT_PUBLIC_` variable. No service role key is used by this application.

## Database and migrations

SQL lives in `supabase/migrations`, in order: foundations (PostGIS, enums, tables, triggers, grants and RLS), storage (private bucket and object policies), demo stations, consolidated station read policies, and citizen reporting (`my_reports` RPC restricted to the signed-in reporter). These migrations have been applied to the connected FindIT project. Do not reapply them to that existing database. The station seed runs as a migration so it runs once.

Schema: `stations`, `profiles`, `items`, `custody_events`, `claims`; all have RLS enabled. `profiles.id` references `auth.users.id`. The signup trigger always assigns `citizen`, ignoring any supplied role metadata. There is no finder role.

| Resource | Read | Write |
| --- | --- | --- |
| Profiles | Own row; admins read all | Own name/phone. Roles/stations require a trusted administrator operation; no browser role assignment, even by admins. |
| Public reports | Explicit safe columns, through `public_items` | No anonymous writes |
| Full report | `item_detail(target_id)` RPC returns a row only to its reporter or an officer/admin | Signed-in reporter creates/edits own reports before custody. Identity, kind, status and custody fields cannot be edited from the browser. |
| Stations | Approved stations; admins can also read unapproved | Admin only |
| Custody events | Officers/admins | Denied to browser sessions until the later custody workflow |
| Claims | Claimant or officers/admins | Denied to browser sessions until the later claims workflow |
| Photos | Own user folder or officer/admin | Own user folder only |

`public_items` is a security-invoker view. Column grants prevent direct access to `private_details`, `reporter_id`, precise coordinates or photo paths. `items.select('*')` is intentionally denied; use the safe view or the authorized detail RPC. The detail RPC delegates to a non-exposed, tightly granted function with an explicit user/role check. Photo URLs must be signed for authorized users; the bucket has no public URL access.

Report insert triggers assign **Open** to lost reports and **Pending Surrender** to found reports, always without a custody station. A found report does not prove police receipt. Reporters cannot advance custody status. Reports in later custody states cannot be edited by their reporter in this build.

The private `item-photos` bucket allows JPEG, PNG and WebP, up to **5 MiB**. Object paths start with the authenticated user's UUID and `/`. The server decodes images with Sharp, caps input at 25 megapixels, strips metadata and resizes/re-encodes to WebP. Renaming a text file to `.png` does not bypass validation. Signed photo URLs expire after five minutes; reload the detail page to renew them. Replacing a photo leaves the previous object available to avoid breaking any other report referencing it; orphan-photo cleanup is deferred.

## Citizen workflow

Open `/auth` to register or sign in with email/password. New passwords require at least eight characters. If email confirmation is enabled, follow the confirmation link in the same browser used to register. `/auth/callback` exchanges the confirmation code; the homepage also forwards codes when Supabase redirects to the configured site root. Delivery to a real mailbox is a manual check below; no real confirmation email was sent during automated testing.

Use `/report/lost` or `/report/found`, then `/my` to open a saved report. Edit links use `/report/lost?edit=<id>` or `/report/found?edit=<id>`. The detail route `/items/[id]` requires the reporter or an officer/admin. Public projections remain available through the safe database view; search/discovery UI is deferred.

The server validates sessions with `getUser()` and reads roles from `profiles`. `/security` permits officers/admins; `/manager` permits admins. Other citizens are redirected to an access-denied page. Both workspaces are placeholders. No service role key is used. All mutations use the user's session plus RLS. Authenticated pages and session-refresh responses are not publicly cached.

Required report fields: title, category, color, description, date and location text. Private identifying details and a photo are optional. Dates cannot be in the future (Singapore calendar date). Validation and upload errors keep the other entered fields and selected file in the form. Network errors are retryable. Session expiry asks the user to sign in in another tab before retrying, preserving the form.

## Verification

- `npm run build` and `npm run typecheck`: production compilation and types.
- `npm test`: seven tests covering live anonymous API access, report validation, forged/oversized image rejection and valid image re-encoding.
- `npm run test:integration`: run against an already-built, running app using **disposable confirmed test accounts only**. Supply ignored `.env.e2e.local` with `E2E_FIXTURE={"password":"<test-only password>","users":[{"role":"citizen","email":"<test account>"},{"role":"other","email":"<second citizen>"},{"role":"officer","email":"<test officer>"},{"role":"admin","email":"<test admin>"}]}`. These accounts must start without reports. The runner exercises actual Next.js server actions, Supabase Auth/Storage and protected pages; it uses the compiled action manifest. It removes uploaded test photos. Remove its report/account fixtures through the trusted test administrator connection afterward. Test credentials and users from this development session were removed.
- `supabase/tests/rls.sql`: transactional database assertions for signup role, self/other ownership, private details, officer access, admin access, station writes and forbidden custody/role changes. Test users and reports are rolled back; no test emails are sent.
- `supabase/verify.sql`: table RLS, PostGIS, bucket constraints, station seed and policy inspection.

Verified on 28 October 2026: production build and types; all seven unit/API tests; live integration tests for login, invalid login, both report types, status, edit, photo upload, private details, cross-user denial, officer/admin permissions and sign out; transactional RLS tests including `my_reports` isolation. Browser checks confirmed invalid-login errors, successful login/report creation, retained form entries after validation errors and no horizontal overflow at a 390px mobile viewport. Test fixtures were removed afterward.

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

TODO: map, station directory UI, search/filters, police receipt/custody screens, claims UI, AI matching, nearby alerts and notifications.
