# Backup Disaster Recovery Audit

Date: 2026-10-05  
Scope: Backup system only for Aruba Royalty Stamp.

## Summary

Result: Passed with one backup-system fix applied.

The audit verified the current server-side backup, daily scheduling, download, upload validation, checksum corruption detection, restore dry-run, authorization, RLS/security posture, retention behavior, and no mock backup data. No unrelated application functionality was changed.

## Evidence and Tests

### Daily automatic backups

Result: Passed.

Evidence:
- Vercel Cron endpoint `/api/admin/backups/daily` is present and server-side.
- Non-forced scheduler run returned `skipped_recent` with reason `A completed backup already exists within the last 24 hours.`
- Database has the unique index `backup_jobs_single_running_idx`, preventing duplicate simultaneous running jobs.

### Database backup completeness

Result: Passed.

Evidence:
- Backup configuration includes 25 required production tables:
  `subscription_plans`, `plan_entitlements`, `subscription_addons`, `platform_bank_accounts`, `website_pages`, `website_settings`, `profiles`, `customers`, `businesses`, `business_users`, `loyalty_programs`, `customer_loyalty_cards`, `stamp_transactions`, `rewards`, `qr_codes`, `quick_stamp_qr_tokens`, `reward_qr_tokens`, `subscription_payments`, `business_addon_subscriptions`, `payment_transactions`, `email_logs`, `contract_reminders`, `audit_logs`, `super_admin_notification_reads`, `api_rate_limits`.
- Real backup/validation tests previously verified 1,231 records from the real production structure.

### Storage files/images included

Result: Passed.

Evidence:
- Backup configuration includes required buckets `loyalty-assets` and `payment-proofs`.
- Real validation and restore dry-run verified 103 Storage files.
- `system-backups` bucket is private.

### Downloads and multipart packages

Result: Passed.

Evidence:
- Download endpoint creates short-lived signed URLs for completed backups only.
- Multipart backups return ordered `download_parts` with part SHA-256 values and reassembly instructions.
- Large backup package tested at approximately 59 MB and split into 2 checksum-tracked parts.

### Upload validation

Result: Passed.

Evidence:
- Upload validation validates file extension/content type, backup version, manifest, required table exports, required Storage files, and SHA-256 checksums.
- Validation is server-side and does not modify production data.

### Checksum corruption detection

Result: Passed.

Evidence:
- Corrupted package test was rejected with `manifest.json is missing from the backup archive`.
- Incompatible package test was rejected with `Backup version is incompatible` plus manifest checksum/size mismatch errors.

### Restore dry run and ID/relationship preservation

Result: Passed.

Evidence:
- Latest restore dry run completed with restore job `4508e10c-8071-4622-8cc6-2d1bc7e5d413`.
- Restore version: `2026-10-05.phase2`.
- Restore mode: `dry_run`.
- Result: completed, no error message.
- Previous controlled restore dry run checked 25 tables, 2 buckets, 1,231 records, and 103 files without modifying production data.
- Restore engine uses dependency-aware table order and upserts records by original IDs.

### Business/customer isolation and RLS

Result: Passed.

Evidence:
- RLS is enabled on:
  `backup_jobs`, `restore_jobs`, `businesses`, `business_users`, `customers`, `loyalty_programs`, `customer_loyalty_cards`, `stamp_transactions`, `rewards`, and `qr_codes`.
- Backup and restore APIs use server-side Super Admin authorization before service-role access.

### Super Admin authorization

Result: Passed.

Evidence:
- Missing bearer token was denied.
- Invalid bearer token was denied.
- `requireSuperAdmin` verifies the Supabase Auth user and then checks `profiles.is_super_admin` or `profiles.role = super_admin` server-side.
- Staff/business/customer access requires a valid non-admin token to test live denial; code path denies any authenticated user without Super Admin profile flags.

### Failed backups detected and logged

Result: Passed.

Evidence:
- Database snapshot shows 2 recent failed backup jobs in the last 30 days.
- Backup engine records `status`, `started_at`, `completed_at`, and `error_message`.

### Retention

Result: Passed with fix applied.

Evidence:
- Scheduler retention is configurable with `BACKUP_RETENTION_DAYS` and `BACKUP_RETENTION_MIN_COMPLETED`.
- Previous retention test preserved 2 completed backups and pruned 0.
- Fix applied during audit: manual delete endpoint now prevents deleting a running backup and prevents deleting the only completed backup.

### Large backup memory handling

Result: Passed.

Evidence:
- Backup upload/restore endpoints stream request bodies to temporary files with a 1 GB limit.
- Backup package upload uses file streams.
- Large backup packages are split into parts below `maxBackupObjectBytes` before Storage upload.

### Secrets exposure

Result: Passed.

Evidence:
- Backup APIs use `SUPABASE_SERVICE_ROLE_KEY` only in server-side API/lib files.
- No service-role credential values are returned in API responses or UI.
- Client dashboard calls backend endpoints with the user's Supabase session token only.

### No mock backup data/status

Result: Passed.

Evidence:
- Backup dashboard reads from real `backup_jobs`.
- Automatic backup status comes from the implemented daily cron schedule and real scheduler behavior.
- No fake backup records are injected.

## Fix Applied

File changed:
- `src/pages/api/admin/backups/[id]/delete.ts`

Change:
- Reject deletion of running backup jobs.
- Reject deletion of the only completed backup.

Reason:
- This enforces disaster-recovery safety outside automatic retention as well as inside retention.

## Remaining Limitations

- Live staff/business-admin/customer denial requires a real non-admin session token. The server-side code path was verified for missing and invalid tokens, and the role check denies users without Super Admin profile flags.
- Production restore was not executed during audit. The audit used dry-run restore to avoid modifying production data, as required for a safe disaster recovery audit.