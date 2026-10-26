# Royalty Scratch & Win — Phase 7 Product Specification and Implementation Plan

Date: 2026-10-26  
Status: Planning/documentation GO; backend/database implementation NO-GO

## Scope and safety statement

This document finalizes the planning specification for a future Royalty Scratch & Win production implementation. It does not implement backend functionality and does not change application behavior.

Current authorized scope:
- Planning and documentation only.
- Preserve the existing Scratch & Win frontend prototypes as demo/local/mock-only.
- Keep Scratch & Win separate from Stamp Flow, Quick Stamp, existing QR flows, and rewards/redemption functionality.
- Do not create backend-saved drafts or claim backend functionality exists.

Current implementation status:
- Frontend prototypes exist for Scratch & Win demos, templates, realistic scratch interaction, customer journey, and campaign management.
- Backend/database implementation is not authorized.
- Production release is not authorized.

## 1. Updated decision register

### Approved decision 1 — Staff permissions

Decision:
- Owners and administrators may manage campaigns and revoke vouchers.
- Only explicitly authorized staff may validate or redeem vouchers.
- Campaign publishing, archiving, and voucher revocation are owner/admin-only unless further approved.
- Staff redemption must not be enabled unless its permission can be explicitly verified.

Technical gates retained:
- Business ownership and staff authorization source is UNVERIFIED.
- Staff permission source and granularity are UNVERIFIED.
- Location-level staff scoping, if any, is UNVERIFIED.

Implementation requirement:
- Campaign publish/archive/revoke endpoints must enforce owner/admin authorization server-side.
- Voucher validate/redeem endpoints must enforce explicit staff redemption permission server-side.
- No frontend-only role check is sufficient.

### Approved decision 2 — Customer eligibility

Decision:
- Any registered Royalty Stamp customer may play an eligible active campaign once.
- Do not require purchase, stamp, loyalty-program membership, business association, Quick Stamp transaction, or existing reward to qualify.
- Enforce the one-play rule server-side in the future implementation.

Technical gates retained:
- Canonical registered-customer identity and authentication mapping are UNVERIFIED.

Implementation requirement:
- The server must derive customer identity from the authenticated session.
- The browser must not supply the authoritative customer ID.
- A database constraint or equivalent server-enforced uniqueness must prevent more than one play per registered customer per campaign.

### Approved decision 3 — Demo access

Decision:
- Businesses without active Scratch & Win add-on entitlement may use demo drafts and previews.
- Publishing campaigns and allowing customer plays require active add-on entitlement.
- Demo drafts and previews remain frontend/local mock-only until authentication, persistence, and entitlement architecture have been verified.
- Do not imply local demo state is saved to the backend.

Technical gates retained:
- Server-readable add-on entitlement source is UNVERIFIED.
- Safe isolated non-production environment is UNVERIFIED.

Implementation requirement:
- Future publish and play operations must check active Scratch & Win entitlement server-side.
- Demo-only state must remain clearly separated from backend-saved campaign records.

### Approved decision 4 — Campaign defaults

Decision:
- Drafts may be incomplete.
- Before publishing, the owner/admin must explicitly configure:
  1. Win rate
  2. Campaign duration
  3. Non-winning behavior when prizes are exhausted
  4. Campaign-level voucher expiration
  5. Campaign terms
- Do not silently supply operational defaults for these required fields.
- Validate campaign configuration before publishing.

Implementation requirement:
- Draft creation may accept incomplete data.
- Publish must fail until all required operational fields are explicitly configured and valid.

### Approved decision 5 — Customer-facing disclosures

Decision:
- Show campaign terms and clear limited-prize/non-guaranteed-win messaging.
- Do not expose exact live remaining prize inventory in customer-facing experience or public API.
- Keep legally required odds and prize-quantity disclosures subject to appropriate legal/compliance review.
- Do not invent or publish unverified odds or legal claims.

Technical/legal gates retained:
- Applicable legal requirements for campaign terms, odds, prize quantities, and promotional mechanics are UNVERIFIED.

Implementation requirement:
- Customer APIs must return safe customer-facing campaign data.
- Authorized business dashboards may show exact inventory.
- Customer/public APIs must not expose exact live remaining inventory.

### Approved decision 6 — Legal/compliance review

Decision:
- Flag campaigns for appropriate legal/compliance review when they involve purchase requirements, regulated or high-value prizes, public odds claims, or expansion outside Aruba.
- This is a risk-control requirement, not a legal determination.
- Applicable requirements must be confirmed with qualified local legal guidance before launch.

Legal gate retained:
- Applicable legal requirements are UNVERIFIED.

Implementation requirement:
- Campaign records should be able to represent legal/compliance review status in a future implementation.
- Production launch requires legal/compliance gate review before live customer access.

### Approved decision 7 — Voucher revocation

Decision:
- Only owners/admins may revoke vouchers.
- Require a revocation reason.
- Record an audit event for each revocation.
- Customer notification may be handled manually or optionally; do not claim automatic notifications exist.

Technical gates retained:
- Owner/admin source is UNVERIFIED.
- Customer notification infrastructure for revocation is not approved.

Implementation requirement:
- Revocation must be server-side, owner/admin-only, reason-required, and audited.
- Revocation must not delete voucher history.

## 2. Updated product requirements

### Required customer rules

- Only registered Royalty Stamp customers may play.
- A registered customer may play an eligible active campaign once.
- A purchase, stamp, loyalty-program membership, business association, Quick Stamp transaction, or existing reward is not required.
- The server must record the result before the customer can reveal it.
- Customer-facing experiences must show campaign terms and limited-prize/non-guaranteed-win messaging.
- Customer-facing APIs must not expose exact live remaining prize inventory.

### Required business rules

- Businesses may use frontend/local demo drafts and previews without active entitlement.
- Publishing campaigns requires active Scratch & Win add-on entitlement.
- Customer plays require active Scratch & Win add-on entitlement.
- Drafts may be incomplete.
- Publishing requires explicit configuration of win rate, campaign duration, exhausted-prize behavior, campaign-level voucher expiration, and campaign terms.
- Campaigns requiring legal/compliance review must be flagged before launch when they involve purchase requirements, regulated or high-value prizes, public odds claims, or expansion outside Aruba.

### Required prize rules

- Prize selection must be server-authoritative.
- Campaigns use configurable campaign win rate with fixed, limited prize quantities.
- Prize quantities must be protected from overselling through atomic allocation.
- If all prizes are exhausted:
  - Allow non-winning results only when explicitly enabled.
  - Otherwise stop/block new plays.
- Browser clients must never choose or alter prize, winning status, odds, or inventory.

### Required voucher rules

- Winning plays issue unique digital vouchers with QR codes.
- Prize-level expiration overrides campaign-level expiration.
- Use verified business timezone for calendar-day expiration.
- Use exact elapsed-hours UTC fallback if business timezone is unavailable.
- Voucher validation/redeem actions require server authorization.
- Only owners/admins may revoke vouchers.
- Revocation requires a reason and audit event.
- Automatic customer notification is not approved.

### Required isolation rules

- Scratch & Win must use dedicated data structures and narrowly scoped authorization.
- Scratch & Win must remain separate from Stamp Flow, Quick Stamp, existing QR flows, and rewards/redemption logic.
- No existing stamp issuance, Quick Stamp, loyalty reward, or redemption functions should be reused or modified without a separate approved design.

### Assumptions not allowed

The following must not be assumed:
- Auth/customer mapping is known.
- Business owner/staff permission source is known.
- Add-on entitlement source is known.
- Business timezone source is known.
- Safe non-production environment is available.
- Existing regression coverage exists.
- Legal requirements are known.

## 3. Updated architecture and API contract

### Proposed backend boundary

Future Scratch & Win production work should use a dedicated backend boundary:
- Dedicated Scratch & Win tables.
- Dedicated API routes or server functions.
- Dedicated RLS policies.
- Dedicated audit events.
- Existing Royalty Stamp authentication and business membership may be reused only after verification.
- Existing Stamp Flow and Quick Stamp functions must remain untouched.

### Proposed table namespace

Future schema proposal, not implemented:
- `scratch_campaigns`
- `scratch_campaign_prizes`
- `scratch_entries`
- `scratch_vouchers`
- `scratch_redemptions`
- `scratch_audit_events`

### Campaign management API requirements

Proposed operations:
- Create draft campaign.
- Retrieve campaign.
- Update draft campaign.
- Validate campaign configuration.
- Publish campaign.
- Pause/resume campaign.
- Complete/archive campaign.
- Retrieve campaign performance and authorized inventory views.

Authorization:
- Draft/demo behavior may exist without active entitlement if local/mock-only.
- Backend-saved campaign management requires authenticated business context.
- Publish/archive require owner/admin.
- Publishing requires active Scratch & Win entitlement.
- Publishing requires explicit valid win rate, campaign duration, exhausted-prize behavior, campaign-level voucher expiration, and campaign terms.

Audit events:
- `scratch_campaign.created`
- `scratch_campaign.updated`
- `scratch_campaign.validated`
- `scratch_campaign.published`
- `scratch_campaign.paused`
- `scratch_campaign.resumed`
- `scratch_campaign.completed`
- `scratch_campaign.archived`

### Customer participation API requirements

Proposed operations:
- Retrieve eligible campaigns.
- Check customer eligibility.
- Start play.
- Retrieve existing play after refresh/interruption.

Authorization:
- Registered Royalty Stamp customer only.
- Customer identity comes from authenticated server-side session context.
- No purchase/stamp/business association requirement.
- Active campaign and active business entitlement required.
- One play per customer per campaign enforced server-side and by database constraint.

Idempotency:
- Start play requires idempotency key.
- Retry after timeout returns the original result.
- Different idempotency key after a completed play must not create a second play.

Transaction:
- Start play must be a single trusted transaction that validates eligibility, determines outcome, decrements inventory if needed, records the entry, creates voucher if winning, and writes audit records.

Audit events:
- `scratch_eligibility.checked`
- `scratch_play.started`
- `scratch_play.result_recorded`
- `scratch_play.duplicate_attempted`

### Prize allocation API requirements

Prize allocation must be internal/trusted only.

Rules:
- Campaign win rate is configured explicitly before publish.
- Fixed prize quantities are enforced server-side.
- Prize selection occurs only on the server.
- Inventory decrement is atomic and cannot produce negative remaining quantity.
- If the selected prize is exhausted, the server may retry among eligible available prizes.
- If all prizes are exhausted, return non-winning only when explicitly enabled; otherwise block new plays.

Audit events:
- `scratch_prize.selected`
- `scratch_inventory.decremented`
- `scratch_inventory.exhausted`
- `scratch_play.blocked_inventory_exhausted`

### Voucher lifecycle API requirements

Proposed operations:
- Issue voucher internally during winning play transaction.
- Retrieve customer’s own vouchers.
- Display voucher details and QR reference.
- Validate voucher as authorized staff.
- Redeem voucher as authorized staff.
- Revoke voucher as owner/admin.

Rules:
- Winning entries create unique vouchers.
- Voucher secrets/references must be high entropy.
- Store hashed voucher secret/reference, not plain secret.
- QR payload must be opaque and server-resolved.
- Prize-level expiration overrides campaign-level expiration.
- Final `expires_at` is calculated at issue time.
- Expiration uses verified business timezone for calendar-day rules or exact elapsed-hours UTC fallback.
- Revoked, expired, or already redeemed vouchers cannot redeem.

Authorization:
- Customers can see only own vouchers.
- Staff can validate/redeem only with explicitly verified permission.
- Staff redemption must not be enabled without verified permission.
- Owners/admins can revoke vouchers with reason.

Audit events:
- `scratch_voucher.issued`
- `scratch_voucher.viewed`
- `scratch_voucher.validation_attempted`
- `scratch_voucher.redeemed`
- `scratch_voucher.redemption_failed`
- `scratch_voucher.revoked`

### RLS and tenant isolation requirements

- Every Scratch & Win business-owned table must include `business_id`.
- RLS must prevent cross-business campaign, prize, entry, voucher, redemption, and audit access.
- Customer RLS must prevent viewing another customer’s plays or vouchers.
- Sensitive writes must be performed by trusted server operations, not direct browser updates.
- RLS must be verified in an isolated test environment before production consideration.

## 4. Ordered implementation tickets

### Ticket 1 — Verify safe implementation environment

Objective:
Confirm a non-production environment before database/backend work.

Scope:
- Verify non-production Supabase project access and ownership.
- Confirm environment points to test only.
- Confirm production and clone safety boundaries.
- No database writes.

Dependencies:
- Product-owner/admin confirmation.

Acceptance criteria:
- Safe test target documented.
- Production target explicitly excluded.
- Approval exists before schema inspection or migrations.

Tests:
- Process checklist only.

### Ticket 2 — Verify identity, authorization, entitlement, and timezone sources

Objective:
Resolve UNVERIFIED technical dependencies.

Scope:
- Confirm registered customer identity mapping.
- Confirm business owner/admin source.
- Confirm staff membership and permission source.
- Confirm server-readable Scratch & Win add-on entitlement source.
- Confirm business timezone source or approve UTC fallback behavior.

Dependencies:
- Ticket 1.

Acceptance criteria:
- All identity and authorization assumptions documented with evidence.
- Unknowns are escalated before implementation.

Tests:
- Read-only verification checklist in safe environment only after approval.

### Ticket 3 — Finalize schema, RLS, and audit design

Objective:
Create implementation-ready schema/RLS specification.

Scope:
- Finalize dedicated Scratch & Win tables.
- Define constraints, indexes, RLS policies, helper functions, and audit events.
- Ensure no Stamp Flow/Quick Stamp coupling.

Dependencies:
- Tickets 1 and 2.

Acceptance criteria:
- Schema design approved.
- RLS matrix approved.
- Audit event list approved.
- Retention policy supports 24-month default.

Tests:
- Design review and threat-model review.

### Ticket 4 — Implement test-only schema and RLS

Objective:
Create database structures in verified test environment only.

Scope:
- Dedicated Scratch & Win tables.
- Constraints for one play, non-negative inventory, unique voucher reference, and valid statuses.
- RLS policies for tenant/customer isolation.
- No production changes.

Dependencies:
- Tickets 1–3 and explicit approval to migrate test.

Acceptance criteria:
- Test schema exists only in approved test environment.
- No existing Stamp Flow/Quick Stamp schema modified.
- RLS enabled and verified.

Tests:
- Tenant isolation.
- Customer isolation.
- Direct write denial for sensitive tables.

### Ticket 5 — Campaign management backend

Objective:
Implement trusted campaign lifecycle operations.

Scope:
- Draft create/retrieve/update.
- Validate configuration.
- Publish/pause/resume/complete/archive.
- Performance and inventory dashboard views.

Dependencies:
- Ticket 4.

Acceptance criteria:
- Publish requires owner/admin and active entitlement.
- Publish requires explicit win rate, duration, exhausted-prize behavior, voucher expiration, and terms.
- Customer/public APIs do not expose live remaining inventory.
- Lifecycle changes audited.

Tests:
- Positive draft flow.
- Publish validation failures.
- Owner/admin authorization.
- Cross-business denial.
- Entitlement denial.

### Ticket 6 — Customer play and prize allocation backend

Objective:
Implement server-authoritative play transaction.

Scope:
- Eligible campaign retrieval.
- Eligibility check.
- Start play with idempotency.
- Server outcome selection by campaign win rate.
- Atomic prize inventory decrement.
- Exhausted-prize rule enforcement.
- Result retrieval after refresh.

Dependencies:
- Tickets 4 and 5.

Acceptance criteria:
- Registered customer only.
- One play per customer per campaign.
- Server records result before reveal.
- Browser cannot choose prize or win/loss.
- No negative inventory.
- Retry returns stable result.

Tests:
- Positive play.
- Unauthenticated/unauthorized customer denial.
- Duplicate request retry.
- Concurrent plays.
- Final prize race.
- All prizes exhausted with non-winning enabled.
- All prizes exhausted with non-winning disabled.

### Ticket 7 — Voucher issue and customer voucher backend

Objective:
Implement secure voucher creation and customer-owned voucher retrieval.

Scope:
- Unique voucher reference generation.
- Hashed voucher storage.
- QR payload/reference creation.
- Expiration calculation.
- Customer voucher list and detail.

Dependencies:
- Ticket 6.

Acceptance criteria:
- Winning play creates exactly one voucher.
- Losing play creates no voucher.
- Prize-level expiration overrides campaign-level expiration.
- Timezone/fallback rule applied as approved.
- Customer can view only own vouchers.

Tests:
- Voucher uniqueness.
- Voucher ownership isolation.
- Expiration precedence.
- QR reference opacity.

### Ticket 8 — Voucher validation, redemption, and revocation backend

Objective:
Implement authorized staff voucher operations.

Scope:
- Validate QR/reference.
- Redeem voucher.
- Reject expired/revoked/invalid/already redeemed vouchers.
- Owner/admin revocation with reason.
- Audit validation, redemption, failed redemption, and revocation.

Dependencies:
- Ticket 7 and verified staff permission source.

Acceptance criteria:
- Staff validation/redemption only with explicit verified permission.
- Owner/admin-only revocation.
- Revocation reason required.
- Concurrent duplicate redemption prevented.
- Audit events recorded.

Tests:
- Authorized redemption.
- Unauthorized staff denial.
- Cross-business staff denial.
- Duplicate redemption.
- Concurrent redemption.
- Revoked voucher rejection.
- Invalid QR rejection.

### Ticket 9 — Frontend API integration

Objective:
Connect existing prototypes to backend only after backend is approved and verified.

Scope:
- Campaign management dashboard API integration.
- Customer journey play/result integration.
- Voucher display integration.
- Preserve demo-only behavior where backend is unavailable.
- Do not touch Stamp Flow/Quick Stamp.

Dependencies:
- Tickets 5–8.

Acceptance criteria:
- Frontend does not control prize outcomes.
- Demo/local state is not represented as backend-saved.
- Error, loading, and access-denied states are clear.
- Existing frontend prototypes remain isolated until intentionally integrated.

Tests:
- API integration tests.
- Mobile and keyboard checks.
- Refresh/retry result recovery.

### Ticket 10 — Audit retention, privacy, and compliance gates

Objective:
Implement and verify audit/privacy release controls.

Scope:
- Audit retention default of 24 months.
- PII minimization.
- No plain voucher secrets in logs.
- Legal/compliance review flags.
- Campaign terms validation before publish.

Dependencies:
- Tickets 3–8.

Acceptance criteria:
- Audit data minimized.
- 24-month retention policy documented and testable.
- Legal/compliance review flags exist where needed.
- Terms are required before publish.

Tests:
- Audit event tests.
- Sensitive data absence tests.
- Terms-required tests.
- Compliance flag tests.

### Ticket 11 — Regression and release readiness

Objective:
Prove Scratch & Win does not affect existing Royalty Stamp flows.

Scope:
- Full Scratch & Win test matrix.
- Stamp Flow regression.
- Quick Stamp regression.
- Existing QR flow regression.
- Rewards/redemption regression.
- Rollback/monitoring review.

Dependencies:
- Tickets 1–10.

Acceptance criteria:
- Critical Scratch & Win tests pass.
- Existing Stamp Flow, Quick Stamp, QR, rewards, and redemption tests pass.
- Release checklist approved.
- Production release is separately authorized.

Tests:
- Full security and regression matrix.

## 5. Test matrix

| Test ID | Area | Scenario | Expected result | Priority |
|---|---|---|---|---|
| SW-POS-001 | Campaign | Owner creates incomplete draft | Draft saved as non-publishable | High |
| SW-POS-002 | Campaign | Owner configures all publish-required fields | Validation passes | Critical |
| SW-NEG-001 | Campaign | Publish without win rate | Publish denied | Critical |
| SW-NEG-002 | Campaign | Publish without campaign terms | Publish denied | Critical |
| SW-AUTH-001 | Campaign | Staff attempts publish | Denied unless owner/admin | Critical |
| SW-AUTH-002 | Campaign | Business without entitlement attempts publish | Denied | Critical |
| SW-AUTH-003 | Voucher | Staff without explicit redemption permission validates/redeems | Denied | Critical |
| SW-AUTH-004 | Voucher | Staff attempts revocation | Denied | Critical |
| SW-CUST-001 | Customer | Registered customer plays active eligible campaign | Result recorded before reveal | Critical |
| SW-CUST-002 | Customer | Unregistered/unauthenticated user plays | Denied | Critical |
| SW-CUST-003 | Customer | Customer attempts second play | Existing result or denial; no second entry | Critical |
| SW-DUP-001 | Idempotency | Retry same play key after success | Same result returned | Critical |
| SW-DUP-002 | Idempotency | Retry after connection interruption | Same result returned | Critical |
| SW-CON-001 | Concurrency | Same customer sends concurrent plays | One entry only | Critical |
| SW-CON-002 | Concurrency | Two customers compete for final prize | At most one wins final prize | Critical |
| SW-INV-001 | Inventory | Prize selected but exhausted by concurrent play | Retry available prize or apply exhausted rule | Critical |
| SW-INV-002 | Inventory | All prizes exhausted and non-winning enabled | Non-winning result recorded | Critical |
| SW-INV-003 | Inventory | All prizes exhausted and non-winning disabled | New play blocked | Critical |
| SW-INV-004 | Inventory | Inventory decrement | Remaining quantity never negative | Critical |
| SW-EXP-001 | Expiration | Prize-level expiration configured | Prize-level rule overrides campaign-level | Critical |
| SW-EXP-002 | Expiration | No prize-level expiration | Campaign-level expiration applies | Critical |
| SW-EXP-003 | Expiration | Verified timezone available | Calendar-day expiration uses business timezone | High |
| SW-EXP-004 | Expiration | Timezone unavailable | UTC elapsed-hours fallback used | High |
| SW-QR-001 | QR | Valid voucher QR validated by authorized staff | Valid response | Critical |
| SW-QR-002 | QR | Forged/guessed QR reference | Rejected | Critical |
| SW-QR-003 | QR | Wrong-business staff validates QR | Denied | Critical |
| SW-RED-001 | Redemption | Authorized staff redeems active voucher | Voucher redeemed once | Critical |
| SW-RED-002 | Redemption | Duplicate redemption attempt | Rejected or idempotent same result | Critical |
| SW-RED-003 | Redemption | Concurrent redemption attempts | One success only | Critical |
| SW-RED-004 | Redemption | Expired voucher redeemed | Rejected | Critical |
| SW-REV-001 | Revocation | Owner/admin revokes with reason | Voucher revoked and audited | High |
| SW-REV-002 | Revocation | Revoked voucher redeemed | Rejected | Critical |
| SW-TEN-001 | Tenant | Business A reads Business B campaign | Denied | Critical |
| SW-TEN-002 | Tenant | Business A reads Business B vouchers | Denied | Critical |
| SW-TEN-003 | Tenant | Customer A reads Customer B voucher | Denied | Critical |
| SW-AUD-001 | Audit | Campaign publish | Audit event recorded | High |
| SW-AUD-002 | Audit | Play result | Audit event recorded | Critical |
| SW-AUD-003 | Audit | Voucher issued | Audit event recorded | Critical |
| SW-AUD-004 | Audit | Voucher revoked | Audit event includes reason | High |
| SW-PRIV-001 | Privacy | Audit records | No plain voucher secret; minimal PII | Critical |
| SW-DISC-001 | Disclosure | Customer campaign response | Terms and limited-prize messaging present; exact live inventory absent | High |
| SW-REG-001 | Regression | Stamp Flow | Existing stamp issuance unchanged | Critical |
| SW-REG-002 | Regression | Quick Stamp | Existing Quick Stamp behavior unchanged | Critical |
| SW-REG-003 | Regression | Existing QR flows | Existing QR behavior unchanged | Critical |
| SW-REG-004 | Regression | Rewards/redemption | Existing reward/redemption behavior unchanged | Critical |

## 6. Blocker and dependency register

| Blocker | Status | Evidence required to clear |
|---|---|---|
| Canonical registered-customer identity and authentication mapping | UNVERIFIED | Documented source of registered customer identity and authenticated session mapping in safe test environment |
| Business ownership and staff authorization source | UNVERIFIED | Documented owner/admin and staff membership/permission source |
| Staff redemption permission source | UNVERIFIED | Explicit permission model showing which staff can validate/redeem vouchers |
| Server-readable add-on entitlement source | UNVERIFIED | Canonical entitlement source and server-side check pattern |
| Verified business timezone source | UNVERIFIED | Business timezone field/source or documented UTC fallback activation rule |
| Safe isolated non-production environment | UNVERIFIED | Confirmed test project access/ownership and safe environment configuration |
| Existing regression-test coverage for Stamp Flow, Quick Stamp, QR flows, rewards/redemption | UNVERIFIED | Automated tests or manual QA checklist covering existing critical flows |
| Applicable legal requirements for campaign terms, odds, prize quantities, and promotional mechanics | UNVERIFIED | Qualified local legal/compliance guidance |
| Production release approval | NOT GRANTED | Explicit future go/no-go after technical, security, product, legal, and regression gates pass |

## 7. Release-readiness checklist

### Technical gates

- Safe non-production environment verified.
- Identity/customer mapping verified.
- Business owner/admin and staff permission source verified.
- Add-on entitlement source verified.
- Business timezone source verified or UTC fallback approved.
- Dedicated Scratch & Win schema/RLS implemented only after approval.
- One-play-per-campaign constraint verified.
- Atomic inventory allocation verified.
- Unique voucher reference and single-redemption constraints verified.
- Idempotency behavior verified.

### Security gates

- Tenant isolation tests pass.
- Customer isolation tests pass.
- Staff authorization tests pass.
- Cross-business voucher validation/redemption denied.
- Browser cannot choose prize, result, voucher, odds, or inventory.
- No privileged credentials exposed to browser.
- Audit events recorded for critical operations.
- No plain voucher secrets stored.

### Product gates

- Campaign terms required before publish.
- Limited-prize/non-guaranteed-win messaging shown to customers.
- Exact live remaining inventory hidden from customer/public APIs.
- Publish requires explicit win rate, duration, exhausted-prize behavior, campaign-level voucher expiration, and campaign terms.
- Entitlement enforced before publish and customer plays.
- Demo/local behavior clearly separated from backend-saved/live behavior.

### Legal/compliance gates

- Campaign legal/compliance review flags defined.
- Campaigns involving purchase requirements, regulated/high-value prizes, public odds claims, or expansion outside Aruba flagged for review.
- Applicable Aruba/future-market legal requirements verified before launch.
- Privacy and retention requirements confirmed.

### Regression gates

- Stamp Flow regression passes.
- Quick Stamp regression passes.
- Existing QR flow regression passes.
- Rewards/redemption regression passes.
- Existing auth and dashboard behavior unaffected.

### Operational gates

- Backup and rollback plan reviewed.
- Monitoring and alerting plan reviewed.
- Support process for voucher disputes/revocation defined.
- Production release separately approved.

## 8. GO/NO-GO recommendation

Planning/documentation:
- GO.

Frontend-only demo continuation:
- CONDITIONAL GO if mock/local-only, clearly demo-labeled, and isolated from backend, Stamp Flow, Quick Stamp, rewards, redemption, auth, environment, and production settings.

Backend/database implementation:
- NO-GO until technical prerequisites are verified, an isolated safe environment is confirmed, schema/RLS work is separately approved, and the appropriate implementation stage is explicitly authorized.

Production launch:
- NO-GO until all technical, security, product, legal/compliance, regression, and operational release gates pass.

## 9. Documentation update record

This Phase 7 document was added as planning documentation under `.softgen/`.

Existing detailed Phase 3–6 planning documents were not present as standalone `.md` files in the workspace. The available Scratch & Win planning/tracking artifacts were task records:
- `.softgen/tasks/task-241.md`
- `.softgen/tasks/task-242.md`
- `.softgen/tasks/task-243.md`
- `.softgen/tasks/task-244.md`
- `.softgen/tasks/task-245.md`
- `.softgen/tasks/task-246.md`
- `.softgen/tasks/task-247.md`

Because the detailed Phase 3–6 records existed in conversation history rather than located standalone files, this document consolidates the approved Phase 7 decision register, requirements, architecture/API contract, implementation tickets, test matrix, blocker register, release checklist, and GO/NO-GO recommendation without modifying application code.