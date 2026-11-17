# The Red Sparrow admin backend

## Deployment status
The Cloudflare KV namespace `THE_RED_SPARROW_ADMIN_DRAFTS` has been created. Cloudflare Access is not enabled yet, the Worker is not deployed/routed, and the GitHub credential is not configured. Keep the dashboard and API private until all security steps are complete.

## 1. Enable Cloudflare Access
In the Cloudflare dashboard, open Zero Trust / Access and choose **Enable Access**. Then create two self-hosted applications:
- Dashboard: `theredsparrow.online/admin*`
- API: `admin-api.theredsparrow.online`

For each application, create an Allow policy that includes only `thatsmehammad@gmail.com`. Do not use Everyone. If no identity provider is configured, enable One-time PIN email authentication. Protect the API hostname before attaching it to the Worker.

## 2. Create a least-privilege GitHub token
Create a fine-grained personal access token for only `hamadcheema/red`:
- Repository access: Only select repositories → `red`
- Contents: Read and write
- Metadata: Read-only
No Actions, Administration, workflow, Issues or Pull requests permissions are required. Never put this token in browser code or commit it to GitHub.

## 3. Deploy the Worker
From this directory, authenticate Wrangler to the same Cloudflare account, then run:
```sh
npx wrangler secret put GITHUB_TOKEN
npx wrangler deploy
```
Add the Worker custom domain `admin-api.theredsparrow.online` only after the API Access application is active. The Worker has `workers_dev = false`, so it is not exposed on a public workers.dev URL.

## 4. Features
- Remote drafts in Cloudflare KV (90-day expiry).
- Publish copy for Home, About, Services and Contact.
- Publish SEO title, description, canonical and Open Graph/Twitter metadata on all six pages.
- Upload PNG/JPEG/WebP/GIF images (5 MB each) to `assets/uploads/`.
- View page commit history and restore a previous version by creating a new revert commit.
- Audit events in KV (180-day expiry).

Publishing writes a normal commit to the repository's `main` branch; GitHub Pages then deploys it. Confirm the commit and the public website after each publish.

## Limitations
The editor is a focused text/metadata editor, not a full visual page builder. Privacy and Terms content remain read-only; their SEO metadata can be updated. Uploaded images are stored in GitHub and increase repository size.