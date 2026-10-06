import type { SupabaseClient } from "@supabase/supabase-js";
import { backupBucketName } from "@/lib/server/backupConfig";
import { createBackupPackage } from "@/lib/server/backupEngine";
import { getBackupStaleTimeoutMs, markStaleBackupJobs } from "@/lib/server/backupLifecycle";

const defaultRetentionDays = 30;
const defaultMinCompletedBackups = 7;
const dailyIntervalMs = 24 * 60 * 60 * 1000;

type BackupJobRow = {
  id: string;
  status: "running" | "completed" | "failed" | "cancelled" | "abandoned";
  package_path: string | null;
  manifest: any;
  completed_at: string | null;
  created_at: string;
};

function getRetentionDays() {
  const value = Number(process.env.BACKUP_RETENTION_DAYS);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : defaultRetentionDays;
}

function getMinCompletedBackups() {
  const value = Number(process.env.BACKUP_RETENTION_MIN_COMPLETED);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : defaultMinCompletedBackups;
}

function getBackupStoragePaths(job: BackupJobRow) {
  const parts = Array.isArray(job.manifest?.package_parts) ? job.manifest.package_parts : [];

  if (parts.length > 0) {
    return parts
      .map((part: any) => part?.storage_path)
      .filter((path: unknown): path is string => typeof path === "string" && path.length > 0);
  }

  return job.package_path ? [job.package_path] : [];
}

async function getRunningBackup(admin: SupabaseClient) {
  const { data, error } = await (admin as any)
    .from("backup_jobs")
    .select("id, started_at, created_at")
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getLatestCompletedBackup(admin: SupabaseClient) {
  const { data, error } = await (admin as any)
    .from("backup_jobs")
    .select("id, completed_at, created_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function applyBackupRetention(admin: SupabaseClient) {
  const retentionDays = getRetentionDays();
  const minCompletedBackups = getMinCompletedBackups();
  const cutoffTime = Date.now() - retentionDays * dailyIntervalMs;

  const { data, error } = await (admin as any)
    .from("backup_jobs")
    .select("id, status, package_path, manifest, completed_at, created_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) throw error;

  const completedBackups = (data || []) as BackupJobRow[];
  if (completedBackups.length <= Math.max(1, minCompletedBackups)) {
    return {
      retention_days: retentionDays,
      min_completed_backups: minCompletedBackups,
      pruned_count: 0,
      preserved_count: completedBackups.length,
    };
  }

  const pruneCandidates = completedBackups
    .slice(minCompletedBackups)
    .filter((backup) => {
      const completedAt = backup.completed_at ? new Date(backup.completed_at).getTime() : 0;
      return completedAt > 0 && completedAt < cutoffTime;
    });

  if (completedBackups.length - pruneCandidates.length < 1) {
    return {
      retention_days: retentionDays,
      min_completed_backups: minCompletedBackups,
      pruned_count: 0,
      preserved_count: completedBackups.length,
    };
  }

  let prunedCount = 0;

  for (const backup of pruneCandidates) {
    const storagePaths = getBackupStoragePaths(backup);

    if (storagePaths.length > 0) {
      const { error: removeError } = await admin.storage
        .from(backupBucketName)
        .remove(storagePaths);

      if (removeError) throw removeError;
    }

    const { error: deleteError } = await (admin as any)
      .from("backup_jobs")
      .delete()
      .eq("id", backup.id)
      .eq("status", "completed");

    if (deleteError) throw deleteError;

    await (admin as any).from("audit_logs").insert({
      admin_user_id: null,
      action: "backup_retention_pruned",
      target_type: "backup_job",
      target_id: backup.id,
      metadata: {
        storage_paths: storagePaths,
        retention_days: retentionDays,
        min_completed_backups: minCompletedBackups,
      },
    });

    prunedCount += 1;
  }

  return {
    retention_days: retentionDays,
    min_completed_backups: minCompletedBackups,
    pruned_count: prunedCount,
    preserved_count: completedBackups.length - prunedCount,
  };
}

export async function runScheduledBackup(admin: SupabaseClient, options: { force?: boolean } = {}) {
  await markStaleBackupJobs(admin);
  const runningBackup = await getRunningBackup(admin);

  if (runningBackup) {
    return {
      status: "skipped_running" as const,
      reason: "A backup job is already running.",
      running_backup_id: runningBackup.id,
    };
  }

  if (!options.force) {
    const latestCompleted = await getLatestCompletedBackup(admin);
    const completedAt = latestCompleted?.completed_at ? new Date(latestCompleted.completed_at).getTime() : 0;

    if (completedAt && Date.now() - completedAt < dailyIntervalMs) {
      return {
        status: "skipped_recent" as const,
        reason: "A completed backup already exists within the last 24 hours.",
        latest_backup_id: latestCompleted.id,
        latest_completed_at: latestCompleted.completed_at,
      };
    }
  }

  try {
    const result = await createBackupPackage(admin, null);
    const retention = await applyBackupRetention(admin);

    await (admin as any).from("audit_logs").insert({
      admin_user_id: null,
      action: "scheduled_backup_completed",
      target_type: "backup_job",
      target_id: result.backupId,
      metadata: {
        package_path: result.packagePath,
        package_size_bytes: result.packageSizeBytes,
        package_sha256: result.packageSha256,
        table_count: result.manifest.tables.length,
        storage_bucket_count: result.manifest.buckets.length,
        package_part_count: result.packageParts.length,
        retention,
      },
    });

    return {
      status: "completed" as const,
      backup: result,
      retention,
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      await markStaleBackupJobs(admin);
      const runningBackup = await getRunningBackup(admin);
      return {
        status: "skipped_running" as const,
        reason: "A backup job is already running.",
        running_backup_id: runningBackup?.id,
        stale_timeout_ms: getBackupStaleTimeoutMs(),
      };
    }

    await (admin as any).from("audit_logs").insert({
      admin_user_id: null,
      action: "scheduled_backup_failed",
      target_type: "backup_job",
      target_id: null,
      metadata: {
        error: error?.message || "Scheduled backup failed",
      },
    });

    throw error;
  }
}