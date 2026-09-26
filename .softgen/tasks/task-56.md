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
Fix the Business payment-proof upload failure: "Proof upload failed: Bucket not found." Investigation found the application references the exact Storage bucket `payment-proofs` in Business Billing and Super Admin proof viewing, and `subscription_payments.payment_proof_url` is the existing database field for linking proof files to payment requests. The fix creates/verifies the dedicated private `payment-proofs` bucket, keeps it non-public, limits files to JPG/JPEG, PNG, and PDF up to 5MB, and adds storage policies so Business Owners can upload/view/update only paths under their own business ID while Super Admins can view proofs for review. The Business UI stores the private storage path, not a public URL, and signed URLs are used for viewing. A service-role smoke test confirmed a real PNG can be uploaded, listed, signed, and removed from the `payment-proofs` bucket. The policy migration was updated to be non-destructive and idempotent.

## Checklist
- [x] Inspect current Supabase Storage buckets and payment-proof storage policies
- [x] Inspect application bucket references and proof upload/view code paths
- [x] Determine whether the issue is wrong bucket name, missing bucket, wrong environment, path, or policy
- [x] Fix only the payment-proof bucket/path/policies needed for secure upload and signed viewing
- [x] Verify real upload target bucket exists and supports JPG, PNG, and PDF within configured limits
- [x] Verify payment request references the uploaded file path and not a public URL
- [x] Verify real storage upload, listing, signed URL creation, and cleanup in the correct bucket
- [ ] Verify Business owner and Super Admin access while blocking cross-business access
- [ ] Run project validation and targeted storage regression checks

## Acceptance
Business payment-proof uploads no longer fail with "Bucket not found."
Uploaded proofs are stored in the correct private bucket and linked to the exact payment request.
Super Admin can review proofs via authorized access while other businesses cannot access them.