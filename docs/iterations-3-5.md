# Iterations 3–5 handoff

[Back to the vault](README.md)

| Scope | What to demonstrate |
| --- | --- |
| PB-019 | Claimants can attach a private evidence image up to 4 MiB. |
| PB-022–028 | Authorized review, approval and rejection, confirmed handover, claimant history, station permissions, timestamped audit, and basic match suggestions. |
| PB-029–030 | Responsive public and staff pages, accessible controls, validation, and actionable empty and error states. |
| PB-031 | Integration script and transactional database scenarios for the full claim workflow. |
| PB-032–034 | Station and date summaries, reviewed archival, and an admin action to create a pair of fictional demo cases. |

Matching checks category, limits results to 30 days before or after the lost report, and ranks approximate area matches first. Staff verify ownership.

## Release

1. Apply `supabase/migrations/20261110090000_claims_release_and_operations.sql` to the intended Supabase project before deploying the app. Use the project's authenticated migration workflow. If using the SQL Editor, run the file as one transaction and record the version so the migration runner skips it later.
2. In a **test project**, run `supabase/verify.sql` and `supabase/tests/rls.sql`. The latter rolls back its fixtures. For the Next.js and Supabase Auth/Storage integration, use disposable confirmed accounts and an approved `station_id` assigned to the test officer. Run `npm run test:integration` against a built app. Remove test records and Storage objects through the test administrator.
3. Deploy the code on Vercel. Smoke-test public listings, station lookup without GPS, sign-in, and mobile navigation, then run the demo below with test accounts.

## Presentation demo

Use one demo admin, one citizen claimant, one officer at the intended station, and one officer at a different station. Use fictional items and avoid real personal details.

1. In **Manager → Demo cases**, create the matching key reports. Open the lost report to show the suggested match. The found report starts as **Reported — Not Received**.
2. Sign in as the citizen and file a claim on the found item. Add a small fictional image and open **My claims** to show the submission.
3. Verify that the other station officer cannot open the private claim. Sign in as the assigned officer, confirm possession and storage, and review the claim.
4. Approve for pickup, then confirm handover. Verify that the item is **Released**, the claimant sees **Returned**, and the event history shows the actor and station.
5. Open **Manager** to compare received and released totals for the station and date range. Explain that retention eligibility is based on documented custody completion. Archival hides an eligible listing and preserves its history.

## Stabilization checklist

- Review phone-width pages, keyboard focus, empty results, invalid input, and denied access.
- Recheck the cross-station claim denial and repeat-release rejection after any permission changes.
- Record the deployed commit, test evidence, and remaining issues in the team tracker.
