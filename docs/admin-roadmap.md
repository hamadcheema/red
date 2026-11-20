# The Red Sparrow Admin — Long-term Roadmap

Last reviewed: 2026-11-20
Repository: https://github.com/hamadcheema/red
Baseline: main commit e2eaf29ac5480c22b7b6fc2d453ca8224c29f684

## Product direction

Evolve the existing admin into a reliable company operations workspace while preserving the current GitHub Pages + Cloudflare Worker architecture and its free-stack-first approach. Improve existing capabilities before adding complexity. The web admin and native Android companion should use the same protected API where practical.

## Current baseline

Already present in the repository:
- Website page editor and remote drafts
- SEO metadata editor
- Media library, uploads, recently deleted media and usage checks
- Showcase and brand asset collections
- Audit log
- Scheduled publishing, retry and cancellation
- Notifications and inquiry inbox
- Website preview and shared site settings
- Health checks and admin session controls
- GitHub Actions syntax and regression tests

Known limitations to verify:
- Inquiry list returns at most 100 messages; counts must represent all stored messages.
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
- [x] Gmail-style inquiry workspace with Inbox, Unread and Archived folders.
- [x] Inquiry search and message reading pane.
- [x] Per-inquiry Gmail compose/reply action.
- [ ] Global search across all modules.
- [x] Ctrl/Cmd+K command palette for keyboard-accessible quick navigation across registered admin sections, with common aliases and descriptive matching.\n- [x] Universal data search across enquiries, projects, social previews, brand assets, media and the latest 500 activity entries (separate from navigation search); capped at 50 results per query.
- [ ] Accessible universal confirmations and undo for safe draft actions.
- [ ] Bulk actions and consistent empty/loading/error states.\n- [x] Authenticated CSV export for all active enquiries with spreadsheet formula-injection protection.

### Phase 2 — Content operations
- [ ] Published-vs-draft visual comparison.
- [ ] Rich version history and restore UX.
- [ ] More robust calendar views and schedule filters.
- [ ] Media duplicate detection and optimization.
- [ ] Bulk media/content operations.
- [ ] Accessibility and metadata validation.
- [x] Homepage section visibility controls; hidden sections retain their content and can be restored.
- [x] Centralized brand identity controls for accent colour, typography and Media Library logo.

### Phase 3 — Security and recovery
- [ ] Detailed login/session event history.
- [ ] Individual session revocation.
- [ ] Stronger CSRF/origin and rate-limit review.
- [ ] Security alerts and exportable audit history.
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
