import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.resolve("src/lib/server/completeRecoveryManifest.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "complete-recovery-manifest-test-"));
const compiledPath = path.join(tempDir, "completeRecoveryManifest.cjs");
fs.writeFileSync(compiledPath, transpiled);

const mod = await import(`file://${compiledPath}`);
const {
  buildCompleteRecoveryManifest,
  validateCompleteRecoveryManifest,
  requiredCompleteRecoveryComponentKeys,
} = mod;

function baseInput(overrides = {}) {
  return {
    backupId: "00000000-0000-4000-8000-000000000253",
    backupVersion: "test-version",
    createdAt: "2026-10-26T18:16:15.000Z",
    requiredTables: ["profiles", "businesses"],
    requiredBuckets: ["loyalty-assets"],
    tables: [
      { table: "profiles", record_count: 1, bytes: 20, sha256: "a".repeat(64) },
      { table: "businesses", record_count: 1, bytes: 20, sha256: "b".repeat(64) },
    ],
    buckets: [
      { bucket: "loyalty-assets", object_count: 1, total_bytes: 10 },
    ],
    fileList: [
      { path: "data/profiles.jsonl", size: 20, sha256: "a".repeat(64), source_type: "database", source_name: "profiles" },
    ],
    sha256Checksums: {
      "data/profiles.jsonl": "a".repeat(64),
    },
    ...overrides,
  };
}

const generated = buildCompleteRecoveryManifest(baseInput());
assert.equal(generated.schema_version, "2026-10-26.complete-recovery-v1");
assert.equal(generated.summary.supported_package_complete, true);
assert.equal(generated.summary.recovery_inventory_complete, true);
assert.equal(generated.summary.full_project_recovery_complete, false);
assert.equal(generated.component_inventory.length, requiredCompleteRecoveryComponentKeys.length);

const legacy = validateCompleteRecoveryManifest(undefined, "legacy-id");
assert.equal(legacy.valid, true);
assert.equal(legacy.legacy, true);
assert.equal(legacy.warnings.length > 0, true);

const incomplete = buildCompleteRecoveryManifest(baseInput({ tables: [] }));
assert.equal(incomplete.summary.supported_package_complete, false);
assert.equal(incomplete.summary.full_project_recovery_complete, false);

const malformed = validateCompleteRecoveryManifest({ schema_version: "bad", backup_id: "wrong", component_inventory: [] }, "expected");
assert.equal(malformed.valid, false);

const falseClaim = structuredClone(generated);
falseClaim.summary.full_project_recovery_complete = true;
const falseClaimResult = validateCompleteRecoveryManifest(falseClaim, falseClaim.backup_id);
assert.equal(falseClaimResult.valid, false);
assert.equal(falseClaimResult.errors.some((error) => error.includes("falsely claims full project recovery")), true);

const conflict = structuredClone(generated);
conflict.component_inventory[0].status = "verified";
conflict.component_inventory[0].recovery_method_supported = false;
const conflictResult = validateCompleteRecoveryManifest(conflict, conflict.backup_id);
assert.equal(conflictResult.valid, false);

const validInventoryUnverified = validateCompleteRecoveryManifest(generated, generated.backup_id);
assert.equal(validInventoryUnverified.valid, true);
assert.equal(validInventoryUnverified.legacy, false);
assert.equal(generated.summary.actual_package_contents_verified, false);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log("complete recovery manifest tests passed");