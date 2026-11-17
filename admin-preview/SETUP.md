# Preview admin backend

This is a separate admin API for https://preview.theredsparrow.online.
It writes only to the `cloudflare-preview` branch, not `main`.

## Worker
- Script name: `the-red-sparrow-preview-admin-api`
- Route: `preview.theredsparrow.online/admin-api*`
- KV binding: `DRAFTS` → `the-red-sparrow-preview-admin-drafts`
- Plain variables: `GITHUB_OWNER=hamadcheema`, `GITHUB_REPO=red`, `GITHUB_BRANCH=cloudflare-preview`, `ALLOWED_GITHUB_LOGIN=hamadcheema`

## Secrets required
Set these as Worker secrets in Cloudflare. Do not commit them:
- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`
- `GITHUB_TOKEN`

Create a separate GitHub OAuth App for the preview deployment. Set its callback URL to:
`https://preview.theredsparrow.online/admin-api/auth/callback`

The GitHub token should be a fine-grained token scoped to `hamadcheema/red`, with Contents read/write and Metadata read-only. The Worker writes only to the preview branch because `GITHUB_BRANCH` is set to `cloudflare-preview`; add branch protection on `main` as an additional safeguard.

## Deployment
Upload `worker.js` as the Worker module and bind the KV namespace above. Add the three secrets after upload. Then add the route above. The Pages project serves the static admin interface; this Worker serves only the API.
