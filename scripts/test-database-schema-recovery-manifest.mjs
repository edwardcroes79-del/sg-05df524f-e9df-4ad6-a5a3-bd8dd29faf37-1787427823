import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.resolve("src/lib/server/databaseSchemaRecoveryManifest.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const tempCompileDir = fs.mkdtempSync(path.join(os.tmpdir(), "schema-recovery-compile-"));
const compiledPath = path.join(tempCompileDir, "databaseSchemaRecoveryManifest.cjs");
fs.writeFileSync(compiledPath, transpiled);

const mod = await import(`file://${compiledPath}`);
const {
  buildDatabaseSchemaRecoveryInventory,
  validateDatabaseSchemaRecoveryInventory,
  requiredDatabaseSchemaRecoveryCategoryKeys,
} = mod;

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "schema-recovery-fixture-"));
const migrationsDir = path.join(fixtureRoot, "supabase", "migrations");
const typesDir = path.join(fixtureRoot, "src", "integrations", "supabase");
fs.mkdirSync(migrationsDir, { recursive: true });
fs.mkdirSync(typesDir, { recursive: true });

fs.writeFileSync(path.join(migrationsDir, "20261026000000_schema.sql"), `
create extension if not exists pgcrypto;
create type public.business_role as enum ('owner', 'staff');
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (char_length(name) > 1)
);
create table public.staff_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade
);
create index staff_locations_business_idx on public.staff_locations(business_id);
create function public.touch_updated_at() returns trigger language plpgsql as $$ begin return new; end; $$;
create trigger touch_businesses before update on public.businesses for each row execute function public.touch_updated_at();
alter table public.businesses enable row level security;
create policy business_read on public.businesses for select using (true);
grant select on public.businesses to authenticated;
`);

fs.writeFileSync(path.join(typesDir, "database.types.ts"), "export type Database = { public: { Tables: { businesses: unknown } } };\n");

const generated = buildDatabaseSchemaRecoveryInventory({
  backupId: "00000000-0000-4000-8000-000000000255",
  backupVersion: "test-version",
  generatedAt: "2026-10-26T18:41:54.000Z",
  projectRoot: fixtureRoot,
});

assert.equal(generated.schema_recovery_manifest_version, "2026-10-26.database-schema-recovery-v1");
assert.equal(generated.schema_source, "repository_derived");
assert.equal(generated.live_database_capture.attempted, false);
assert.equal(generated.categories.length, requiredDatabaseSchemaRecoveryCategoryKeys.length);
assert.equal(generated.summary.repository_inventory_available, true);
assert.equal(generated.summary.live_database_schema_captured, false);
assert.equal(generated.summary.complete_schema_recovery_supported, false);
assert.equal(generated.summary.implemented_recovery_procedure_available, false);
assert.equal(Boolean(generated.repository_evidence.schema_fingerprint_sha256), true);
assert.equal(generated.repository_evidence.discovered_object_counts.create_table >= 2, true);
assert.equal(generated.repository_evidence.discovered_object_counts.create_trigger >= 1, true);
assert.equal(generated.repository_evidence.discovered_object_counts.rls_policy >= 2, true);

const generatedAgain = buildDatabaseSchemaRecoveryInventory({
  backupId: "00000000-0000-4000-8000-000000000255",
  backupVersion: "test-version",
  generatedAt: "2026-10-26T18:41:54.000Z",
  projectRoot: fixtureRoot,
});
assert.equal(generatedAgain.repository_evidence.schema_fingerprint_sha256, generated.repository_evidence.schema_fingerprint_sha256);

const valid = validateDatabaseSchemaRecoveryInventory(generated, generated.backup_id);
assert.equal(valid.valid, true);
assert.equal(valid.legacy, false);

const legacy = validateDatabaseSchemaRecoveryInventory(undefined, "legacy");
assert.equal(legacy.valid, true);
assert.equal(legacy.legacy, true);

const falseLiveClaim = structuredClone(generated);
falseLiveClaim.live_database_capture.attempted = true;
falseLiveClaim.live_database_capture.status = "captured";
falseLiveClaim.summary.live_database_schema_captured = true;
assert.equal(validateDatabaseSchemaRecoveryInventory(falseLiveClaim, falseLiveClaim.backup_id).valid, false);

const falseCompleteClaim = structuredClone(generated);
falseCompleteClaim.summary.complete_schema_recovery_supported = true;
assert.equal(validateDatabaseSchemaRecoveryInventory(falseCompleteClaim, falseCompleteClaim.backup_id).valid, false);

const falseProcedureClaim = structuredClone(generated);
falseProcedureClaim.categories[0].recovery_procedure_exists = true;
falseProcedureClaim.categories[0].recovery_procedure_status = "tested";
assert.equal(validateDatabaseSchemaRecoveryInventory(falseProcedureClaim, falseProcedureClaim.backup_id).valid, false);

const missingCategory = structuredClone(generated);
missingCategory.categories = missingCategory.categories.filter((item) => item.key !== "rls_state_policies");
const missingCategoryResult = validateDatabaseSchemaRecoveryInventory(missingCategory, missingCategory.backup_id);
assert.equal(missingCategoryResult.valid, false);
assert.equal(missingCategoryResult.errors.some((error) => error.includes("rls_state_policies")), true);

const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "schema-recovery-empty-"));
const emptyInventory = buildDatabaseSchemaRecoveryInventory({
  backupId: "00000000-0000-4000-8000-000000000256",
  backupVersion: "test-version",
  generatedAt: "2026-10-26T18:41:54.000Z",
  projectRoot: emptyRoot,
});
assert.equal(emptyInventory.summary.repository_inventory_available, false);
assert.equal(emptyInventory.summary.migration_history_available, false);
assert.equal(emptyInventory.summary.complete_schema_recovery_supported, false);

const tableDataOnlyClaim = structuredClone(generated);
const schemaCategory = tableDataOnlyClaim.categories.find((item) => item.key === "schemas_tables");
schemaCategory.evidence = [{ kind: "backup_table_data", status: "captured_from_backup", reference: "data/businesses.jsonl", details: "Table rows only." }];
schemaCategory.captured_by_backup_system = true;
const tableDataOnlyResult = validateDatabaseSchemaRecoveryInventory(tableDataOnlyClaim, tableDataOnlyClaim.backup_id);
assert.equal(tableDataOnlyResult.valid, true);
assert.equal(tableDataOnlyResult.warnings.some((warning) => warning.includes("claims backup capture")), true);

fs.rmSync(fixtureRoot, { recursive: true, force: true });
fs.rmSync(emptyRoot, { recursive: true, force: true });
fs.rmSync(tempCompileDir, { recursive: true, force: true });
console.log("database schema recovery manifest tests passed");