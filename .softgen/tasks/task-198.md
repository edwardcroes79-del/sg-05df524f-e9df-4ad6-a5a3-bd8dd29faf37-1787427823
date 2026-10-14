---
title: Excel Export Import Admin Authorization Fix
status: in_progress
priority: urgent
type: bug
tags: [security, authorization, excel, export, import]
created_by: agent
created_at: 2026-10-14T13:53:07Z
position: 198
---

## Notes
Fix the high-risk Excel Member Export/Import authorization finding. Scope: inspect `src/pages/api/business/member-export.ts`, `src/lib/server/memberImport.ts`, import preview/confirm API routes, and existing trusted authentication/role helpers. Trace `get_business_dashboard_access_status` and do not assume it grants only Business Admin access. Explicitly enforce the existing Owner/Business Admin authorization policy server-side for export, import-preview, and import-confirmation before service-role database access or data modification. Reuse existing application role/permission system; do not invent role names or trust client-supplied roles. Preserve entitlement checks, business isolation, export behavior, import validation, duplicate detection, and historical data protection. Staff access must remain denied unless existing documented policy explicitly allows it. Do not change unrelated features, plans, prices, entitlements, customer data, destructive database state, or deployment.

## Checklist
- [ ] Inspect dashboard access RPC, business role schema, and existing authorization helpers
- [ ] Identify verified Owner/Business Admin role-checking mechanism
- [ ] Apply smallest server-side role enforcement to export, import preview, and import confirm paths
- [ ] Add or update safe tests/probes for authorized role path and unauthorized direct API rejection where possible
- [ ] Run checks and report changed files, actual results, and remaining manual verification needs

## Acceptance
Excel export/import APIs reject unauthorized roles with HTTP 403 even if the business plan entitlement is enabled. Authorized Owners/Business Admins continue through the existing entitlement and business isolation checks. No unrelated features or data are modified.