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

## 3. Route the API
Create one Cloudflare Worker route:
- Zone: theredsparrow.online
- Pattern: `theredsparrow.online/admin-api*`
- Script: `the-red-sparrow-admin-api`

This route handles the API only; it does not intercept the rest of the site. No Cloudflare Access / Zero Trust is required.

## Features
- GitHub OAuth allow-list for `hamadcheema`.
- Server-side session in Cloudflare KV (8-hour expiry).
- Remote drafts (90-day expiry).
- Publish copy for Home, About, Services and Contact.
- Publish SEO title, description, canonical and Open Graph/Twitter metadata on all six pages.
- Upload PNG/JPEG/WebP/GIF images (5 MB each) to `assets/uploads/`.
- View page commit history and restore a previous version by creating a new revert commit.
- Audit events in KV (180-day expiry).

Publishing writes a normal commit to `main`; GitHub Pages then deploys it. Confirm the commit and public website after each publish.

## Security notes
The admin HTML itself is static and may be viewable publicly, but all API data and mutating actions require a valid server-side session. Only the GitHub account `hamadcheema` is authorized. Protect your GitHub account with two-factor authentication and never share OAuth or GitHub tokens.
