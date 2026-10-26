import assert from "node:assert/strict";
import fs from "node:fs";

const evidenceSource = fs.readFileSync("src/lib/server/backupVerificationEvidence.ts", "utf8");
const reviewSource = fs.readFileSync("src/lib/server/schemaRecoveryReviewReport.ts", "utf8");
const reviewApiSource = fs.readFileSync("src/pages/api/admin/backups/schema-recovery-review.ts", "utf8");
const validateStoredSource = fs.readFileSync("src/pages/api/admin/backups/[id]/validate-stored.ts", "utf8");
const adminSource = fs.readFileSync("src/pages/admin/index.tsx", "utf8");

assert.match(evidenceSource, /export const backupVerificationEvidenceVersion = "2026-10-26\.backup-verification-evidence-v1"/);
assert.match(evidenceSource, /"verified" \| "failed" \| "incomplete" \| "not_verified"/);
assert.match(evidenceSource, /historical_consistency_status: "not_verified"/);
assert.match(evidenceSource, /full_project_recovery_status: "blocked"/);
assert.match(evidenceSource, /must not infer historical consistency from package integrity/);
assert.match(evidenceSource, /must not infer full-project recovery from package integrity/);
assert.match(evidenceSource, /No existing authorized persistence mechanism/);
assert.match(evidenceSource, /service\[_-\]\?role/);
assert.match(evidenceSource, /extractBackupVerificationEvidenceFromManifest/);
assert.match(evidenceSource, /summarizeBackupVerificationEvidence/);
assert.match(evidenceSource, /Successful package verification does not prove historical consistency or full-project recoverability/);

assert.match(validateStoredSource, /requireSuperAdmin\(req\)/);
assert.match(validateStoredSource, /buildBackupVerificationEvidenceRecord\(report\)/);
assert.match(validateStoredSource, /verification_evidence/);
assert.match(validateStoredSource, /persistence/);
assert.doesNotMatch(validateStoredSource, /\.insert\s*\(/);
assert.doesNotMatch(validateStoredSource, /\.update\s*\(/);
assert.doesNotMatch(validateStoredSource, /\.upsert\s*\(/);
assert.doesNotMatch(validateStoredSource, /\.delete\s*\(/);

assert.match(reviewSource, /extractBackupVerificationEvidenceFromManifest/);
assert.match(reviewSource, /summarizeBackupVerificationEvidence/);
assert.match(reviewSource, /latest_stored_package_verification/);
assert.match(reviewSource, /This review endpoint does not retrieve or download stored backup packages/);
assert.doesNotMatch(reviewSource, /verifyStoredBackupPackage\s*\(/);
assert.doesNotMatch(reviewApiSource, /validate-stored/);
assert.doesNotMatch(reviewApiSource, /verifyStoredBackupPackage/);
assert.doesNotMatch(reviewApiSource, /storage\.from\(.*download/);

assert.match(adminSource, /Stored package verification evidence/);
assert.match(adminSource, /latest_stored_package_verification/);
assert.match(adminSource, /This review never downloads or revalidates stored archives automatically/);
assert.match(adminSource, /Package integrity evidence is separate from historical consistency/);

console.log("backup verification evidence tests passed");