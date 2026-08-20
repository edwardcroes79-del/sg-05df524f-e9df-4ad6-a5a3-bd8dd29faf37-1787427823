---
title: Simplify Customer QR Join Architecture
status: in_progress
priority: urgent
type: refactor
tags: [qr-join, architecture, routing]
created_by: agent
created_at: 2026-08-20T19:22:27Z
position: 29
---
## Notes
The current multi-parameter QR route (`/join/[business_slug]/[program_id]`) is failing due to Next.js hydration races and missing/malformed slugs. We are simplifying this to a single-parameter route (`/join/[id]`) using the globally unique program UUID as the public token. Existing posters will be preserved via a redirect.

## Checklist
- [ ] Create `src/pages/join/[id].tsx` with robust hydration (`router.isReady`) and unified Supabase querying
- [ ] Convert legacy `src/pages/join/[business_slug]/[program_id].tsx` to redirect to the new route
- [ ] Update `src/pages/dashboard/qr.tsx` to generate new QR codes with the simplified `/join/[id]` URL format
- [ ] Run build and check for errors
- [ ] Deliver short summary and wait for instructions