---
name: validate-cf-deploy
description: Validate the Cloudflare Pages static deploy of the web portal. Use after commits that will deploy (every push deploys), when asked to "validate the deploy/cloudflare setup", or before merging deploy-affecting changes. Optional argument; a deployed URL to probe (e.g. https://mathprep.pages.dev).
---

# Validate the Cloudflare Pages deploy

The portal deploys as a static site (see `docs/deploy-cloudflare.md`). Every
push to the production branch triggers a Pages build, so validate in three
layers: the local build must be sound, the e2e suite must pass against the
exact preview of that build, and (when a URL is given) the live deployment
must serve it.

## 1. Build exactly like Cloudflare does

```bash
pnpm install --frozen-lockfile   # skip if node_modules is current
pnpm --filter @mathprep/web build
```

The build must succeed with no errors. Then assert the output shape:

- `apps/web/dist/index.html` exists.
- SPA fallback is present for whichever flow is deployed (both should hold):
  - Workers flow: `apps/web/wrangler.jsonc` has `assets.directory: "./dist"`
    and `not_found_handling: "single-page-application"`.
  - Pages flow: `apps/web/dist/_redirects` contains `/* /index.html 200`.
- The question bank is bundled: `grep -rl "AMC 8 Mock Exam" apps/web/dist/assets`
  matches at least one JS file.
- Workers flow only: `pnpm --filter @mathprep/web exec wrangler deploy --dry-run`
  validates the wrangler config without deploying.

## 2. Run e2e against the preview of that build

```bash
pnpm test:e2e
```

This serves the built bundle via `vite preview` — the same artifact Pages
deploys. All tests must pass. If Firebase credentials are configured in
`apps/web/src/config/firebase.ts`, note that e2e covers the dev sign-in path
only; the Google popup cannot be automated.

## 3. Probe the live deployment (when a URL is provided)

With `$URL` as the deployed origin:

```bash
curl -s -o /dev/null -w "%{http_code}" $URL/            # expect 200
curl -s -o /dev/null -w "%{http_code}" $URL/assessment  # expect 200 (SPA fallback)
curl -s $URL/ | grep -o '<script[^>]*src="[^"]*"'       # extract bundle path(s)
```

Fetch each referenced asset and expect 200. Optionally drive the real site
with Playwright (`chromium.launch()` against `$URL`): the login page must
render, and — if Firebase is configured — a "Continue with Google" button must
be visible (do not attempt to complete the popup flow).

## 4. Configuration sanity

- If `apps/web/src/config/firebase.ts` still has an empty `apiKey`, warn that
  the deploy will show the dev sign-in instead of Google — expected before the
  user pastes credentials, wrong after.
- If Firebase is configured, remind that the Pages domain must be in Firebase
  Auth's authorized domains list.

## Report

Summarize as a pass/fail table per layer with any failures quoted verbatim.
A failed layer means the deploy is (or will be) broken — say so plainly.

To run this automatically after every local commit, wire it into husky:
`echo 'claude -p "/validate-cf-deploy"' > .husky/post-commit` (left off by
default; builds + e2e on every commit is slow).
