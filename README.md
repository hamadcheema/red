# The Red Sparrow

Official lightweight website for The Red Sparrow, an independent Unity-focused game-development brand.

**Website:** https://theredsparrow.online  
**Production branch:** `main`  
**Hosting:** GitHub Pages  
**Admin API:** Cloudflare Worker `the-red-sparrow-admin-api`  
**Draft and audit storage:** Cloudflare KV

## Public pages

- Home — `index.html`
- About — `about.html`
- Services — `services.html`
- Contact — `contact.html`
- Privacy notice — `privacy.html`
- Website terms — `terms.html`
- Custom not-found page — `404.html`

## Project structure

- `styles.css` — public website styles and responsive layout.
- `admin/` — private admin interface, publishing client, Worker source and setup notes.
- `assets/uploads/` — images uploaded through the admin Media Library.
- `logo.svg`, `favicon.svg`, `og-image.png` — brand and social preview assets.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `ads.txt` — crawler, discovery and advertising metadata.
- `scripts/validate_site.py` — dependency-free public-site integrity checks.
- `admin/tests/worker.test.mjs` — Node.js regression tests for Worker safeguards.
- `.github/workflows/quality.yml` — automated syntax, Worker and site-integrity checks.

## Admin workflow

The admin interface at `/admin/` authenticates through GitHub OAuth. The Cloudflare Worker validates the session and performs GitHub writes using a server-side fine-grained token. The token and OAuth client secret must never be placed in browser JavaScript or committed to this repository.

Page and SEO drafts are stored in Cloudflare KV. Publishing writes a commit to the `main` branch; GitHub Pages deploys the resulting static files. Showcase collections and media uploads are also managed through the admin interface.

See [admin/SETUP.md](admin/SETUP.md) for backend configuration and maintenance details.

## Quality checks

Run the checks locally from the repository root:

```sh
python scripts/validate_site.py
node --check admin/admin.js
node --check admin/connection.js
node --check admin/features.js
node --check admin/worker.js
node --test admin/tests/worker.test.mjs
```

GitHub Actions runs these checks on pushes to `main`. A passing quality check does not replace manual browser, accessibility, advertising-consent or legal review.

## Services presented

- Unity game development and C# gameplay implementation.
- 3D model, environment and animation integration using client-supplied or properly licensed assets.
- Game UI implementation from approved designs.
- Mobile input, layout adaptation, testing and build preparation for agreed devices.

The public service descriptions should be kept aligned with the work actually offered. Do not publish client names, project screenshots, project outcomes or third-party assets without permission.

## Contact

- General enquiries: admin@theredsparrow.online
- Direct contact: hammad@theredsparrow.online

## Privacy and advertising

The privacy notice must reflect the actual email, hosting, advertising, cookie and analytics services in use. Before serving personalized advertising in regions where Google requires consent, configure an eligible certified consent-management platform in the relevant Google publisher account. Repository files alone cannot enable or verify that account-level setting.
