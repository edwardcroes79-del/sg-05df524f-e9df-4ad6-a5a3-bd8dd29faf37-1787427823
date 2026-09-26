---
title: Payment Proof Storage Bucket Fix
status: in_progress
priority: urgent
type: bug
tags: [storage, billing, payment-proof, security]
created_by: agent
created_at: 2026-09-26T20:57:30Z
position: 56
---

## Notes
Fix the Business payment-proof upload failure: "Proof upload failed: Bucket not found." First investigate actual Supabase Storage buckets and policies, then determine whether the app references the wrong bucket or the dedicated private payment-proof bucket is missing. Do not change billing architecture, create duplicate storage systems, delete objects, modify unrelated buckets, expose service-role credentials, or use public URLs. Payment proofs must remain private and linked to the exact business payment request.

## Checklist
- [ ] Inspect current Supabase Storage buckets and payment-proof storage policies
- [ ] Inspect application bucket references and proof upload/view code paths
- [ ] Determine whether the issue is wrong bucket name, missing bucket, wrong environment, path, or policy
- [ ] Fix only the payment-proof bucket/path/policies needed for secure upload and signed viewing
- [ ] Verify real upload target bucket exists and supports JPG, PNG, and PDF within configured limits
- [ ] Verify payment request references the uploaded file path and not a public URL
- [ ] Verify Business owner and Super Admin access while blocking cross-business access
- [ ] Run project validation and targeted storage regression checks

## Acceptance
Business payment-proof uploads no longer fail with "Bucket not found."
Uploaded proofs are stored in the correct private bucket and linked to the exact payment request.
Super Admin can review proofs via authorized access while other businesses cannot access them.