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
assert.ok((fetchAdminBody.match(/await supabase/g) || []).length === 1, "only one session lookup before the parallel batch");
assert.ok((fetchAdminBody.match(/await Promise\.allSettled/g) || []).length === 1, "single parallel batch");
assert.doesNotMatch(fetchAdminBody, /await fetch\("\/api\/admin\/plans"/, "no sequential plans request");
assert.match(admin, /await Promise\.all\(\[fetchAdminData\(\), fetchMfaFactors\(\)\]\)/, "MFA factors load alongside admin data");
const checkAdminBody = admin.slice(admin.indexOf("const checkAdmin = async"), admin.indexOf("const fetchMfaFactors"));
assert.match(checkAdminBody, /getMfaRouteRequirement\(\)/, "MFA requirement still checked");
assert.match(checkAdminBody, /is_super_admin, role/, "super admin role still verified");
assert.ok(checkAdminBody.indexOf("is_super_admin") < checkAdminBody.indexOf("setIsAdmin(true)"), "role verified before data loads");
console.log("admin fix 2 tests passed");

const login = fs.readFileSync("src/pages/auth/login.tsx", "utf8");
assert.match(login, /const \{ data: signInData, error \} = await supabase\.auth\.signInWithPassword/, "sign-in result captured");
assert.match(login, /await routeUser\(signInData\.user\?\.id\)/, "login reuses signed-in user");
assert.match(login, /knownUserId \?\? \(await supabase\.auth\.getUser\(\)\)\.data\.user\?\.id/, "fallback user lookup preserved for MFA path");
assert.match(login, /select\("is_super_admin, role"\)\s*\.eq\("id", userId\)/, "role check still runs");
assert.match(login, /await getMfaRouteRequirement\(\)/, "MFA requirement still checked on login");
console.log("admin fix 3 tests passed");

const deleteBackupBody = admin.slice(admin.indexOf("const handleDeleteBackup = async"), admin.indexOf("const handleCancelBackup = async"));
assert.doesNotMatch(deleteBackupBody, /fetchAdminData\(\)/, "backup delete refreshes only backups");
assert.match(deleteBackupBody, /backupReportsRequestedRef\.current \? loadBackupReports\(\) : loadBackupList\(session\.access_token\)/, "backup delete refresh scoped");
const footerBody = admin.slice(admin.indexOf("const handleSaveFooterSettings = async"), admin.indexOf("const handleSaveBankDetails = async"));
assert.doesNotMatch(footerBody, /fetchAdminData\(\)/, "footer save no longer reloads dashboard");
assert.match(admin, /const \{ data: refreshedPages \} = await supabase\.from\("website_pages"\)/, "page save refreshes only pages");
assert.doesNotMatch(fetchAdminBody, /restore-points|schema-recovery-review/, "post-action reloads never include backup reports");
console.log("admin fix 4 tests passed");