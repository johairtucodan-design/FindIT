# FindIT

Police-coordinated community lost-and-found **coursework prototype**. No real police partnership is claimed. All seeded stations, addresses, phone placeholders and coordinates are fictional.

## Current checkpoint: Iteration 1

Next.js App Router, TypeScript and Tailwind scaffold; Supabase Auth profile trigger, PostGIS schema, RLS and private photo storage. Iteration 2 is intentionally pending the requested migration/policy review. The attached planner is reference material; the user's requested scope takes precedence.

## Run

Use Node.js 22.13+ and npm. Run `npm ci`, then `npm run dev` and open http://localhost:3000. `npm run build` creates the production build; `npm start` serves it. Webpack is selected because Turbopack's CSS worker fails on this Windows host.

`.env.local` is configured locally with the connected project's API URL and enabled legacy anon key. It is ignored by Git. On another checkout, copy `.env.example` to `.env.local` and supply that project's URL and anon key. Never put a service role or secret key in a `NEXT_PUBLIC_` variable. No service role key is used by this application.

## Database and migrations

SQL lives in `supabase/migrations`, in order: foundations (PostGIS, enums, tables, triggers, grants and RLS), storage (private bucket and object policies), demo stations, and consolidated station read policies. These migrations have been applied to the connected FindIT project. Do not reapply them to that existing database. The station seed runs as a migration so it runs once.

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

The private `item-photos` bucket allows JPEG, PNG and WebP, up to **5 MiB**. Object paths start with the authenticated user's UUID and `/`. Iteration 2 must also validate image content at the upload boundary, since MIME declarations alone do not verify file bytes.

## Verification

- `npm run build` and `npm run typecheck`: production compilation and types.
- `npm test`: live anonymous API tests against `.env.local`, including approved demo stations and denied private access.
- `supabase/tests/rls.sql`: transactional database assertions for signup role, self/other ownership, private details, officer access, admin access, station writes and forbidden custody/role changes. Test users and reports are rolled back; no test emails are sent.
- `supabase/verify.sql`: table RLS, PostGIS, bucket constraints, station seed and policy inspection.

Verified on 28 October 2026: five application tables with RLS; Storage object RLS; PostGIS 3.3.7 in `extensions`; private photo bucket with the specified MIME/size restrictions; three approved, clearly marked dummy stations; four live API tests passed; database RLS assertions passed without leaving reports. Supabase security advisor returned no findings.

## Next checkpoint

Iteration 2: `/auth`, server role checks for `/security` and `/manager`, lost/found create/edit forms, validated photo upload, `/my` and authorized report details. README will include the requested citizen workflow test checklist when implemented.

TODO: map, station directory UI, search/filters, police receipt/custody screens, claims UI, AI matching, nearby alerts and notifications.
