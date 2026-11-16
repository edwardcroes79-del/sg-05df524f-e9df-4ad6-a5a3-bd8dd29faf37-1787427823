---
title: Remote business setup workspace
status: in_progress
priority: urgent
type: feature
tags: [setup-assistance, superadmin, card-design, loyalty]
created_by: agent
created_at: 2026-11-16T15:53:00Z
position: 281
---

## Notes
Phase 2 of Setup Assistance. Superadmin opens a restricted setup workspace for a business whose setup request is Accepted. Access uses the Superadmin's own session plus a server-validated temporary setup session (45-minute expiry, revocable, bound to one business and one request, audited). No impersonation, no password sharing, no second business login.

Scope inside the workspace: business logo/branding, card template and design, stamps required, reward settings. All changes are saved as pending drafts and must NOT overwrite live loyalty programs, live card design, or live branding before the business approves in Phase 3. "Mark Setup Ready for Review" moves the request to a Ready for Review status; it never sets Completed.

Must reuse the existing Card Design & Template Customizer and loyalty configuration rules — no second customizer or loyalty system. Out of bounds: customers, stamps, rewards earned/redeemed, QR/scan, staff, billing, subscription, security, Superadmin settings. Do not touch Issue Stamp, Quick Issue Stamp, the stamp engine, customer registration (Task 274), or Phase 1 request flow. Phase 3 (business approval/publish) is not part of this task.

## Checklist
- [x] Inspect Phase 1 setup request code, Superadmin auth, existing card customizer, branding/logo settings, loyalty program and reward configuration, and any existing draft/preview mechanism
- [x] Post a brief implementation plan based on the actual code and schema
- [x] Add database support: Ready for Review request status, temporary setup sessions (45-minute expiry, revocation, business/request binding), pending setup drafts, and audit log, all with RLS limited to Superadmin/service access
- [ ] Add server APIs to start, validate, revoke setup sessions; load/save pending branding, card design, and loyalty drafts; and mark setup Ready for Review — each operation re-validating the session server-side and writing an audit entry
- [ ] Add "Open Business Setup" action for Accepted requests in Superadmin Setup Requests, plus revoke-session control
- [ ] Build the restricted setup workspace page reusing the existing card customizer and loyalty configuration components, with session countdown and "Mark Setup Ready for Review"
- [ ] Verify Accepted-only access, business binding, expiry and revocation rejection, drafts not touching live settings, audit records, Phase 1 continuity, and that stamp flows were not modified

## Acceptance
- Superadmin can open a time-limited setup workspace only for Accepted requests and only for that business.
- Branding, card design, and loyalty settings saved in the workspace stay pending and do not change the business's live card or program.
- Superadmin can mark the setup Ready for Review, and every session and action appears in the audit log.