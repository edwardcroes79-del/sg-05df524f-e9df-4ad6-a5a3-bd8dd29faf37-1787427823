import assert from "node:assert/strict";
import fs from "node:fs";

const adminSource = fs.readFileSync("src/pages/admin/index.tsx", "utf8");
const engineSource = fs.readFileSync("src/lib/server/backupRestoreEngine.ts", "utf8");
const apiSource = fs.readFileSync("src/pages/api/admin/backups/restore-upload.ts", "utf8");

const dryRunSection = adminSource.slice(
  adminSource.indexOf("<p className=\"font-semibold\">2. Preflight Dry Run</p>"),
  adminSource.indexOf("<p className=\"font-semibold text-destructive\">3. Restore Writes Disabled</p>")
);

const restoreSection = adminSource.slice(
  adminSource.indexOf("<p className=\"font-semibold text-destructive\">3. Restore Writes Disabled</p>"),
  adminSource.indexOf("{restoreReport && (")
);

assert.match(dryRunSection, /Upload for Dry Run/);
assert.match(dryRunSection, /onChange=\{\(event\) => handleRestoreBackupUpload\(event, "dry_run"\)\}/);
assert.match(dryRunSection, /disabled=\{Boolean\(restoringBackup\)\}/);
assert.doesNotMatch(dryRunSection, /!restoreDestinationLabel/);
assert.doesNotMatch(dryRunSection, /!restoreDestinationProjectRef/);
assert.match(dryRunSection, /dryRunUploadInfo/);
assert.match(dryRunSection, /Selected:/);
assert.match(dryRunSection, /Destination-specific checks remain not verified/);

assert.match(restoreSection, /Restore Upload Disabled/);
assert.match(restoreSection, /type="file"[\s\S]*?disabled[\s\S]*?onChange=\{\(event\) => handleRestoreBackupUpload\(event, "restore"\)\}/);
assert.match(restoreSection, /Restore writes are fail-closed/);

assert.match(apiSource, /requireSuperAdmin\(req\)/);
assert.match(apiSource, /getRestoreMode\(req\)/);
assert.match(apiSource, /restoreBackupPackage/);

assert.match(engineSource, /mode === "dry_run" \? `dry-run-\$\{Date\.now\(\)\}` : await createRestoreJob/);
assert.match(engineSource, /if \(mode === "dry_run"\) \{\s*return buildDryRunReport/);
assert.match(engineSource, /if \(mode !== "dry_run"\) \{\s*await updateRestoreJob/);
assert.match(engineSource, /valid: preflight\.destructive_write_blockers\.length === 0/);
assert.match(engineSource, /errors: preflight\.destructive_write_blockers/);
assert.match(engineSource, /const safetyBackup = await createBackupPackage/);
assert.equal(engineSource.indexOf("if (mode === \"dry_run\") {\n      return buildDryRunReport"), engineSource.lastIndexOf("if (mode === \"dry_run\") {\n      return buildDryRunReport"));

console.log("dry run upload activation tests passed");