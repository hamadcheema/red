# Preview admin backend

This is a separate admin API for https://preview.theredsparrow.online.
It writes only to the `cloudflare-preview` branch, not `main`.

## Worker
- Script name: `the-red-sparrow-preview-admin-api`
- Route: `preview.theredsparrow.online/admin-api*`
- KV binding: `DRAFTS` → `the-red-sparrow-preview-admin-drafts`
- Plain variables: `GITHUB_OWNER=hamadcheema`, `GITHUB_REPO=red`, `GITHUB_BRANCH=cloudflare-preview`, `ALLOWED_GITHUB_LOGIN=hamadcheema`

## Authentication: Google Sign-In
Create a Google OAuth 2.0 Client ID for a Web application in Google Cloud Console. Add this exact authorized redirect URI:
`https://preview.theredsparrow.online/admin-api/auth/callback`

Set these as Worker secrets in Cloudflare. Do not commit them:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GITHUB_TOKEN`

Access is restricted to the verified Google account `thatsmehammad@gmail.com` by `ALLOWED_ADMIN_EMAIL`. Google sign-in authenticates the admin; it does not grant repository access.

The GitHub token is used server-side only to publish website changes. It should be a fine-grained token scoped to `hamadcheema/red`, with Contents read/write and Metadata read-only. The Worker writes to the `cloudflare-preview` branch because `GITHUB_BRANCH` is set to that value; add branch protection on `main` as an additional safeguard.

## Deployment
Upload `worker.js` as the Worker module and bind the KV namespace above. Add the three secrets after upload. Then add the route above. The Pages project serves the static admin interface; this Worker serves only the API.
