---
title: Storage API and Secrets Security Audit
status: in_progress
priority: urgent
type: bug
tags: [storage, api, secrets, security]
created_by: agent
created_at: 2026-08-20T02:16:22Z
position: 11
---

## Notes
Phase 3 audit scoped to Supabase Storage permissions and RLS, server/API route authorization, IDOR vulnerability prevention, and sensitive credential exposure. Must verify business isolation in file storage, proper authorization on all API operations (stamps, rewards, QR, staff, payments, admin), and zero frontend exposure of service-role keys or payment secrets.

## Checklist
- [ ] Inspect Supabase Storage buckets and RLS policies
- [ ] Verify business isolation for logos, card backgrounds, reward images, profile uploads
- [ ] Review all API routes for authorization and IDOR vulnerabilities
- [ ] Search codebase for exposed service-role keys, SMTP credentials, payment secrets
- [ ] Test unauthorized file access and API operations
- [ ] Fix critical/high storage and API security issues
- [ ] Run project error checks

## Acceptance
Storage buckets enforce business isolation, API routes verify authorization server-side without trusting client IDs/roles, and no secrets are exposed in frontend code.