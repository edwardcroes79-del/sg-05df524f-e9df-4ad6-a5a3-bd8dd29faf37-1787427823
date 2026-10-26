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

const tempCompileDir = fs.mkdtempSync(path.join(os.tmpdir(), "schema-planner-compile-"));
const compiledPath = path.join(tempCompileDir, "schemaDependencyPlanner.cjs");
fs.writeFileSync(compiledPath, transpiled);

const mod = await import(`file://${compiledPath}`);
const {
  buildSchemaDependencyPlan,
  validateSchemaDependencyPlan,
  schemaDependencyPlannerVersion,
} = mod;

function makeFixture(sqlFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "schema-planner-fixture-"));
  const migrationsDir = path.join(root, "supabase", "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  for (const [fileName, content] of Object.entries(sqlFiles)) {
    fs.writeFileSync(path.join(migrationsDir, fileName), content);
  }
  return root;
}

const root = makeFixture({
  "20261026000100_base.sql": `
create extension if not exists pgcrypto;
create type public.business_role as enum ('owner', 'staff');
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id)
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid()
);
create function public.count_locations() returns integer language sql as $$ select count(*) from public.locations; $$;
create trigger location_touch after update on public.locations for each row execute function public.count_locations();
create index locations_business_idx on public.locations(business_id);
alter table public.locations enable row level security;
create policy location_read on public.locations for select using (auth.uid() is not null);
grant select on public.locations to authenticated;
create aggregate public.unsupported_count(anyelement) (sfunc = array_append, stype = anyarray);
`,
  "20261026000200_cycle.sql": `
create table public.cycle_a (
  id uuid primary key,
  b_id uuid references public.cycle_b(id)
);
create table public.cycle_b (
  id uuid primary key,
  a_id uuid references public.cycle_a(id)
);
create table public.external_owner (
  id uuid primary key,
  user_id uuid references auth.users(id)
);
`,
});

const plan = buildSchemaDependencyPlan({
  backupId: "00000000-0000-4000-8000-000000000256",
  inputInventoryVersion: "inventory-test",
  generatedAt: "2026-10-26T18:53:53.000Z",
  projectRoot: root,
});

const planAgain = buildSchemaDependencyPlan({
  backupId: "00000000-0000-4000-8000-000000000256",
  inputInventoryVersion: "inventory-test",
  generatedAt: "2026-10-26T18:53:53.000Z",
  projectRoot: root,
});

assert.equal(plan.planner_version, schemaDependencyPlannerVersion);
assert.deepEqual(
  plan.nodes.map((node) => [node.id, node.planned_order]),
  planAgain.nodes.map((node) => [node.id, node.planned_order])
);
assert.equal(plan.summary.live_database_verified, false);
assert.equal(plan.summary.executable_sql_generated, false);
assert.equal(plan.summary.restore_authorized, false);
assert.equal(plan.summary.readiness, "blocked");
assert.equal(plan.source_files_examined.length, 2);

const business = plan.nodes.find((node) => node.id === "schema_table:public.businesses");
const location = plan.nodes.find((node) => node.id === "schema_table:public.locations");
const audit = plan.nodes.find((node) => node.id === "schema_table:public.audit_events");
const trigger = plan.nodes.find((node) => node.category === "trigger" && node.name === "location_touch");
const func = plan.nodes.find((node) => node.category === "function" && node.name === "public.count_locations");
const policy = plan.nodes.find((node) => node.category === "rls_policy" && node.name.includes("location_read"));

assert.ok(business);
assert.ok(location);
assert.ok(audit);
assert.ok(trigger);
assert.ok(func);
assert.ok(policy);
assert.equal(location.dependency_ids.includes("schema_table:public.businesses"), true);
assert.equal(location.dependency_evidence.some((item) => item.evidence_type === "explicit"), true);
assert.equal(trigger.dependency_ids.includes("schema_table:public.locations"), true);
assert.equal(trigger.dependency_ids.includes("function:public.count_locations"), true);
assert.equal(func.dependency_evidence.some((item) => item.evidence_type === "inferred"), true);
assert.equal(policy.dependency_evidence.some((item) => item.evidence_type === "unknown"), true);
assert.equal(audit.dependency_ids.length, 0);
assert.equal(plan.cycles.length > 0, true);
assert.equal(plan.missing_definitions.some((item) => item.includes("auth.users")), true);
assert.equal(plan.unsupported_object_types.includes("aggregate"), true);
assert.equal(plan.nodes.every((node) => Array.isArray(node.source_locations) && node.source_locations.length > 0), true);

const valid = validateSchemaDependencyPlan(plan, plan.backup_id);
assert.equal(valid.valid, true);
assert.equal(valid.legacy, false);

const legacy = validateSchemaDependencyPlan(undefined, "legacy");
assert.equal(legacy.valid, true);
assert.equal(legacy.legacy, true);

const falseClaim = structuredClone(plan);
falseClaim.summary.live_database_verified = true;
falseClaim.summary.executable_sql_generated = true;
falseClaim.summary.restore_authorized = true;
assert.equal(validateSchemaDependencyPlan(falseClaim, falseClaim.backup_id).valid, false);

const malformed = structuredClone(plan);
malformed.nodes = "not-nodes";
assert.equal(validateSchemaDependencyPlan(malformed, malformed.backup_id).valid, false);

fs.rmSync(root, { recursive: true, force: true });
fs.rmSync(tempCompileDir, { recursive: true, force: true });
console.log("schema dependency planner tests passed");