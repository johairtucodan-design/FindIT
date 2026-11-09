# Testing and evidence

[Back to the vault](README.md)

From the repository root with `.env.local` configured, run the checks relevant to your change.

```sh
npm run typecheck
npm test
npm run build
```

- [Unit and API tests](https://github.com/johairtucodan-design/FindIT/tree/main/tests) cover report and photo validation and public API access.
- [Database permission and workflow tests](https://github.com/johairtucodan-design/FindIT/blob/main/supabase/tests/rls.sql) use transactional fixtures. Coordinate database testing with the project owner.
- [Manual demo checklist](revised-iterations.md#updated-manual-demo-checklist) covers report creation, station access, moderation, intake, private claim submission, withdrawal, and the locator.

The Iterations 1 and 2 handoff records passing build, type, unit, API, and database checks. Manual area lookup and distance sorting passed in the browser. Staff forms, GPS denial, external map rendering, and real mailbox delivery still need browser or mailbox verification.

For a pull request, record the backlog ID, branch or commit, test scenario, expected result, actual result, and a screenshot when it helps. Use fictional items and demo stations. Include a denied-access check for changes involving private records. Keep screenshots free of credentials and private contact or claim information.

A found report starts as **Reported — Not Received**. Intended drop-off records where the reporter plans to bring the item. Staff must explicitly confirm physical possession before FindIT shows receipt.
