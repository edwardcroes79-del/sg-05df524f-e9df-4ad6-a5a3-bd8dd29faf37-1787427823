---
title: Phase 4 - Customer Experience & Stamping
status: done
priority: urgent
type: feature
tags: [customer, stamping, qr-code, security]
created_by: agent
---

## Notes
- Customer needs to view their cards, progress, and rewards.
- Customers need a scannable QR code (representing their customer_id).
- Staff needs a view to scan QR codes and issue real stamps.
- Stamping must be atomic, server-side validated, and anti-abuse.

## Checklist
- [x] Create `issue_stamp` RPC function in Supabase (Security Definer).
- [x] Build Customer Dashboard (`/customer`).
- [x] Build Customer Card View + QR Code generation.
- [x] Build Staff Scan/Issue Stamp UI (`/dashboard/scan`).
- [x] Test atomic transactions and reward threshold triggers.

## Acceptance
- Customer can log in and see their loyalty cards.
- Customer QR code generates successfully.
- Staff can issue a stamp to a customer securely.
- Cards automatically generate a reward when the stamp threshold is reached.