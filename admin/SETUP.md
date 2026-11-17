# The Red Sparrow admin backend

## Authentication
This backend uses GitHub OAuth (not Cloudflare Zero Trust). Only the GitHub account `hamadcheema` is allowed. The admin dashboard HTML is served as a static page; the API and all editing/publishing actions require a valid server-side session. The session cookie is HttpOnly, Secure and SameSite=Lax, and OAuth state is single-use.

## 1. Create a GitHub OAuth App
In GitHub, open Settings → Developer settings → OAuth Apps → New OAuth App.
- Application name: The Red Sparrow Admin
- Homepage URL: https://theredsparrow.online
- Authorization callback URL: https://theredsparrow.online/admin-api/auth/callback
Copy the Client ID. Generate a Client Secret. Do not paste the secret into browser code or commit it.

## 2. Add Worker secrets
Add these secrets to Cloudflare Worker `the-red-sparrow-admin-api`:
- `GITHUB_OAUTH_CLIENT_ID` = OAuth App Client ID
- `GITHUB_OAUTH_CLIENT_SECRET` = OAuth App Client Secret
- `GITHUB_TOKEN` = fine-grained token scoped only to `hamadcheema/red`, Contents read/write, Metadata read-only.

## 3. Add Worker variables
Add these as plain-text Worker variables (not secrets):
- `GITHUB_OWNER` = `hamadcheema`
- `GITHUB_REPO` = `red`
- `GITHUB_BRANCH` = `main`

The `DRAFTS` KV namespace must also be bound to the Worker.

## 4. Route the API
Create one Cloudflare Worker route:
- Zone: theredsparrow.online
- Pattern: `theredsparrow.online/admin-api*`
- Script: `the-red-sparrow-admin-api`

This route handles the API only; it does not intercept the rest of the site. No Cloudflare Access / Zero Trust is required.

## Features
- GitHub OAuth allow-list for `hamadcheema`.
- Server-side session in Cloudflare KV (8-hour expiry).
- Remote drafts (90-day expiry).
- Publish copy for Home, About, Services and Contact, including optional accessible image descriptions.
- Save and reset remote page and SEO drafts in Cloudflare KV; publishing synchronizes the current draft before writing to GitHub.
- Publish SEO title, description, canonical and Open Graph/Twitter metadata on all six pages.
- Upload PNG/JPEG/WebP/GIF images (5 MB each) to `assets/uploads/`.
- Prevent deletion of images referenced by saved collections, page drafts, SEO drafts, published HTML pages, the stylesheet, or site metadata; if a reference scan fails, deletion is blocked.
- View page commit history and restore a previous version by creating a new revert commit.
- Audit events in KV (180-day expiry), with latest-event pagination. Audit write failures do not turn a completed GitHub operation into a false failure.

## Response security headers
A zone-level Cloudflare response-header transform rule applies `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and a restrictive Permissions-Policy for camera, microphone and geolocation. A Content Security Policy is intentionally not set until every required third-party asset origin has been reviewed.

## Quality checks
From the repository root, run `python scripts/validate_site.py` and `node --test admin/tests/worker.test.mjs`. GitHub Actions runs these checks and JavaScript syntax checks on every push to `main`.

Publishing writes a normal commit to `main`; GitHub Pages then deploys it. Confirm the commit and public website after each publish.

## Security notes
The admin HTML itself is static and may be viewable publicly, but all API data and mutating actions require a valid server-side session. Only the GitHub account `hamadcheema` is authorized. Protect your GitHub account with two-factor authentication and never share OAuth or GitHub tokens.
