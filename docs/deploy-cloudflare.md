# Deploying the portal to Cloudflare Pages

The web portal is a fully static app for the product-market-fit phase: the
question bank ships in the JS bundle (`@mathprep/question-bank`), grading runs
in the browser (`@mathprep/core`), and attempts are stored in localStorage.
`apps/api` is on hold and not deployed. Sign-in and user records go through
Firebase (Auth + Firestore) — Cloudflare only serves the static files.

## Cloudflare Pages settings

Create a Pages project connected to this repo with:

| Setting                | Value                               |
| ---------------------- | ----------------------------------- |
| Production branch      | `main` (every push deploys)         |
| Build command          | `pnpm --filter @mathprep/web build` |
| Build output directory | `apps/web/dist`                     |
| Root directory         | repo root (leave empty)             |

Notes:

- Node version comes from `.node-version`; pnpm from the root `package.json`
  `packageManager` field. No extra env vars are needed to build.
- SPA routing (deep links like `/assessment`) is handled by
  `apps/web/public/_redirects` (`/* /index.html 200`), which Vite copies into
  the build output.

## Firebase setup (Google sign-in + user records)

1. Create a Firebase project → add a **Web app** → copy the SDK config object.
2. Paste the values into `apps/web/src/config/firebase.ts`. They are public
   app identifiers; committing them is fine. While `apiKey` is empty the app
   falls back to the dev name+email sign-in (what e2e uses).
3. **Authentication → Sign-in method**: enable **Google**.
4. **Authentication → Settings → Authorized domains**: add the
   `<project>.pages.dev` domain and any custom domain.
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
