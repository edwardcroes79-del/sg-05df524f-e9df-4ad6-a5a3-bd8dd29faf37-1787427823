---
title: Quick QR production deployment audit
status: in_progress
priority: urgent
type: bug
tags: [quick-qr, supabase, rpc, production-readiness, corporate]
created_by: agent
created_at: 2026-10-07T17:55:48Z
position: 143
---

## Notes
Audit and fix the complete Quick QR production deployment/readiness path. Compare source migrations and application RPC usage against the actual connected Supabase database. Do not bypass RLS, create mock responses, hardcode success, disable location validation, or create duplicate Quick QR/entitlement systems.

Flow to trace:
Business Admin → Quick QR menu → Quick QR generation → Corporate/location entitlement → active location → QR displayed → customer scans QR → customer/business/program validation → loyalty program availability at location → customer eligibility → stamp issuance → location recorded → stamp saved to database.

Corporate behavior:
Corporate gets Quick QR automatically and does not require the AWG 10 add-on. Quick QR must use the active Corporate location and record that location.

Lower plans:
Trial, Starter, Business, and Professional must keep existing Quick QR behavior and AWG 10 add-on rules.

Production verification limitations:
Database source-vs-production verification and safe SQL fixes can be performed in this environment. Real deployed-app login, real customer phone scan, and real stamp issuance require access to live Corporate Admin/customer accounts and the deployed application.

## Checklist
- [x] Trace every Quick QR frontend/API/RPC path used by admin generation and customer scan
- [x] List every Quick QR-related RPC/function referenced in source code and migrations
- [x] Compare source migrations/functions against actual production Supabase pg_proc signatures and return types
- [x] Verify required functions exist with exact names, parameters, return types, permissions, RLS compatibility, and PostgREST accessibility
- [x] Identify missing or incompatible production migrations/functions
- [x] Apply only required safe database fixes, preserving existing entitlement, location, and RLS security behavior
- [x] Refresh/reload schema cache if database functions are added or changed
- [ ] Wire active Corporate location into Quick QR token generation without changing lower-plan behavior
- [ ] Run app validation and targeted database verification
- [ ] Report RPCs/functions found, production status, migrations applied, schema cache status, security status, development scan test status, and remaining errors

## Acceptance
Quick QR RPCs required by admin QR generation and customer scan exist in production with compatible signatures.
Corporate Quick QR works through active location scope without AWG 10 add-on, while lower-plan add-on rules remain intact.
No remaining production RPC 404/function-not-found errors are identified for the audited Quick QR flow.