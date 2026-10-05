# Royalty Stamp Backup System Phase 1 Audit

Date: 2026-10-05  
Scope: Audit and proposed architecture only. No production data, schema, RLS, storage, or application behavior was modified.

## 1. Evidence reviewed

### Live Supabase schema and RLS metadata
A live metadata query inspected public tables, columns, foreign keys, RLS enablement, public RLS policies, and Storage bucket summaries.

Key findings:
- All audited public application tables have RLS enabled.
- Core relationship graph is business-centered through `businesses.id`.
- Most business-owned tables cascade on `business_id`.
- `stamp_transactions` intentionally uses `NO ACTION` foreign keys to preserve immutable transaction history.
- Storage buckets currently include:
  - `loyalty-assets`: public, 101 objects, 59,437,686 bytes.
  - `payment-proofs`: private, 2 objects, 438,648 bytes, 5MB limit, allowed MIME types `image/jpeg`, `image/png`, `application/pdf`.

### Auth and privileged server dependencies
Search found server-side usage of `SUPABASE_SERVICE_ROLE_KEY` in existing API routes:
- Admin operations: business approval/deletion, plans, add-ons, business add-ons, contract reminders, registration notifications.
- Auth bootstrap: business/customer registration.
- Staff operations: create/list/remove.
- Business billing/add-on routes.
- Customer email receipt preference and stamp receipt routes.

This confirms backup/restore must be server-side only, never client-side, and must require Super Admin authorization before using service-role access.

### Auth/RLS model
Architecture notes and live RLS policies show authorization depends on:
- `profiles.id = auth.uid()`
- `profiles.is_super_admin` / `profiles.role = 'super_admin'`
- `businesses.owner_id = auth.uid()`
- `business_users.user_id = auth.uid()`
- `customers.user_id = auth.uid()`
- helper functions such as `can_access_business(...)`, `can_access_customer(...)`, `is_super_admin_user(...)`, and `current_user_is_super_admin()`.

Backup access must not bypass this in UI/API design except through a tightly scoped server-side Super Admin operation.

## 2. Tables that must be included

### Tenant and user identity tables
Include:
- `profiles`
- `businesses`
- `business_users`
- `customers`

Reason:
These define users, roles, business ownership, staff assignments, customer identity, and Super Admin flags used by RLS and route authorization.

Auth caveat:
Supabase Auth users live outside the public schema. A full disaster-recovery backup must also account for Auth users through a supported Supabase project-level backup/export process or an admin-auth export mechanism in a later implementation phase. Public table restore alone will not recreate login credentials.

### Loyalty and QR tables
Include:
- `loyalty_programs`
- `customer_loyalty_cards`
- `stamp_transactions`
- `rewards`
- `qr_codes`
- `quick_stamp_qr_tokens`
- `reward_qr_tokens`

Important restore order:
1. `businesses`
2. `customers`
3. `loyalty_programs`
4. `customer_loyalty_cards`
5. `rewards`
6. `stamp_transactions`
7. `qr_codes`
8. token tables

Reason:
Foreign keys connect cards/rewards/stamps/QRs to businesses, customers, and programs. `stamp_transactions` must preserve original IDs and timestamps because it is the immutable stamp history and source of truth.

### Billing, add-ons and payment-preparation tables
Include:
- `subscription_plans`
- `plan_entitlements`
- `subscription_addons`
- `business_addon_subscriptions`
- `subscription_payments`
- `payment_transactions`
- `platform_bank_accounts`

Reason:
These define plans, entitlements, add-ons, approved/pending subscription/payment state, bank transfer instructions, and future payment abstraction records. They must be restored before checking business entitlement access.

### Operational and audit tables
Include:
- `audit_logs`
- `email_logs`
- `contract_reminders`
- `super_admin_notification_reads`
- `api_rate_limits`

Recommended handling:
- `audit_logs`, `email_logs`, and `contract_reminders` should be included for compliance/history.
- `api_rate_limits` can be included for a complete snapshot but should be optional during restore because rate-limit windows are operational state rather than business-critical history.
- `super_admin_notification_reads` can be included for exact UI state restoration but is not required for business data integrity.

### Website CMS/settings tables
Include:
- `website_pages`
- `website_settings`

Reason:
The public marketing site and pricing/footer/FAQ content may depend on these settings.

## 3. Storage buckets and file fields

### Buckets to include
Include all objects and metadata from:
- `loyalty-assets`
- `payment-proofs`

### Public/private handling
- `loyalty-assets` is public and contains loyalty/business/card visual assets.
- `payment-proofs` is private and contains sensitive payment proof uploads. It must be encrypted in backup packages and only downloadable by Super Admins.

### Database fields that reference files/images
The backup manifest should scan and preserve Storage object references from at least:
- `businesses.logo`
- `businesses.cover_image`
- `customers.avatar`
- `profiles.avatar_url`
- `loyalty_programs.reward_image`
- `loyalty_programs.card_logo_url`
- `loyalty_programs.card_bg_image_url`
- `loyalty_programs.card_banner_url`
- `subscription_payments.payment_proof_url`

Restore must preserve the same bucket/object paths when possible so restored database URLs remain valid. If the target project uses different public URL origins, restore must rewrite only the Supabase Storage URL host while preserving bucket and object path.

## 4. Proposed backup architecture

### High-level shape
Use a server-side backup subsystem with:
- Super Admin-only backup management page.
- Server-side API routes for creating, listing, downloading, validating, and eventually restoring backups.
- Service-role Supabase client only inside server-side routes.
- No client-side direct access to backup contents.
- Dedicated private Storage bucket for backup artifacts, for example `system-backups`.

No implementation should be performed until a later phase.

### Backup package format
Each backup should be a portable archive:

`royalty-stamp-backup-{timestamp}-{backup_id}.zip`

Recommended structure:

- `manifest.json`
- `schema/public_tables.json`
- `schema/foreign_keys.json`
- `schema/rls_policies.json`
- `schema/storage_buckets.json`
- `data/{table_name}.jsonl`
- `storage/{bucket}/{object_path}`
- `checksums/sha256sums.json`
- `restore-plan.json`
- `README-restore.txt`

### Manifest fields
`manifest.json` should include:
- `app`: `aruba-royalty-stamp`
- `backup_version`
- `created_at`
- `created_by`
- `environment`
- `supabase_project_ref`
- `schema_fingerprint`
- `tables`
- `buckets`
- `row_counts`
- `object_counts`
- `total_database_bytes`
- `total_storage_bytes`
- `file_list`
- `sha256_checksums`
- `backup_mode`: `full`
- `compatibility`: app version / migration baseline
- `auth_notice`: whether Auth users are included or require Supabase platform restore

### Integrity checks
Every file in the package should have:
- SHA-256 checksum
- byte size
- source table/bucket
- row/object count where applicable

The archive-level checksum should be stored in backup metadata and verified before restore. Restore must reject:
- missing manifest
- unsupported `backup_version`
- checksum mismatch
- missing required table files
- missing required Storage objects referenced by database fields
- incompatible schema fingerprint unless an explicit migration adapter exists

## 5. Scheduling method

Recommended Phase 2 implementation path:
- Use a protected Next.js API route such as `/api/admin/backups/run`.
- Trigger it daily from Vercel Cron.
- The API route must:
  1. Verify a server-only cron secret.
  2. Use service-role access.
  3. Create a backup job record.
  4. Stream table exports and Storage files into an archive.
  5. Upload the package into a private backup bucket.
  6. Record manifest metadata and status.

Alternative:
- Supabase scheduled jobs can trigger Edge Functions, but this project’s supported serverless stack already uses Next.js API routes for privileged admin/server orchestration. Next.js API + Vercel Cron is the smaller supported architecture.

## 6. Backup storage strategy

### Bucket
Create a private bucket in a later phase, for example:
- `system-backups`

### Access model
- No public reads.
- Super Admin-only list/download/delete through server routes.
- Use short-lived signed URLs only after Super Admin authorization.
- Never expose service-role keys to the browser.

### Retention
Recommended default:
- Daily backups retained for 30 days.
- Weekly backups retained for 12 weeks.
- Monthly backups retained for 12 months.
- Manual “pinned” backups retained until explicitly deleted by Super Admin.

### Encryption
Because backup packages include customer data and private payment proofs:
- Prefer server-side encryption where the platform supports it.
- Add application-level encryption for archive payloads in Phase 2 if feasible.
- Store encryption key in environment variables only.
- Never store encryption keys in the database or manifest.

## 7. Restore strategy

### Restore should be a separate, explicit phase
Do not restore directly into production without a staged validation step.

Recommended restore modes:
1. Validation-only
   - Upload backup.
   - Verify manifest, checksums, schema compatibility, object list, and row counts.
   - Produce a restore report.
   - No writes.

2. Dry-run restore into staging
   - Restore to a separate Supabase project or isolated schema.
   - Validate relationship counts and key flows.

3. Controlled production restore
   - Requires Super Admin confirmation.
   - Requires maintenance mode.
   - Requires fresh pre-restore backup.
   - Restores in dependency order.
   - Restores Storage files before/alongside records that reference them.

### Restore order
Recommended table restore order:
1. Configuration/catalog tables:
   - `subscription_plans`
   - `plan_entitlements`
   - `subscription_addons`
   - `platform_bank_accounts`
   - `website_pages`
   - `website_settings`
2. Identity and tenant base:
   - `profiles`
   - `customers`
   - `businesses`
   - `business_users`
3. Programs/cards:
   - `loyalty_programs`
   - `customer_loyalty_cards`
4. Transactional history:
   - `stamp_transactions`
   - `rewards`
   - `qr_codes`
   - `quick_stamp_qr_tokens`
   - `reward_qr_tokens`
5. Billing/payment:
   - `subscription_payments`
   - `business_addon_subscriptions`
   - `payment_transactions`
6. Operational logs/state:
   - `email_logs`
   - `contract_reminders`
   - `audit_logs`
   - `super_admin_notification_reads`
   - `api_rate_limits`

### ID preservation
Restore must insert explicit IDs from the backup, not generate new IDs, otherwise foreign keys and Storage references will break.

### Storage restore
Storage restore should:
- Create missing buckets with matching public/private settings and MIME/size limits.
- Upload files to original object paths.
- Verify object checksums after upload.
- Rebuild signed/private access only through existing app logic, not by making private buckets public.

## 8. Security requirements

Backup APIs must:
- Require authenticated Super Admin user.
- Use existing `profiles.is_super_admin` / `profiles.role = 'super_admin'` checks.
- Use service-role access only server-side.
- Log backup creation/download/validation/restore attempts to `audit_logs`.
- Rate-limit backup creation/download attempts.
- Avoid returning raw database dumps in JSON responses.
- Stream package download only after authorization.
- Never rely on frontend-only checks.
- Never allow business owners, staff, or customers to access full backups.

Private payment proofs and customer PII require special handling:
- Include them in complete backups.
- Keep them encrypted/private.
- Redact them from UI preview/manifest summaries.

## 9. Compatibility and corruption detection

Before restore:
- Verify archive checksum.
- Verify each file checksum.
- Verify manifest version.
- Verify required tables and bucket files are present.
- Verify schema fingerprint compatibility.
- Verify all referenced Storage files exist in the archive or are explicitly marked external.
- Verify foreign key graph can be satisfied.
- Verify row counts and object counts.
- Reject restore if a backup targets a newer incompatible app/schema version.

## 10. Non-goals for Phase 1

Not implemented in this phase:
- Backup tables.
- Backup API routes.
- Backup Storage bucket.
- Scheduled job.
- Restore UI.
- Restore execution.
- Schema or RLS changes.
- Production data changes.

## 11. Recommended next phase

Phase 2 should implement only backup creation and listing:
- Create private `system-backups` bucket.
- Create backup job metadata table with Super Admin RLS.
- Add Super Admin-only backup API routes.
- Implement daily Vercel Cron backup creation.
- Export public tables and Storage files into a manifest/checksummed archive.
- Provide download after authorization.
- Do not implement restore until backup validation and package generation are proven.