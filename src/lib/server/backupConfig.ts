export type BackupFileEntry = {
  path: string;
  size: number;
  sha256: string;
  source_type: "database" | "storage" | "metadata";
  source_name: string;
};

export type BackupPackagePart = {
  part_number: number;
  storage_path: string;
  size: number;
  sha256: string;
};

export type TableManifest = {
  table: string;
  path: string;
  record_count: number;
  bytes: number;
  sha256: string;
};

export type StorageObjectManifest = {
  bucket: string;
  object_path: string;
  archive_path: string;
  bytes: number;
  sha256: string;
  content_type?: string;
  updated_at?: string;
};

export type BackupManifest = {
  app: "aruba-royalty-stamp";
  backup_version: string;
  backup_id: string;
  created_at: string;
  created_by: string;
  backup_mode: "full";
  package_format: "tar.gz";
  tables: TableManifest[];
  buckets: Array<{
    bucket: string;
    object_count: number;
    total_bytes: number;
    objects: StorageObjectManifest[];
  }>;
  row_counts: Record<string, number>;
  object_counts: Record<string, number>;
  total_database_bytes: number;
  total_storage_bytes: number;
  file_list: BackupFileEntry[];
  sha256_checksums: Record<string, string>;
  package_parts?: BackupPackagePart[];
  auth_notice: string;
};

export const backupVersion = "2026-10-05.phase2";
export const tablePageSize = 1000;
export const backupBucketName = "system-backups";
export const maxBackupObjectBytes = 45 * 1024 * 1024;

export const requiredTables = [
  "subscription_plans",
  "plan_entitlements",
  "subscription_addons",
  "platform_bank_accounts",
  "website_pages",
  "website_settings",
  "profiles",
  "customers",
  "businesses",
  "business_users",
  "loyalty_programs",
  "customer_loyalty_cards",
  "stamp_transactions",
  "rewards",
  "qr_codes",
  "quick_stamp_qr_tokens",
  "reward_qr_tokens",
  "subscription_payments",
  "business_addon_subscriptions",
  "payment_transactions",
  "email_logs",
  "contract_reminders",
  "audit_logs",
  "super_admin_notification_reads",
  "api_rate_limits",
];

export const requiredBuckets = ["loyalty-assets", "payment-proofs"];