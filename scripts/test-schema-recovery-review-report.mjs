import assert from "node:assert/strict";
import fs from "node:fs";

const apiSource = fs.readFileSync("src/pages/api/admin/backups/schema-recovery-review.ts", "utf8");
const reportSource = fs.readFileSync("src/lib/server/schemaRecoveryReviewReport.ts", "utf8");
const adminSource = fs.readFileSync("src/pages/admin/index.tsx", "utf8");

assert.match(apiSource, /req\.method !== "GET"/);
assert.match(apiSource, /await requireSuperAdmin\(req\)/);
assert.match(apiSource, /buildSchemaRecoveryReviewReport/);
assert.match(apiSource, /\.select\("id, status, backup_version, package_path, package_sha256, package_size_bytes, manifest, error_message, started_at, completed_at, created_at"\)/);

const authIndex = apiSource.indexOf("await requireSuperAdmin(req)");
const clientIndex = apiSource.indexOf("createServiceClient()");
assert.ok(authIndex >= 0 && clientIndex > authIndex, "Superadmin authorization must happen before the service client is used.");

for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete(", ".rpc(", ".download(", "verifyStoredBackupPackage", "restore-upload", "restoreBackup"]) {
  assert.equal(apiSource.includes(forbidden), false, `Review API must not contain side-effect helper or mutation: ${forbidden}`);
}

assert.match(reportSource, /schemaRecoveryReviewReportVersion/);
assert.match(reportSource, /buildDatabaseSchemaRecoveryInventory/);
assert.match(reportSource, /buildRestorePointInventory/);
assert.match(reportSource, /explicit/);
assert.match(reportSource, /inferred/);
assert.match(reportSource, /unknown/);
assert.match(reportSource, /missing_definitions/);
assert.match(reportSource, /unsupported_object_types/);
assert.match(reportSource, /cycles/);
assert.match(reportSource, /full_project_recovery: "blocked"/);
assert.match(reportSource, /restore_writes: "blocked"/);
assert.match(reportSource, /verifyStoredBackupPackage was intentionally not called/);

for (const falseClaim of ["live_database_schema_captured: true", "complete_schema_recovery_supported: true", "restore_writes: \"supported\"", "full_project_recovery: \"verified\""]) {
  assert.equal(reportSource.includes(falseClaim), false, `Report must not claim unsupported recovery state: ${falseClaim}`);
}

assert.match(adminSource, /Schema Recovery Review/);
assert.match(adminSource, /\/api\/admin\/backups\/schema-recovery-review/);
assert.match(adminSource, /loadingSchemaRecoveryReview/);
assert.match(adminSource, /schemaRecoveryReviewError/);
assert.match(adminSource, /Repository evidence only/);
assert.match(adminSource, /Restore writes remain blocked/);

console.log("schema recovery review report tests passed");