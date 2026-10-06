import type { SupabaseClient } from "@supabase/supabase-js";
import { backupBucketName } from "@/lib/server/backupConfig";

const defaultStaleTimeoutMs = 60 * 60 * 1000;

export class BackupCancelledError extends Error {
  constructor(message = "Backup job was cancelled.") {
    super(message);
    this.name = "BackupCancelledError";
  }
}

type BackupJobForCleanup = {
  id: string;
  status: string;
  package_path: string | null;
  manifest: any;
};

function getStaleTimeoutMs() {
  const minutes = Number(process.env.BACKUP_STALE_TIMEOUT_MINUTES);
  return Number.isFinite(minutes) && minutes >= 15 ? Math.floor(minutes * 60 * 1000) : defaultStaleTimeoutMs;
}

export function getBackupStaleTimeoutMs() {
  return getStaleTimeoutMs();
}

function getManifestStoragePaths(manifest: any, packagePath: string | null) {
  const parts = Array.isArray(manifest?.package_parts) ? manifest.package_parts : [];
  const partPaths = parts
    .map((part: any) => part?.storage_path)
    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0);

  if (partPaths.length > 0) return partPaths;
  return packagePath ? [packagePath] : [];
}

async function listStoragePathsByPrefix(admin: SupabaseClient, backupId: string) {
  const { data, error } = await admin.storage.from(backupBucketName).list(backupId, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    return [];
  }

  return (data || [])
    .filter((item) => Boolean(item.name))
    .map((item) => `${backupId}/${item.name}`);
}

async function removeStoragePaths(admin: SupabaseClient, paths: string[]) {
  const uniquePaths = [...new Set(paths.filter((value) => typeof value === "string" && value.length > 0))];
  if (uniquePaths.length === 0) return { removed_paths: [] as string[] };

  const { error } = await admin.storage.from(backupBucketName).remove(uniquePaths);
  if (error) throw error;

  return { removed_paths: uniquePaths };
}

export async function markJobHeartbeat(admin: SupabaseClient, backupId: string) {
  const { error } = await (admin as any)
    .from("backup_jobs")
    .update({ heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", backupId)
    .eq("status", "running");

  if (error) throw error;
}

export async function assertBackupCanContinue(admin: SupabaseClient, backupId: string) {
  const { data, error } = await (admin as any)
    .from("backup_jobs")
    .select("status, cancellation_requested_at")
    .eq("id", backupId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== "running" || data.cancellation_requested_at) {
    throw new BackupCancelledError();
  }
}

export async function cleanupBackupArtifacts(admin: SupabaseClient, backup: BackupJobForCleanup) {
  if (backup.status === "completed") {
    return {
      skipped: true,
      reason: "Completed backups are not cleaned by lifecycle cleanup.",
      removed_paths: [] as string[],
    };
  }

  const manifestPaths = getManifestStoragePaths(backup.manifest, backup.package_path);
  const prefixPaths = await listStoragePathsByPrefix(admin, backup.id);
  const removed = await removeStoragePaths(admin, [...manifestPaths, ...prefixPaths]);

  const { error } = await (admin as any)
    .from("backup_jobs")
    .update({ cleanup_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", backup.id)
    .neq("status", "completed");

  if (error) throw error;

  return {
    skipped: false,
    removed_paths: removed.removed_paths,
  };
}

export async function markStaleBackupJobs(admin: SupabaseClient) {
  const cutoff = new Date(Date.now() - getStaleTimeoutMs()).toISOString();

  const { data, error } = await (admin as any)
    .from("backup_jobs")
    .select("id, status, package_path, manifest, heartbeat_at, started_at")
    .eq("status", "running")
    .or(`heartbeat_at.lt.${cutoff},and(heartbeat_at.is.null,started_at.lt.${cutoff})`);

  if (error) throw error;

  const staleJobs = (data || []) as Array<BackupJobForCleanup & { heartbeat_at: string | null; started_at: string | null }>;
  const results = [];

  for (const job of staleJobs) {
    let updateQuery = (admin as any)
      .from("backup_jobs")
      .update({
        status: "abandoned",
        error_message: "Backup job heartbeat timed out and was marked abandoned.",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "running");

    updateQuery = job.heartbeat_at
      ? updateQuery.eq("heartbeat_at", job.heartbeat_at)
      : updateQuery.is("heartbeat_at", null).lt("started_at", cutoff);

    const { data: updatedRows, error: updateError } = await updateQuery
      .select("id, status, package_path, manifest")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedRows) continue;

    const cleanup = await cleanupBackupArtifacts(admin, { ...updatedRows, status: "abandoned" });

    await (admin as any).from("audit_logs").insert({
      admin_user_id: null,
      action: "backup_job_abandoned",
      target_type: "backup_job",
      target_id: job.id,
      metadata: {
        stale_cutoff: cutoff,
        stale_timeout_ms: getStaleTimeoutMs(),
        previous_heartbeat_at: job.heartbeat_at,
        previous_started_at: job.started_at,
        cleanup,
      },
    });

    results.push({ id: job.id, cleanup });
  }

  return {
    stale_timeout_ms: getStaleTimeoutMs(),
    abandoned_count: results.length,
    jobs: results,
  };
}

export async function cancelBackupJob(admin: SupabaseClient, backupId: string, adminUserId: string) {
  const { data: backup, error: readError } = await (admin as any)
    .from("backup_jobs")
    .select("id, status, package_path, manifest")
    .eq("id", backupId)
    .maybeSingle();

  if (readError) throw readError;
  if (!backup) throw new Error("Backup not found.");
  if (backup.status !== "running") {
    throw new Error(`Only running backups can be cancelled. Current status: ${backup.status}.`);
  }

  const now = new Date().toISOString();
  const { error: updateError } = await (admin as any)
    .from("backup_jobs")
    .update({
      status: "cancelled",
      cancellation_requested_at: now,
      cancelled_at: now,
      completed_at: now,
      error_message: "Backup cancelled by Super Admin.",
      updated_at: now,
    })
    .eq("id", backupId)
    .eq("status", "running");

  if (updateError) throw updateError;

  const cleanup = await cleanupBackupArtifacts(admin, { ...backup, status: "cancelled" });

  await (admin as any).from("audit_logs").insert({
    admin_user_id: adminUserId,
    action: "backup_job_cancelled",
    target_type: "backup_job",
    target_id: backupId,
    metadata: {
      cleanup,
    },
  });

  return {
    backup_id: backupId,
    status: "cancelled",
    cleanup,
  };
}