import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const alertsApi = read("src/pages/api/business/security-alerts.ts");
const layout = read("src/components/dashboard/DashboardLayout.tsx");

assert.match(alertsApi, /req\.query\.summary === "1"/, "summary mode exists");
const summaryIndex = alertsApi.indexOf('req.query.summary === "1"');
const permissionIndex = alertsApi.indexOf("await canManageBusiness(admin, businessId, userId)");
assert.ok(permissionIndex > 0 && permissionIndex < summaryIndex, "summary mode runs after permission check");
assert.match(alertsApi, /Only a Business Owner\/Admin can access security alerts/, "403 path preserved");
assert.match(alertsApi, /if \(profileResult\.data\?\.is_super_admin\) return true;/, "super admin rule preserved");
assert.match(alertsApi, /if \(businessResult\.data\?\.owner_id === userId\) return true;/, "owner rule preserved");
assert.match(alertsApi, /\.in\("role", \["owner", "admin", "corporate_admin"\]\)/, "role rule preserved");
assert.match(alertsApi, /staffNeedingAuthLookup\.map/, "auth lookups limited to profiles missing name or email");
assert.match(alertsApi, /hydratedAlerts = await loadAlertDetails/, "full alert list path unchanged");

assert.match(layout, /security-alerts\?businessId=[^`]*summary=1/, "badge uses summary mode");
assert.doesNotMatch(layout, /\}, 15000\);/, "15s polling removed");
assert.match(layout, /if \(document\.visibilityState !== "visible"\) return;\s*void refreshSummary\(\);\s*\}, 60000\);/, "60s visible-only polling");
assert.match(layout, /table: "anti_fraud_security_alerts"/, "realtime alert channel preserved");

console.log("perf phase 1 optimization 1 tests passed");

const mfaIndex = layout.indexOf("await getMfaRouteRequirement()");
const snapshotApplyIndex = layout.indexOf("applySnapshot(cachedSnapshot)");
assert.ok(mfaIndex > 0 && mfaIndex < snapshotApplyIndex, "cached snapshot only applied after session + MFA checks");
assert.match(layout, /cachedSnapshot\.userId === session\.user\.id/, "snapshot scoped to signed-in user");
assert.match(layout, /DASHBOARD_SNAPSHOT_MAX_AGE_MS = 5 \* 60 \* 1000/, "snapshot max age 5 minutes");
assert.match(layout, /rpc\("get_business_dashboard_access_status"\)/, "access status check still runs every load");
assert.match(layout, /rpc\("business_has_active_quick_stamp_qr"/, "quick stamp access check unchanged");
assert.match(layout, /get_business_boolean_entitlement/, "entitlement checks unchanged");
assert.match(layout, /if \(!resolvedBusiness\) \{\s*dashboardLayoutSnapshot = null;/, "no-business clears snapshot");
assert.match(layout, /const handleLogout = async \(\) => \{\s*dashboardLayoutSnapshot = null;/, "logout clears snapshot");
assert.match(layout, /if \(!hasFreshSnapshot \|\| cachedSnapshot\?\.activeLocationId !== activeLocationValue\)/, "location event deduplicated");
assert.ok((layout.match(/await Promise\.all\(\[/g) || []).length >= 2, "layout checks run in parallel");

console.log("perf phase 1 optimization 3 tests passed");