import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.resolve("src/lib/server/schemaDependencyPlanner.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const tempCompileDir = fs.mkdtempSync(path.join(os.tmpdir(), "schema-blocker-compile-"));
const compiledPath = path.join(tempCompileDir, "schemaDependencyPlanner.cjs");
fs.writeFileSync(compiledPath, transpiled);

const mod = await import(`file://${compiledPath}`);
const { buildSchemaDependencyPlan, validateSchemaDependencyPlan } = mod;

function makeFixture(sqlFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "schema-blocker-fixture-"));
  const migrationsDir = path.join(root, "supabase", "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  for (const [fileName, content] of Object.entries(sqlFiles)) {
    fs.writeFileSync(path.join(migrationsDir, fileName), content);
  }
  return root;
}

const root = makeFixture({
  "20261026000100_blockers.sql": `
create table public.business_users (
  id uuid primary key,
  user_id uuid references auth.users(id)
);

create table public.staff_audit (
  id uuid primary key,
  business_user_id uuid references business_users(id)
);

create function public.count_business_users()
returns integer
language sql
as $$
  select count(*) from business_users where exists (select 1);
$$;

alter table public.staff_audit enable row level security;
create policy staff_audit_read on public.staff_audit for select using (auth.uid() is not null);
grant select on public.staff_audit to authenticated;
grant usage on schema public to anon;

create subscription subscription_demo connection 'disabled' publication publication_demo;
`,
});

const plan = buildSchemaDependencyPlan({
  backupId: "00000000-0000-4000-8000-000000000259",
  inputInventoryVersion: "inventory-test",
  generatedAt: "2026-10-26T19:37:14.000Z",
  projectRoot: root,
});

const blockers = plan.summary.classified_blockers;
const byName = new Map(blockers.map((blocker) => [blocker.object_name, blocker]));

assert.equal(plan.summary.live_database_verified, false);
assert.equal(plan.summary.executable_sql_generated, false);
assert.equal(plan.summary.restore_authorized, false);
assert.equal(validateSchemaDependencyPlan(plan, plan.backup_id).valid, true);

assert.equal(byName.get("auth.uid")?.classification, "provider_managed_dependency");
assert.equal(byName.get("auth.uid")?.object_category, "function");
assert.equal(byName.get("auth.users")?.classification, "provider_managed_dependency");
assert.equal(byName.get("auth.users")?.object_category, "schema_table");
assert.equal(blockers.some((blocker) => blocker.object_category === "subscription" && blocker.classification === "unsupported_object"), true);

assert.equal(plan.missing_definitions.some((item) => item === "schema_table:business_users"), false);
assert.equal(plan.missing_definitions.some((item) => item === "schema_table:1"), false);
assert.equal(plan.missing_definitions.some((item) => item === "schema_table:anon."), false);
assert.equal(plan.summary.blockers.some((blocker) => blocker.includes("full-project recovery")), false);
assert.equal(blockers.every((blocker) => blocker.id && blocker.evidence_source && blocker.reason && blocker.recommended_next_action), true);

const legacy = validateSchemaDependencyPlan(undefined, "legacy");
assert.equal(legacy.valid, true);
assert.equal(legacy.legacy, true);

const reportSource = fs.readFileSync("src/lib/server/schemaRecoveryReviewReport.ts", "utf8");
const adminSource = fs.readFileSync("src/pages/admin/index.tsx", "utf8");
assert.match(reportSource, /classified_blockers/);
assert.match(adminSource, /classified_blockers/);
assert.match(adminSource, /Next action/);
assert.doesNotMatch(source, /createClient\(/);
assert.doesNotMatch(source, /execute_sql_query|get_database_schema|restore-upload/);

fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(tempCompileDir, { recursive: true, force: true });
console.log("schema recovery blocker classification tests passed");