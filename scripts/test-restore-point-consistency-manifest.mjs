import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.resolve("src/lib/server/restorePointConsistencyManifest.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "restore-point-consistency-test-"));
const compiledPath = path.join(tempDir, "restorePointConsistencyManifest.cjs");
fs.writeFileSync(compiledPath, transpiled);

const mod = await import(`file://${compiledPath}`);
const {
  buildRestorePointConsistencyManifest,
  markRestorePointConsistencyPackageCompleted,
  validateRestorePointConsistencyManifest,
} = mod;

function baseTimings(overrides = {}) {
  return {
    database_export_started_at: "2026-10-26T18:30:00.000Z",
    database_export_completed_at: "2026-10-26T18:31:00.000Z",
    storage_inventory_started_at: "2026-10-26T18:31:00.000Z",
    storage_inventory_completed_at: "2026-10-26T18:31:15.000Z",
    storage_download_started_at: "2026-10-26T18:31:15.000Z",
    storage_download_completed_at: "2026-10-26T18:32:00.000Z",
    package_finalization_at: "2026-10-26T18:32:05.000Z",
    ...overrides,
  };
}

const generated = buildRestorePointConsistencyManifest({
  restorePointId: "rp-254",
  backupId: "00000000-0000-4000-8000-000000000254",
  declaredTimestamp: "2026-10-26T18:30:00.000Z",
  phaseTimings: baseTimings(),
});

assert.equal(generated.consistency_manifest_version, "2026-10-26.restore-point-consistency-v1");
assert.equal(generated.consistency_model, "best_effort_sequential_export");
assert.equal(generated.summary.classification, "best_effort_export");
assert.equal(generated.summary.database_consistent, false);
assert.equal(generated.summary.cross_component_consistent, false);
assert.equal(generated.summary.full_project_recoverable, false);
assert.equal(Boolean(generated.phase_timings.database_export_started_at), true);
assert.equal(Boolean(generated.phase_timings.storage_inventory_completed_at), true);
assert.equal(Boolean(generated.phase_timings.storage_download_completed_at), true);
assert.equal(Boolean(generated.phase_timings.package_finalization_at), true);

const completed = markRestorePointConsistencyPackageCompleted({ restore_point_consistency: generated }, "2026-10-26T18:33:00.000Z");
assert.equal(completed.restore_point_consistency.backup_completion_state, "completed");
assert.equal(completed.restore_point_consistency.phase_timings.package_upload_completed_at, "2026-10-26T18:33:00.000Z");

const valid = validateRestorePointConsistencyManifest(generated, generated.backup_id);
assert.equal(valid.valid, true);
assert.equal(valid.legacy, false);

const legacy = validateRestorePointConsistencyManifest(undefined, "legacy-backup");
assert.equal(legacy.valid, true);
assert.equal(legacy.legacy, true);

const missingTiming = structuredClone(generated);
delete missingTiming.phase_timings.database_export_started_at;
const missingTimingResult = validateRestorePointConsistencyManifest(missingTiming, missingTiming.backup_id);
assert.equal(missingTimingResult.valid, false);
assert.equal(missingTimingResult.errors.some((error) => error.includes("database_export_started_at")), true);

const falseDatabaseClaim = structuredClone(generated);
falseDatabaseClaim.consistency_model = "database_consistent_snapshot";
falseDatabaseClaim.summary.database_consistent = true;
const falseDatabaseClaimResult = validateRestorePointConsistencyManifest(falseDatabaseClaim, falseDatabaseClaim.backup_id);
assert.equal(falseDatabaseClaimResult.valid, false);
assert.equal(falseDatabaseClaimResult.errors.some((error) => error.includes("database consistency")), true);

const falseCrossComponentClaim = structuredClone(generated);
falseCrossComponentClaim.consistency_model = "cross_component_consistent_restore_point";
falseCrossComponentClaim.summary.cross_component_consistent = true;
const falseCrossComponentClaimResult = validateRestorePointConsistencyManifest(falseCrossComponentClaim, falseCrossComponentClaim.backup_id);
assert.equal(falseCrossComponentClaimResult.valid, false);
assert.equal(falseCrossComponentClaimResult.errors.some((error) => error.includes("cross-component")), true);

const falseFullProjectClaim = structuredClone(generated);
falseFullProjectClaim.consistency_model = "full_project_recoverable_restore_point";
falseFullProjectClaim.summary.full_project_recoverable = true;
const falseFullProjectClaimResult = validateRestorePointConsistencyManifest(falseFullProjectClaim, falseFullProjectClaim.backup_id);
assert.equal(falseFullProjectClaimResult.valid, false);
assert.equal(falseFullProjectClaimResult.errors.some((error) => error.includes("full-project")), true);

const malformed = validateRestorePointConsistencyManifest({ consistency_manifest_version: "bad", backup_id: "wrong", evidence: [] }, "expected");
assert.equal(malformed.valid, false);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log("restore point consistency manifest tests passed");