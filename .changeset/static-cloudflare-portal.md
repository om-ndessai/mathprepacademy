---
"@mathprep/question-bank": minor
"@mathprep/core": minor
"@mathprep/api": minor
"@mathprep/web": minor
---

Make the portal fully static for the Cloudflare Pages PMF deploy. The question
bank moves to a new `@mathprep/question-bank` package bundled directly into the
web app; grading now runs client-side and attempts persist in localStorage — no
API server needed (apps/api is on hold but still seeds from the shared
package). Sign-in switches to Firebase: "Continue with Google" (popup) once
credentials are pasted into `apps/web/src/config/firebase.ts`, with each
sign-in upserting the user record in Firestore `users/{uid}`; while
unconfigured, the dev name+email sign-in keeps the flow usable and e2e-testable.
Deployment: SPA `_redirects` file, Playwright now tests the built bundle
without an API server, Cloudflare Pages setup documented in
`docs/deploy-cloudflare.md`, and a new `validate-cf-deploy` skill validates the
build output, e2e, and (optionally) the live deployment after commits.
