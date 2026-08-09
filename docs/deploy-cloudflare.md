# Deploying the portal to Cloudflare Pages

The web portal is a fully static app for the product-market-fit phase: the
question bank ships in the JS bundle (`@mathprep/question-bank`), grading runs
in the browser (`@mathprep/core`), and attempts are stored in localStorage.
`apps/api` is on hold and not deployed. Sign-in and user records go through
Firebase (Auth + Firestore) — Cloudflare only serves the static files.

## Cloudflare settings

Cloudflare has two git-connected flows and they ask for different settings.
The newer **Workers** flow is what the dashboard now steers you into
("Workers & Pages → Create → import a repository") — it has **no "Build
output directory" field**; the output location comes from
`apps/web/wrangler.jsonc` instead.

### Workers flow (current dashboard default)

| Setting           | Value                                              |
| ----------------- | -------------------------------------------------- |
| Production branch | `main` (every push deploys)                        |
| Build command     | `pnpm --filter @mathprep/web build`                |
| Deploy command    | `pnpm --filter @mathprep/web exec wrangler deploy` |
| Root directory    | repo root (leave empty)                            |

Use `pnpm … exec wrangler`, not `npx wrangler`: wrangler is a pinned
devDependency of `@mathprep/web`, and `npx` would ignore it and download a
fresh copy on every build (the `npm warn exec … will be installed` message).
Running through pnpm also puts the working directory at `apps/web`, so the
`wrangler.jsonc` there is picked up without a `--config` flag.

`wrangler.jsonc` defines an assets-only Worker: it serves `apps/web/dist`
with `not_found_handling: "single-page-application"`, so deep links like
`/assessment` fall back to `index.html`. The site lands on
`mathprepacademy.<account>.workers.dev` — the `name` in `wrangler.jsonc` must match the Cloudflare project name or CI warns and auto-opens a rename PR.

> **No `_redirects` file.** The repo deliberately has none: the Workers flow
> parses any uploaded `_redirects` and rejects the SPA rule
> `/* /index.html 200` with "Infinite loop detected" (code 100324) — that rule
> is Pages-only. On Workers, SPA fallback comes from `not_found_handling` in
> `wrangler.jsonc`. If you ever switch to a classic Pages project, create
> `apps/web/public/_redirects` containing `/* /index.html 200` (build command
> `pnpm --filter @mathprep/web build`, output directory `apps/web/dist`).

- Node version comes from `.node-version`; pnpm from the root `package.json`
  `packageManager` field. No extra env vars are needed to build.

## Firebase setup (Google sign-in + user records)

1. Create a Firebase project → add a **Web app** → copy the SDK config object.
2. Paste the values into `apps/web/src/config/firebase.ts`. They are public
   app identifiers; committing them is fine. While `apiKey` is empty the app
   falls back to the dev name+email sign-in (what e2e uses).
3. **Authentication → Sign-in method**: enable **Google**.
4. **Authentication → Settings → Authorized domains**: add the deployed
   domain — `mathprepacademy.<account>.workers.dev` (Workers flow) or
   `<project>.pages.dev` (Pages flow) — plus any custom domain.
5. **Firestore Database**: create a database. Each Google sign-in upserts
   `users/{uid}` with name, email, picture, and last-sign-in time.
6. Recommended Firestore rules (each user can only touch their own record):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

## Validating a deploy

Run the `validate-cf-deploy` project skill (e.g. `/validate-cf-deploy
https://mathprep.pages.dev`) after commits that will deploy. It rebuilds the
static bundle, checks the output (index.html, `_redirects`, bundled question
data), runs the e2e suite against the preview build, and — when given a URL —
probes the live deployment.
