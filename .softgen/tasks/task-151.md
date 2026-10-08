---
title: Corporate Branding Backend Foundation
status: in_progress
priority: urgent
type: feature
tags: [corporate, branding, backend, storage, supabase]
created_by: agent
created_at: 2026-10-08T13:55:04Z
position: 151
---

## Notes
Build Phase 1 backend/storage only for Corporate Branding. Corporate businesses must be able to save business logo, primary brand color, and secondary/accent color by business_id. Reuse existing Supabase architecture and any suitable storage/branding systems. Do not build UI. Do not modify pricing, plan limits, billing, Quick QR, locations, advanced analytics, lower-plan branding behavior, customer data, or authentication. Preserve existing lower-plan branding/card customization functionality. Enforce Corporate-only entitlement server-side, business-isolated storage paths, secure RLS, logo validation, and safe Royalty Stamp defaults when no custom branding exists.

## Checklist
- [ ] Audit existing business, branding/card customization, storage buckets, entitlement, and API architecture before implementation
- [ ] Add or reuse Supabase schema for Corporate Branding settings stored by business_id with RLS isolation
- [ ] Add or reuse Supabase Storage setup for business-isolated logo paths with secure access policies
- [ ] Implement server-side Corporate entitlement checks for saving and retrieving Corporate Branding
- [ ] Implement backend endpoints/services to save and read logo URL, primary brand color, and secondary/accent color without UI changes
- [ ] Validate uploaded logo files for type, size, and ownership; optimize/compress where appropriate within the existing stack
- [ ] Provide safe default Royalty Stamp branding when no Corporate custom branding exists
- [ ] Verify non-Corporate businesses cannot use Corporate Branding backend functionality and another business cannot access branding
- [ ] Run project checks and report files, database/storage changes, RLS, and tests

## Acceptance
Corporate businesses can persist and reload logo, primary color, and secondary/accent color through backend functionality.
Branding data and logo storage are isolated by business_id with RLS/storage policies.
Non-Corporate businesses and unauthorized businesses are blocked from Corporate Branding backend access.