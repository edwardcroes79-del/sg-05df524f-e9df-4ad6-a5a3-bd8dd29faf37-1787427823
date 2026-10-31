import assert from "node:assert/strict";
import fs from "node:fs";

const admin = fs.readFileSync("src/pages/admin/index.tsx", "utf8");
const fetchAdminBody = admin.slice(admin.indexOf("const fetchAdminData = async"), admin.indexOf("const pendingBusinessRegistrations"));

assert.doesNotMatch(fetchAdminBody, /backups\/restore-points/, "restore points not loaded on admin entry");
assert.doesNotMatch(fetchAdminBody, /schema-recovery-review/, "schema review not loaded on admin entry");
assert.match(fetchAdminBody, /void loadBackupList\(accessToken\)/, "backup list still loads in background on entry");
assert.match(admin, /activeAdminTab !== "backups" \|\| backupReportsRequestedRef\.current/, "reports load when Backups tab opens");
const reportsBody = admin.slice(admin.indexOf("const loadBackupReports = async"), admin.indexOf("const fetchAdminData = async"));
for (const path of ["/api/admin/backups/restore-points", "/api/admin/backups/schema-recovery-review"]) {
  assert.ok(reportsBody.includes(path), `${path} loaded by Backups tab loader`);
}
assert.match(reportsBody, /loadBackupList\(session\.access_token\)/, "Backups tab also refreshes backup list");
assert.match(admin, /if \(activeBackups\) \{\s*startBackupPolling\(\);/, "running backups still start polling");
assert.match(admin, /if \(!selectedAt\) \{\s*await loadBackupReports\(\);/, "clearing restore-point time reloads reports");
console.log("admin fix 1 tests passed");

assert.match(fetchAdminBody, /await Promise\.allSettled\(\[/, "admin data loads in parallel");
for (const source of ["/api/admin/plans", "/api/admin/addons", "/api/admin/business-addons", "/api/admin/unconfirmed-users", "\"subscription_payments\"", "\"super_admin_notification_reads\"", "\"contract_reminders\"", "\"customers\"", "\"stamp_transactions\"", "\"website_pages\"", "\"bank_details\"", "\"footer\""]) {
  assert.ok(fetchAdminBody.includes(source), `${source} still loaded`);
}
assert.ok((fetchAdminBody.match(/await /g) || []).length <= 3, "no sequential awaits remain in admin data loader");
assert.match(admin, /await Promise\.all\(\[fetchAdminData\(\), fetchMfaFactors\(\)\]\)/, "MFA factors load alongside admin data");
const checkAdminBody = admin.slice(admin.indexOf("const checkAdmin = async"), admin.indexOf("const fetchMfaFactors"));
assert.match(checkAdminBody, /getMfaRouteRequirement\(\)/, "MFA requirement still checked");
assert.match(checkAdminBody, /is_super_admin, role/, "super admin role still verified");
assert.ok(checkAdminBody.indexOf("is_super_admin") < checkAdminBody.indexOf("setIsAdmin(true)"), "role verified before data loads");
console.log("admin fix 2 tests passed");