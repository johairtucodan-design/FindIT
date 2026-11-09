# Setup and team workflow

[Back to the vault](README.md)

## Run FindIT

Install Node.js 22.18 or newer. Start from the repository root.

```sh
git clone https://github.com/johairtucodan-design/FindIT.git
cd FindIT
npm ci
```

Copy `.env.example` to `.env.local` and set these two variables using the same Supabase project.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from the Supabase **Connect** dialog |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public publishable key, or legacy `anon` key |

Git ignores `.env.local`. Keep secret and service-role keys out of the repository, vault, and browser. Ask the project owner to provision any demo officer or admin accounts. Station assignment and staff roles are managed by a trusted project admin.

Run `npm run dev` and open [localhost:3000](http://localhost:3000).

### Codespaces

On GitHub, use **Code → Codespaces → Create codespace** on your branch. Set up `.env.local` and run `npm ci` there too. Run `npm run build`, then `npm start -- --hostname 0.0.0.0`. Open forwarded port **3000** from the **Ports** panel in a browser tab. For confirmation email tests, ask the Supabase project owner to allow that Codespace's HTTPS URL with `/auth/callback` appended.

### Vercel

Open the [Vercel demo listed on GitHub](https://find-it-taupe.vercel.app). For a new deployment, import the repo with the **Next.js** preset, repository root, and `npm run build`. Add the two variables above in Vercel. The production deployment tracks `main`.

In Supabase **Authentication → URL Configuration**, set the production **Site URL** to the Vercel address and allow the exact production address plus `/auth/callback`. Use a confirmed demo account to test sign-in. If email confirmation is enabled, the built-in Supabase mail service only sends to project team addresses. [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) · [Supabase mail setup](https://supabase.com/docs/guides/auth/auth-smtp)

## Pick up a task

1. Accept the owner's GitHub collaborator invitation if you need to push branches. Pick a backlog ID and agree who will implement, review, or test it. Record the assignment in the team's tracker.
2. Update `main`, then create a branch for the task. Replace the example branch name with your own.

   ```sh
   git switch main
   git pull --ff-only origin main
   git switch -c pb-022-claim-review
   ```

3. Run the relevant checks in [Testing and evidence](testing-and-evidence.md). Commit, push your branch, and open a pull request against `main`. Include the backlog ID, what changed, and how to test it.
4. Ask a teammate to review the pull request and test the acceptance checks. Link the pull request and test evidence in the tracker. Coordinate merging and deployment with the project owner. If a Vercel preview is unavailable, use Codespaces to review the branch.

Obsidian changes follow the same branch and pull request process. Pull before editing and coordinate when two people need the same note. [Obsidian's Git sync guide](https://obsidian.md/help/sync-notes)
