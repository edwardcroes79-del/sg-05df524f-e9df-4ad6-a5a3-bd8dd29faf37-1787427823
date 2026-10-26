import assert from "node:assert/strict";
import fs from "node:fs";

const exportSource = fs.readFileSync("src/lib/server/recoveryReadinessExport.ts", "utf8");
const apiSource = fs.readFileSync("src/pages/api/admin/backups/recovery-readiness-report.ts", "utf8");
const adminSource = fs.readFileSync("src/pages/admin/index.tsx", "utf8");

assert.match(exportSource, /recoveryReadinessExportVersion/);
assert.match(exportSource, /report_format_version/);
assert.match(exportSource, /explicit_disclaimer/);
assert.match(exportSource, /not a backup, restore point, archive validation, restore authorization/);
assert.match(exportSource, /current_recovery_classification/);
assert.match(exportSource, /best_effort_export/);
assert.match(exportSource, /blocked_for_full_project_recovery/);
assert.match(exportSource, /provider_pitr_status: "not_verified"/);
assert.match(exportSource, /prioritized_recovery_roadmap/);
assert.match(exportSource, /external_provider_capabilities_required/);
assert.match(exportSource, /PDF export is not implemented/);

for (const forbiddenClaim of [
  "full_project_recoverable_restore_point\";",
  "restore_writes: \"supported\"",
  "arbitrary_historical_datetime_recovery: \"verified\"",
  "provider_pitr_status: \"verified\"",
]) {
  assert.equal(exportSource.includes(forbiddenClaim), false, `Export must not claim unsupported readiness: ${forbiddenClaim}`);
}

for (const sensitive of ["service_role", "SUPABASE_SERVICE_ROLE_KEY", "password", "token", "secret value"]) {
  assert.equal(exportSource.toLowerCase().includes(sensitive.toLowerCase()), false, `Export builder must not include sensitive wording/value: ${sensitive}`);
}

assert.match(apiSource, /req\.method !== "GET"/);
assert.match(apiSource, /await requireSuperAdmin\(req\)/);
assert.match(apiSource, /buildSchemaRecoveryReviewReport/);
assert.match(apiSource, /buildRecoveryReadinessExport/);
assert.match(apiSource, /Content-Disposition/);
assert.match(apiSource, /attachment; filename=/);
assert.match(apiSource, /Cache-Control", "no-store"/);

const authIndex = apiSource.indexOf("await requireSuperAdmin(req)");
const clientIndex = apiSource.indexOf("createServiceClient()");
assert.ok(authIndex >= 0 && clientIndex > authIndex, "Superadmin authorization must happen before service client usage.");

for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete(", ".rpc(", ".download(", "verifyStoredBackupPackage", "restore-upload", "restoreBackup"]) {
  assert.equal(apiSource.includes(forbidden), false, `Export API must not contain side-effect helper or mutation: ${forbidden}`);
}

assert.match(adminSource, /handleExportRecoveryReadinessReport/);
assert.match(adminSource, /\/api\/admin\/backups\/recovery-readiness-report/);
assert.match(adminSource, /Export Recovery Readiness Report/);
assert.match(adminSource, /not a backup, restore point, or proof of recoverability/);
assert.match(adminSource, /exportingRecoveryReadinessReport/);

console.log("recovery readiness export tests passed");