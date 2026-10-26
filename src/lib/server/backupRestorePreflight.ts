import fs from "fs";
import { requiredBuckets, requiredTables } from "@/lib/server/backupConfig";
import type { ExtractedBackupArchive } from "@/lib/server/backupRestoreArchive";
import type { BackupValidationReport } from "@/lib/server/backupValidator";
import type { RestoreMode } from "@/lib/server/backupRestoreEngine";

export type RestorePreflightStatus = "passed" | "warning" | "blocked" | "not_checked";

export type RestoreDestinationConfirmation = {
  destinationLabel?: string;
  destinationProjectRef?: string;
  restoreWritesConfirmed?: boolean;
};

export type RestorePreflightCheck = {
  name: string;
  status: RestorePreflightStatus;
  details: string;
};

export type RestorePreflightTableAnalysis = {
  table: string;
  primary_key: string;
  records_seen: number;
  duplicate_primary_keys: string[];
  missing_reference_count: number;
};

export type RestorePreflightStorageInventory = {
  bucket: string;
  files_seen: number;
  bytes_seen: number;
  missing_files_in_archive: number;
};

export type BackupRestorePreflightReport = {
  restore_mode: RestoreMode;
  destination_label?: string;
  destination_project_ref_confirmed: boolean;
  configured_project_ref_match?: boolean;
  dependency_order: string[];
  table_analysis: RestorePreflightTableAnalysis[];
  storage_inventory: RestorePreflightStorageInventory[];
  checks: RestorePreflightCheck[];
  destructive_write_blockers: string[];
  warnings: string[];
};

const restoreWriteConfirmationPhrase = "CONFIRM_DESTINATION_RESTORE_WRITES";

const primaryKeyByTable: Record<string, string> = {
  website_pages: "slug",
  website_settings: "key",
  reward_qr_tokens: "token",
};

const tableReferences = [
  { sourceTable: "businesses", sourceColumn: "owner_id", targetTable: "profiles", targetColumn: "id" },
  { sourceTable: "business_users", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "business_users", sourceColumn: "user_id", targetTable: "profiles", targetColumn: "id" },
  { sourceTable: "customers", sourceColumn: "user_id", targetTable: "profiles", targetColumn: "id" },
  { sourceTable: "loyalty_programs", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "customer_loyalty_cards", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "customer_loyalty_cards", sourceColumn: "customer_id", targetTable: "customers", targetColumn: "id" },
  { sourceTable: "customer_loyalty_cards", sourceColumn: "program_id", targetTable: "loyalty_programs", targetColumn: "id" },
  { sourceTable: "stamp_transactions", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "stamp_transactions", sourceColumn: "customer_id", targetTable: "customers", targetColumn: "id" },
  { sourceTable: "stamp_transactions", sourceColumn: "program_id", targetTable: "loyalty_programs", targetColumn: "id" },
  { sourceTable: "stamp_transactions", sourceColumn: "card_id", targetTable: "customer_loyalty_cards", targetColumn: "id" },
  { sourceTable: "rewards", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "rewards", sourceColumn: "customer_id", targetTable: "customers", targetColumn: "id" },
  { sourceTable: "rewards", sourceColumn: "program_id", targetTable: "loyalty_programs", targetColumn: "id" },
  { sourceTable: "qr_codes", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "qr_codes", sourceColumn: "program_id", targetTable: "loyalty_programs", targetColumn: "id" },
  { sourceTable: "quick_stamp_qr_tokens", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "reward_qr_tokens", sourceColumn: "reward_id", targetTable: "rewards", targetColumn: "id" },
  { sourceTable: "subscription_payments", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "subscription_payments", sourceColumn: "plan_id", targetTable: "subscription_plans", targetColumn: "id" },
  { sourceTable: "business_addon_subscriptions", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
  { sourceTable: "business_addon_subscriptions", sourceColumn: "addon_id", targetTable: "subscription_addons", targetColumn: "id" },
  { sourceTable: "payment_transactions", sourceColumn: "business_id", targetTable: "businesses", targetColumn: "id" },
];

function getPrimaryKey(table: string) {
  return primaryKeyByTable[table] || "id";
}

function getStringValue(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function addCheck(checks: RestorePreflightCheck[], status: RestorePreflightStatus, name: string, details: string) {
  checks.push({ name, status, details });
}

async function readRows(filePath: string) {
  const content = await fs.promises.readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function readArchiveTableRows(archive: ExtractedBackupArchive) {
  const rowsByTable = new Map<string, Record<string, unknown>[]>();

  for (const table of archive.manifest.tables || []) {
    const entry = archive.entries.get(table.path);
    if (!entry) {
      rowsByTable.set(table.table, []);
      continue;
    }

    rowsByTable.set(table.table, await readRows(entry.filePath));
  }

  return rowsByTable;
}

function buildTableAnalysis(rowsByTable: Map<string, Record<string, unknown>[]>) {
  return Array.from(rowsByTable.entries()).map(([table, rows]) => {
    const primaryKey = getPrimaryKey(table);
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const row of rows) {
      const value = getStringValue(row, primaryKey);
      if (!value) continue;
      if (seen.has(value)) duplicates.add(value);
      seen.add(value);
    }

    return {
      table,
      primary_key: primaryKey,
      records_seen: rows.length,
      duplicate_primary_keys: Array.from(duplicates).slice(0, 25),
      missing_reference_count: 0,
    };
  });
}

function buildReferenceIndexes(rowsByTable: Map<string, Record<string, unknown>[]>) {
  const indexes = new Map<string, Set<string>>();

  for (const [table, rows] of rowsByTable.entries()) {
    const primaryKey = getPrimaryKey(table);
    indexes.set(`${table}.${primaryKey}`, new Set(rows.map((row) => getStringValue(row, primaryKey)).filter(Boolean)));
  }

  for (const reference of tableReferences) {
    const key = `${reference.targetTable}.${reference.targetColumn}`;
    if (indexes.has(key)) continue;
    const rows = rowsByTable.get(reference.targetTable) || [];
    indexes.set(key, new Set(rows.map((row) => getStringValue(row, reference.targetColumn)).filter(Boolean)));
  }

  return indexes;
}

function analyzeReferences(rowsByTable: Map<string, Record<string, unknown>[]>, tableAnalysis: RestorePreflightTableAnalysis[], checks: RestorePreflightCheck[], warnings: string[]) {
  const indexes = buildReferenceIndexes(rowsByTable);
  const analysisByTable = new Map(tableAnalysis.map((item) => [item.table, item]));

  for (const reference of tableReferences) {
    const sourceRows = rowsByTable.get(reference.sourceTable);
    const targetRows = rowsByTable.get(reference.targetTable);

    if (!sourceRows || !targetRows) continue;

    const targetValues = indexes.get(`${reference.targetTable}.${reference.targetColumn}`) || new Set<string>();
    let checked = 0;
    const missing = new Set<string>();

    for (const row of sourceRows) {
      const value = getStringValue(row, reference.sourceColumn);
      if (!value) continue;
      checked += 1;
      if (!targetValues.has(value)) missing.add(value);
    }

    const analysis = analysisByTable.get(reference.sourceTable);
    if (analysis) analysis.missing_reference_count += missing.size;

    if (missing.size > 0) {
      const message = `${reference.sourceTable}.${reference.sourceColumn} has ${missing.size} value(s) not found in ${reference.targetTable}.${reference.targetColumn}.`;
      warnings.push(message);
      addCheck(checks, "warning", "Archive foreign-key/reference check", `${message} Sample: ${Array.from(missing).slice(0, 5).join(", ")}`);
    } else {
      addCheck(checks, "passed", "Archive foreign-key/reference check", `${reference.sourceTable}.${reference.sourceColumn} references ${reference.targetTable}.${reference.targetColumn} for ${checked} populated value(s).`);
    }
  }
}

function buildStorageInventory(archive: ExtractedBackupArchive) {
  return (archive.manifest.buckets || [])
    .filter((bucket) => requiredBuckets.includes(bucket.bucket))
    .map((bucket) => {
      const missingFiles = (bucket.objects || []).filter((object) => !archive.entries.has(object.archive_path)).length;

      return {
        bucket: bucket.bucket,
        files_seen: bucket.object_count || 0,
        bytes_seen: bucket.total_bytes || 0,
        missing_files_in_archive: missingFiles,
      };
    });
}

function getConfiguredSupabaseProjectRef() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return null;

  try {
    const host = new URL(rawUrl).hostname;
    if (!host.endsWith(".supabase.co")) return null;
    return host.split(".")[0] || null;
  } catch {
    return null;
  }
}

export function assertRestoreDestinationSafety(mode: RestoreMode, destination?: RestoreDestinationConfirmation) {
  if (mode !== "restore") return;

  const destinationProjectRef = String(destination?.destinationProjectRef || "").trim();
  const destinationLabel = String(destination?.destinationLabel || "").trim();

  if (!destinationProjectRef || !destinationLabel) {
    throw new Error("Restore writes require explicit destination project reference and destination label confirmation.");
  }

  if (!destination?.restoreWritesConfirmed) {
    throw new Error(`Restore writes require exact destination write confirmation: ${restoreWriteConfirmationPhrase}`);
  }

  const configuredProjectRef = getConfiguredSupabaseProjectRef();
  if (configuredProjectRef && destinationProjectRef !== configuredProjectRef) {
    throw new Error("Restore destination confirmation does not match the configured Supabase project reference.");
  }
}

export function isRestoreWriteConfirmation(value: string) {
  return value === restoreWriteConfirmationPhrase;
}

export async function buildRestorePreflightReport(params: {
  archive: ExtractedBackupArchive;
  validation: BackupValidationReport;
  mode: RestoreMode;
  destination?: RestoreDestinationConfirmation;
}): Promise<BackupRestorePreflightReport> {
  const { archive, validation, mode, destination } = params;
  const checks: RestorePreflightCheck[] = [];
  const warnings = [...validation.warnings];
  const destructiveWriteBlockers: string[] = [];
  const configuredProjectRef = getConfiguredSupabaseProjectRef();
  const destinationProjectRef = String(destination?.destinationProjectRef || "").trim();
  const destinationLabel = String(destination?.destinationLabel || "").trim();

  const rowsByTable = await readArchiveTableRows(archive);
  const tableAnalysis = buildTableAnalysis(rowsByTable);

  const duplicateTables = tableAnalysis.filter((table) => table.duplicate_primary_keys.length > 0);
  if (duplicateTables.length > 0) {
    const message = `Archive contains duplicate primary keys in ${duplicateTables.map((table) => table.table).join(", ")}.`;
    destructiveWriteBlockers.push(message);
    addCheck(checks, "blocked", "Archive duplicate/conflict check", message);
  } else {
    addCheck(checks, "passed", "Archive duplicate/conflict check", "No duplicate primary keys were found inside the archive exports.");
  }

  analyzeReferences(rowsByTable, tableAnalysis, checks, warnings);

  addCheck(checks, "not_checked", "Destination duplicate/conflict check", "Existing destination row conflicts are not checked without an explicitly authorized destination database read.");
  addCheck(checks, "warning", "Authentication user compatibility", "Supabase Auth users are not included in the public table archive; restore must verify or reconcile missing authentication users before production use.");

  const missingTables = requiredTables.filter((table) => !rowsByTable.has(table));
  if (missingTables.length > 0) {
    const message = `Required tables missing from extracted archive: ${missingTables.join(", ")}.`;
    destructiveWriteBlockers.push(message);
    addCheck(checks, "blocked", "Dependency order coverage", message);
  } else {
    addCheck(checks, "passed", "Dependency order coverage", `${requiredTables.length} required tables are available for dependency-ordered restore.`);
  }

  const storageInventory = buildStorageInventory(archive);
  const missingStorageFiles = storageInventory.reduce((sum, bucket) => sum + bucket.missing_files_in_archive, 0);
  if (missingStorageFiles > 0) {
    const message = `${missingStorageFiles} required Storage file(s) listed in the manifest are missing from the extracted archive.`;
    destructiveWriteBlockers.push(message);
    addCheck(checks, "blocked", "Storage inventory", message);
  } else {
    addCheck(checks, "passed", "Storage inventory", `${storageInventory.reduce((sum, bucket) => sum + bucket.files_seen, 0)} Storage file(s) are inventoried for required buckets.`);
  }

  if (mode === "restore") {
    if (!destinationProjectRef || !destinationLabel) {
      destructiveWriteBlockers.push("Restore writes require explicit destination project reference and destination label.");
    }

    if (!destination?.restoreWritesConfirmed) {
      destructiveWriteBlockers.push(`Restore writes require exact destination confirmation phrase: ${restoreWriteConfirmationPhrase}.`);
    }

    if (configuredProjectRef && destinationProjectRef && configuredProjectRef !== destinationProjectRef) {
      destructiveWriteBlockers.push("Confirmed destination project reference does not match the configured Supabase project reference.");
    }
  }

  return {
    restore_mode: mode,
    destination_label: destinationLabel || undefined,
    destination_project_ref_confirmed: Boolean(destinationProjectRef),
    configured_project_ref_match: configuredProjectRef && destinationProjectRef ? configuredProjectRef === destinationProjectRef : undefined,
    dependency_order: requiredTables.filter((table) => rowsByTable.has(table)),
    table_analysis: tableAnalysis,
    storage_inventory: storageInventory,
    checks,
    destructive_write_blockers: destructiveWriteBlockers,
    warnings,
  };
}