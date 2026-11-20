# The Red Sparrow Admin — Long-term Roadmap

Last reviewed: 2026-11-20
Repository: https://github.com/hamadcheema/red
Baseline: main branch, reviewed after the 2026-11-20 Admin Panel reliability pass

## Product direction

Evolve the existing admin into a reliable company operations workspace while preserving the current GitHub Pages + Cloudflare Worker architecture and its free-stack-first approach. Improve existing capabilities before adding complexity. The web admin and native Android companion should use the same protected API where practical.

## Current baseline

Already present in the repository:
- Website page editor and remote drafts
- SEO metadata editor
- Media library, uploads, recently deleted media and usage checks
- Showcase and brand asset collections
- Audit log and personal activity timeline
- Scheduled publishing, retry and cancellation
- Notifications and inquiry inbox
- Website preview and shared site settings
- Health checks and admin session controls, including individual session revocation
- Content Manager bulk operations and safe media move-to-trash
- Unsaved-change protection for Content Manager, page editor, SEO editor and shared website settings
- Shared accessible confirmation dialogs
- Accessible Media Library upload controls and recovery feedback
- GitHub Actions syntax, regression, HTML, link, asset, metadata and sitemap validation

Known limitations to verify:
- Inquiry list returns at most 100 messages per page; counts and exports must represent all stored messages.
- Analytics module links to Cloudflare; it does not currently provide embedded traffic charts or prove analytics is enabled.
- Current automated tests are not a substitute for authenticated browser-based mobile/desktop testing.
- Cloudflare KV is suitable for current lightweight records, but relational business data may eventually justify D1.
- No background worker/agent should make production changes without a reviewed deployment workflow.

## Phases

### Phase 0 — Reliability and foundation
- [x] Review current repository architecture and existing modules.
- [x] Identify analytics wording that overstated configuration.
- [ ] Verify every module's live API behavior with authenticated browser tests.
- [ ] Add Playwright end-to-end coverage for desktop and mobile.
- [ ] Audit API authorization, validation, rate limits and error handling.
- [ ] Verify backups and recovery procedures.
- [ ] Establish release/rollback checklists.

### Phase 1 — Admin experience
- [x] Daily and rolling 7-day / 30-day enquiry summaries on the executive dashboard, using Pakistan-local calendar dates for today.
- [x] Personal activity timeline with date-range and category filters, daily/weekly event counts, and formula-safe CSV export (latest 500 audit events).
- [x] Inquiry workspace with Inbox, Unread and Archived folders.
- [x] Inquiry search and message reading pane.
- [x] Per-inquiry reply action.
- [x] Universal data search across enquiries, content collections, media and recent audit activity (50-result cap; latest 500 audit entries).
- [x] Ctrl/Cmd+K command palette for keyboard-accessible quick navigation across registered admin sections.
- [x] Shared accessible confirmation dialog for destructive admin actions, including keyboard dismissal and focus handling.
- [x] Undo removal for pending Content Manager draft items; published collection versions remain recoverable for 7 days.
- [ ] General undo for other safe draft actions.
- [x] Bulk Content Manager publish/delete and safe Media Library move-to-trash; server-side usage checks skip referenced files.
- [x] Authenticated CSV export for all active enquiries with spreadsheet formula-injection protection.
- [x] Protect unsaved Content Manager, page editor and SEO editor changes from accidental in-app navigation; confirm destructive refreshes.
- [x] Preserve unsaved shared website settings on navigation and save them before publishing.
- [x] Improve Media Library upload accessibility and partial-batch failure feedback.
- [ ] Consistent empty/loading/error states across every module.

### Phase 2 — Content operations
- [x] Published-vs-draft visual comparison in centralized Brand Settings (live vs editing logo, accent colour and typography).
- [ ] Rich version history and restore UX (page-level history/restore still needs a dedicated audit).
- [ ] More robust calendar views and schedule filters.
- [x] Exact duplicate-image detection during upload (Git blob SHA-1 comparison; duplicate uploads are rejected).
- [ ] Image optimization/resizing tools.
- [x] Homepage section visibility controls; hidden sections retain their content and can be restored.
- [x] Centralized brand identity controls for accent colour, typography and Media Library logo.
- [ ] Accessibility and metadata validation for all uploaded assets and published content.

### Phase 3 — Security and recovery
- [x] Successful admin login and logout events in the audit timeline (failed/expired attempts remain unrecorded).
- [x] Individual admin session revocation using temporary SHA-256 fingerprints; the current session is protected and cookie tokens are never returned to the browser.
- [ ] Stronger CSRF/origin and rate-limit review.
- [x] Exportable audit history (CSV of up to the latest 500 retained events); automated security alerts remain planned.
- [ ] Backup restore drill and documented recovery point objectives.
- [ ] Team permissions only when additional operators are introduced.

### Phase 4 — Website intelligence
- [ ] Confirm and integrate Cloudflare Web Analytics.
- [ ] SEO health checks and sitemap/indexing status.
- [ ] Broken-link and missing-alt detection.
- [ ] Uptime monitoring and Core Web Vitals.
- [ ] Honest freshness timestamps and source attribution.

### Phase 5 — Business operations
- [ ] Project and task management.
- [ ] Client directory and project relationships.
- [ ] Quotations and invoice records.
- [ ] Digital product and license management.
- [ ] Document and business asset library.
- [ ] Evaluate Cloudflare D1 before introducing relational data.

### Phase 6 — Android companion
- [ ] Confirm existing Android app architecture and Firebase configuration.
- [ ] Secure shared API authentication.
- [ ] Dashboard, inquiry notifications and read-only monitoring.
- [ ] Approval workflows and carefully scoped publishing actions.
- [ ] Push notification delivery and device/session controls.

### Phase 7 — AI assistance
- [ ] Read-only admin assistant grounded in actual workspace data.
- [ ] SEO/content suggestions with explicit human approval.
- [ ] Error diagnosis and release summaries.
- [ ] No autonomous publishing, billing or destructive action by default.

## Release policy

- Keep changes small and reversible.
- Run syntax checks, unit/regression tests and HTML validation.
- Require pull-request checks before merging.
- Use browser-based end-to-end checks before claiming visual completion.
- Never introduce paid services, alter billing, send customer replies, or publish business/legal/financial data without explicit authorization.
- Record implementation status honestly; a roadmap item is not complete merely because it is documented.
