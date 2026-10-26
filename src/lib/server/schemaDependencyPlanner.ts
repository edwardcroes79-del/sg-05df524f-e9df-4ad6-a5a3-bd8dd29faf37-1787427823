import crypto from "crypto";
import fs from "fs";
import path from "path";

export const schemaDependencyPlannerVersion = "2026-10-26.schema-dependency-planner-v1";

export type SchemaDependencyCategory =
  | "extension"
  | "custom_type"
  | "schema_table"
  | "sequence"
  | "constraint"
  | "foreign_key"
  | "function"
  | "view"
  | "trigger"
  | "index"
  | "rls_policy"
  | "grant"
  | "unsupported"
  | "missing_definition";

export type SchemaDependencyEvidenceType = "explicit" | "inferred" | "unknown";
export type SchemaDependencyReadiness = "inventory_only" | "partially_plannable" | "blocked" | "ready_for_review";
export type SchemaRecoveryBlockerClassification =
  | "missing_definition"
  | "repository_evidence_only"
  | "provider_managed_dependency"
  | "live_state_unverified"
  | "unsupported_object"
  | "recovery_procedure_missing"
  | "parser_artifact"
  | "unknown";

export type SchemaDependencyBlocker = {
  id: string;
  object_category: string;
  object_name: string;
  severity: "critical" | "high" | "medium" | "low";
  classification: SchemaRecoveryBlockerClassification;
  evidence_source: string;
  reason: string;
  resolvable_from_repository: boolean;
  required_capability_or_authorization: string;
  recommended_next_action: string;
  source_locations: SchemaDependencySourceLocation[];
};

export type SchemaDependencySourceLocation = {
  file: string;
  line: number;
};

export type SchemaDependencyEvidence = {
  dependency_id: string;
  evidence_type: SchemaDependencyEvidenceType;
  source: SchemaDependencySourceLocation;
  details: string;
};

export type SchemaDependencyNode = {
  id: string;
  category: SchemaDependencyCategory;
  name: string;
  source_locations: SchemaDependencySourceLocation[];
  definition_available: boolean;
  dependency_ids: string[];
  dependency_evidence: SchemaDependencyEvidence[];
  planned_phase: number;
  planned_order?: number;
  validation_status: "reviewable" | "blocked" | "unverified";
  blockers: string[];
  warnings: string[];
};

export type SchemaDependencyCycle = {
  node_ids: string[];
};

export type SchemaDependencyPlanSummary = {
  total_objects_by_category: Record<string, number>;
  resolved_dependency_count: number;
  unresolved_dependency_count: number;
  cycle_count: number;
  missing_definition_count: number;
  unsupported_object_count: number;
  readiness: SchemaDependencyReadiness;
  classified_blockers: SchemaDependencyBlocker[];
  live_database_verified: false;
  executable_sql_generated: false;
  restore_authorized: false;
  blockers: string[];
  warnings: string[];
};

export type SchemaDependencyPlan = {
  planner_version: typeof schemaDependencyPlannerVersion;
  input_inventory_version: string;
  generated_at: string;
  backup_id: string;
  source_files_examined: string[];
  latest_migration_file?: string;
  nodes: SchemaDependencyNode[];
  cycles: SchemaDependencyCycle[];
  missing_definitions: string[];
  unsupported_object_types: string[];
  summary: SchemaDependencyPlanSummary;
};

export type BuildSchemaDependencyPlanInput = {
  backupId: string;
  inputInventoryVersion: string;
  generatedAt?: string;
  projectRoot?: string;
};

export type SchemaDependencyPlanValidationResult = {
  valid: boolean;
  legacy: boolean;
  errors: string[];
  warnings: string[];
};

type SqlFile = {
  relativePath: string;
  content: string;
};

const phaseByCategory: Record<SchemaDependencyCategory, number> = {
  extension: 10,
  custom_type: 20,
  schema_table: 30,
  sequence: 30,
  constraint: 40,
  foreign_key: 45,
  function: 50,
  view: 55,
  trigger: 60,
  index: 70,
  rls_policy: 80,
  grant: 90,
  unsupported: 95,
  missing_definition: 99,
};

function collectSqlFiles(directoryPath: string, basePath = directoryPath): string[] {
  try {
    return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) return collectSqlFiles(fullPath, basePath);
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".sql")) return [path.relative(basePath, fullPath).split(path.sep).join("/")];
      return [];
    }).sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function normalizeName(value: string) {
  return value.replace(/[;,]/g, "").replace(/"/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function objectId(category: SchemaDependencyCategory, name: string) {
  return `${category}:${normalizeName(name)}`;
}

function stableBlockerId(classification: string, objectCategory: string, objectName: string) {
  return `schema-blocker-${sha256(`${classification}:${objectCategory}:${objectName}`).slice(0, 16)}`;
}

function isPotentialRelationReference(value: string) {
  const normalized = normalizeName(value);
  if (!normalized || normalized === "." || normalized.endsWith(".") || /^\d+$/.test(normalized)) return false;
  if (["select", "from", "join", "where", "on", "using", "true", "false", "null", "new", "old", "excluded", "anon."].includes(normalized)) return false;
  return true;
}

function resolvePublicSchemaDependencyAliases(nodes: Map<string, SchemaDependencyNode>) {
  for (const node of nodes.values()) {
    const replacements = new Map<string, string>();

    for (const dependencyId of node.dependency_ids) {
      if (nodes.has(dependencyId) || !dependencyId.startsWith("schema_table:")) continue;
      const dependencyName = dependencyId.slice("schema_table:".length);
      if (dependencyName.includes(".")) continue;

      const publicDependencyId = objectId("schema_table", `public.${dependencyName}`);
      if (nodes.has(publicDependencyId)) replacements.set(dependencyId, publicDependencyId);
    }

    if (replacements.size === 0) continue;

    node.dependency_ids = Array.from(new Set(node.dependency_ids.map((dependencyId) => replacements.get(dependencyId) || dependencyId)));
    node.dependency_evidence = node.dependency_evidence.map((evidence) => ({
      ...evidence,
      dependency_id: replacements.get(evidence.dependency_id) || evidence.dependency_id,
      details: replacements.has(evidence.dependency_id)
        ? `${evidence.details} Unqualified public-schema reference resolved to the repository-defined public schema table.`
        : evidence.details,
    }));
  }
}

function classifyMissingDefinition(node: SchemaDependencyNode): SchemaDependencyBlocker {
  const name = node.name;
  const source = node.source_locations[0]?.file || "repository migration parser";

  if (name === "auth.uid") {
    return {
      id: stableBlockerId("provider_managed_dependency", "function", name),
      object_category: "function",
      object_name: name,
      severity: "high",
      classification: "provider_managed_dependency",
      evidence_source: source,
      reason: "RLS policy evidence references Supabase Auth helper auth.uid(), which is provider-managed and not defined by project migrations.",
      resolvable_from_repository: false,
      required_capability_or_authorization: "Supabase Auth runtime support in an independently authorized destination project.",
      recommended_next_action: "Verify the destination Supabase project provides Auth helper functions before any schema reconstruction review.",
      source_locations: node.source_locations,
    };
  }

  if (name === "auth.users") {
    return {
      id: stableBlockerId("provider_managed_dependency", "schema_table", name),
      object_category: "schema_table",
      object_name: name,
      severity: "high",
      classification: "provider_managed_dependency",
      evidence_source: source,
      reason: "Repository evidence references Supabase-managed auth.users. Auth users and identities are outside the public table backup and must not be recreated from app migrations.",
      resolvable_from_repository: false,
      required_capability_or_authorization: "Provider-supported Supabase Auth export/restore or independently verified Auth compatibility.",
      recommended_next_action: "Keep auth.users as an external provider dependency and verify Auth recovery separately.",
      source_locations: node.source_locations,
    };
  }

  if (name === "authenticated" || name === "anon") {
    return {
      id: stableBlockerId("provider_managed_dependency", "database_role", name),
      object_category: "database_role",
      object_name: name,
      severity: "medium",
      classification: "provider_managed_dependency",
      evidence_source: source,
      reason: "Repository grant/policy evidence references Supabase-managed database roles.",
      resolvable_from_repository: false,
      required_capability_or_authorization: "Supabase destination role compatibility verification.",
      recommended_next_action: "Verify provider-managed roles exist on the authorized destination; do not recreate them from application migrations.",
      source_locations: node.source_locations,
    };
  }

  if (/^\d+$/.test(name) || name.endsWith(".") || name.includes("__")) {
    return {
      id: stableBlockerId("parser_artifact", node.category, name),
      object_category: node.category,
      object_name: name,
      severity: "low",
      classification: "parser_artifact",
      evidence_source: source,
      reason: "The reference shape is not a valid recoverable database object from repository evidence and is produced by conservative SQL text parsing.",
      resolvable_from_repository: true,
      required_capability_or_authorization: "Parser refinement only; no database access required.",
      recommended_next_action: "Keep the entry visible as parser evidence and refine parsing rules if it appears in review output.",
      source_locations: node.source_locations,
    };
  }

  return {
    id: stableBlockerId("missing_definition", node.category, name),
    object_category: node.category,
    object_name: name,
    severity: "high",
    classification: "missing_definition",
    evidence_source: source,
    reason: "A repository migration references this object, but no usable definition was found in repository evidence.",
    resolvable_from_repository: false,
    required_capability_or_authorization: "Repository definition, provider capability, or authorized non-mutating schema verification.",
    recommended_next_action: "Locate the defining migration or keep this blocker until a safe live schema verification/export is authorized.",
    source_locations: node.source_locations,
  };
}

function buildClassifiedBlockers(nodes: SchemaDependencyNode[], cycles: SchemaDependencyCycle[], unsupportedObjectTypes: string[]): SchemaDependencyBlocker[] {
  const cycleBlockers = cycles.map((cycle) => ({
    id: stableBlockerId("unknown", "dependency_cycle", cycle.node_ids.join("->")),
    object_category: "dependency_cycle",
    object_name: cycle.node_ids.join(" -> "),
    severity: "high" as const,
    classification: "unknown" as const,
    evidence_source: "repository migration dependency graph",
    reason: "A dependency cycle was detected and cannot be safely force-ordered from repository evidence alone.",
    resolvable_from_repository: false,
    required_capability_or_authorization: "Human schema review and, if needed, an authorized non-mutating catalog comparison.",
    recommended_next_action: "Review the cycle and decide whether constraints must be deferred or split in a future recovery plan.",
    source_locations: [] as SchemaDependencySourceLocation[],
  }));

  const missingBlockers = nodes
    .filter((node) => !node.definition_available || node.category === "missing_definition")
    .map(classifyMissingDefinition);

  const unsupportedBlockers = nodes
    .filter((node) => node.category === "unsupported")
    .map((node) => ({
      id: stableBlockerId("unsupported_object", node.category, node.name),
      object_category: node.name.split(" ")[0] || "unsupported",
      object_name: node.name,
      severity: "medium" as const,
      classification: "unsupported_object" as const,
      evidence_source: node.source_locations[0]?.file || "repository migration parser",
      reason: "Repository migrations contain a database object type that the non-mutating planner inventories but does not know how to order for reconstruction.",
      resolvable_from_repository: false,
      required_capability_or_authorization: "Planner support for this object type and human review before recovery planning.",
      recommended_next_action: "Add parser/planner support or document an external provider/manual recovery step for this object type.",
      source_locations: node.source_locations,
    }));

  const unsupportedTypeBlockers = unsupportedObjectTypes
    .filter((typeName) => !unsupportedBlockers.some((blocker) => blocker.object_category === typeName))
    .map((typeName) => ({
      id: stableBlockerId("unsupported_object", "unsupported_type", typeName),
      object_category: typeName,
      object_name: typeName,
      severity: "medium" as const,
      classification: "unsupported_object" as const,
      evidence_source: "repository migration parser",
      reason: "An unsupported database object type was detected.",
      resolvable_from_repository: false,
      required_capability_or_authorization: "Planner support and human review.",
      recommended_next_action: "Classify this object type before future recovery planning.",
      source_locations: [] as SchemaDependencySourceLocation[],
    }));

  return [...cycleBlockers, ...missingBlockers, ...unsupportedBlockers, ...unsupportedTypeBlockers]
    .sort((left, right) => left.id.localeCompare(right.id));
}

function lineOf(content: string, index: number) {
  return content.slice(0, Math.max(0, index)).split("\n").length;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function addNode(nodes: Map<string, SchemaDependencyNode>, category: SchemaDependencyCategory, name: string, source: SchemaDependencySourceLocation, definitionAvailable = true) {
  const id = objectId(category, name);
  const existing = nodes.get(id);
  if (existing) {
    if (!existing.source_locations.some((item) => item.file === source.file && item.line === source.line)) existing.source_locations.push(source);
    existing.definition_available = existing.definition_available || definitionAvailable;
    return existing;
  }

  const node: SchemaDependencyNode = {
    id,
    category,
    name: normalizeName(name),
    source_locations: [source],
    definition_available: definitionAvailable,
    dependency_ids: [],
    dependency_evidence: [],
    planned_phase: phaseByCategory[category],
    validation_status: definitionAvailable ? "reviewable" : "blocked",
    blockers: definitionAvailable ? [] : ["Referenced object has no usable repository definition."],
    warnings: [],
  };
  nodes.set(id, node);
  return node;
}

function addDependency(node: SchemaDependencyNode, dependencyId: string, evidenceType: SchemaDependencyEvidenceType, source: SchemaDependencySourceLocation, details: string) {
  if (!node.dependency_ids.includes(dependencyId)) node.dependency_ids.push(dependencyId);
  if (!node.dependency_evidence.some((item) => item.dependency_id === dependencyId && item.source.file === source.file && item.source.line === source.line)) {
    node.dependency_evidence.push({ dependency_id: dependencyId, evidence_type: evidenceType, source, details });
  }
}

function eachMatch(content: string, pattern: RegExp, callback: (match: RegExpExecArray) => void) {
  pattern.lastIndex = 0;
  let match = pattern.exec(content);
  while (match) {
    callback(match);
    match = pattern.exec(content);
  }
}

function readRepositorySql(projectRoot: string): SqlFile[] {
  const migrationsDirectory = path.join(projectRoot, "supabase", "migrations");
  return collectSqlFiles(migrationsDirectory).map((relativePath) => ({
    relativePath,
    content: fs.readFileSync(path.join(migrationsDirectory, relativePath), "utf8"),
  }));
}

function parseSqlFiles(files: SqlFile[]) {
  const nodes = new Map<string, SchemaDependencyNode>();
  const unsupported = new Set<string>();

  for (const file of files) {
    const location = (index: number) => ({ file: `supabase/migrations/${file.relativePath}`, line: lineOf(file.content, index) });

    eachMatch(file.content, /\bcreate\s+extension(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_."-]+)/gi, (match) => {
      addNode(nodes, "extension", match[1], location(match.index));
    });

    eachMatch(file.content, /\bcreate\s+(?:type|domain)\s+([a-zA-Z0-9_."-]+)/gi, (match) => {
      addNode(nodes, "custom_type", match[1], location(match.index));
    });

    eachMatch(file.content, /\bcreate\s+sequence(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_."-]+)/gi, (match) => {
      addNode(nodes, "sequence", match[1], location(match.index));
    });

    eachMatch(file.content, /\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_."-]+)\s*\(([\s\S]*?)\);/gi, (match) => {
      const table = addNode(nodes, "schema_table", match[1], location(match.index));
      eachMatch(match[2], /\breferences\s+([a-zA-Z0-9_."-]+)/gi, (referenceMatch) => {
        const targetId = objectId("schema_table", referenceMatch[1]);
        addDependency(table, targetId, "explicit", location(match.index + referenceMatch.index), "Inline REFERENCES clause in CREATE TABLE.");
      });
      if (/\bprimary\s+key\b|\bunique\b|\bcheck\s*\(/i.test(match[2])) {
        const constraint = addNode(nodes, "constraint", `${match[1]} inline constraints ${sha256(match[2]).slice(0, 12)}`, location(match.index));
        addDependency(constraint, table.id, "explicit", location(match.index), "Inline table constraint depends on table definition.");
      }
    });

    eachMatch(file.content, /\balter\s+table\s+(?:only\s+)?([a-zA-Z0-9_."-]+)[\s\S]{0,1200}?\badd\s+constraint\s+([a-zA-Z0-9_."-]+)[\s\S]{0,1200}?;/gi, (match) => {
      const tableId = objectId("schema_table", match[1]);
      const category: SchemaDependencyCategory = /\bforeign\s+key\b/i.test(match[0]) ? "foreign_key" : "constraint";
      const node = addNode(nodes, category, `${match[1]}.${match[2]}`, location(match.index));
      addDependency(node, tableId, "explicit", location(match.index), "ALTER TABLE ADD CONSTRAINT depends on target table.");
      const ref = /\breferences\s+([a-zA-Z0-9_."-]+)/i.exec(match[0]);
      if (ref) addDependency(node, objectId("schema_table", ref[1]), "explicit", location(match.index), "Foreign-key constraint REFERENCES target table.");
    });

    eachMatch(file.content, /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([a-zA-Z0-9_."-]+)/gi, (match) => {
      const node = addNode(nodes, "function", match[1], location(match.index));
      const slice = file.content.slice(match.index, Math.min(file.content.length, match.index + 5000));
      eachMatch(slice, /\b(?:from|join|update|into)\s+([a-zA-Z0-9_."-]+)/gi, (tableMatch) => {
        if (isPotentialRelationReference(tableMatch[1])) {
          addDependency(node, objectId("schema_table", tableMatch[1]), "inferred", location(match.index + tableMatch.index), "Function/procedure body references a relation-like name.");
        }
      });
    });

    eachMatch(file.content, /\bcreate\s+(?:materialized\s+)?view\s+([a-zA-Z0-9_."-]+)[\s\S]*?\bas\s+([\s\S]*?);/gi, (match) => {
      const node = addNode(nodes, "view", match[1], location(match.index));
      eachMatch(match[2], /\bfrom\s+([a-zA-Z0-9_."-]+)/gi, (tableMatch) => {
        addDependency(node, objectId("schema_table", tableMatch[1]), "explicit", location(match.index + tableMatch.index), "View SELECT body references source relation.");
      });
    });

    eachMatch(file.content, /\bcreate\s+trigger\s+([a-zA-Z0-9_."-]+)[\s\S]*?\bon\s+([a-zA-Z0-9_."-]+)[\s\S]*?\bexecute\s+function\s+([a-zA-Z0-9_."-]+)/gi, (match) => {
      const node = addNode(nodes, "trigger", match[1], location(match.index));
      addDependency(node, objectId("schema_table", match[2]), "explicit", location(match.index), "Trigger ON clause identifies table dependency.");
      addDependency(node, objectId("function", match[3]), "explicit", location(match.index), "Trigger EXECUTE FUNCTION clause identifies function dependency.");
    });

    eachMatch(file.content, /\bcreate\s+(?:unique\s+)?index(?:\s+concurrently)?(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_."-]+)\s+on\s+([a-zA-Z0-9_."-]+)/gi, (match) => {
      const node = addNode(nodes, "index", match[1], location(match.index));
      addDependency(node, objectId("schema_table", match[2]), "explicit", location(match.index), "CREATE INDEX ON identifies table dependency.");
    });

    eachMatch(file.content, /\bcreate\s+policy\s+([a-zA-Z0-9_."-]+)\s+on\s+([a-zA-Z0-9_."-]+)/gi, (match) => {
      const node = addNode(nodes, "rls_policy", `${match[2]}.${match[1]}`, location(match.index));
      const statement = file.content.slice(match.index, file.content.indexOf(";", match.index) === -1 ? file.content.length : file.content.indexOf(";", match.index) + 1);
      addDependency(node, objectId("schema_table", match[2]), "explicit", location(match.index), "CREATE POLICY ON identifies table dependency.");
      if (/\bauth\./i.test(statement)) addDependency(node, objectId("function", "auth.uid"), "unknown", location(match.index), "Policy references auth helper behavior that is not defined in repository migrations.");
    });

    eachMatch(file.content, /\balter\s+table\s+([a-zA-Z0-9_."-]+)\s+(?:enable|force)\s+row\s+level\s+security/gi, (match) => {
      const node = addNode(nodes, "rls_policy", `${match[1]}.rls_state`, location(match.index));
      addDependency(node, objectId("schema_table", match[1]), "explicit", location(match.index), "RLS state depends on table definition.");
    });

    eachMatch(file.content, /\bgrant\s+[\s\S]{1,300}?\bon\s+(?:table|function|sequence|schema)?\s*([a-zA-Z0-9_."-]+)/gi, (match) => {
      addNode(nodes, "grant", `grant on ${match[1]} ${sha256(match[0]).slice(0, 12)}`, location(match.index));
    });

    eachMatch(file.content, /\bcreate\s+(aggregate|operator|collation|publication|subscription)\b/gi, (match) => {
      unsupported.add(match[1].toLowerCase());
      addNode(nodes, "unsupported", `${match[1]} ${sha256(match[0]).slice(0, 12)}`, location(match.index), false);
    });
  }

  resolvePublicSchemaDependencyAliases(nodes);

  for (const node of Array.from(nodes.values())) {
    for (const dependencyId of node.dependency_ids) {
      if (!nodes.has(dependencyId)) {
        const [, name = dependencyId] = dependencyId.split(":");
        addNode(nodes, "missing_definition", name, node.source_locations[0] || { file: "unknown", line: 1 }, false);
      }
    }
  }

  return { nodes, unsupported: Array.from(unsupported).sort() };
}

function detectCycles(nodes: SchemaDependencyNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: SchemaDependencyCycle[] = [];

  const visit = (id: string, stack: string[]) => {
    if (visiting.has(id)) {
      cycles.push({ node_ids: stack.slice(stack.indexOf(id)).concat(id) });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const node = byId.get(id);
    for (const dependencyId of (node?.dependency_ids || []).filter((item) => byId.has(item)).sort()) visit(dependencyId, stack.concat(id));
    visiting.delete(id);
    visited.add(id);
  };

  for (const node of nodes.slice().sort((left, right) => left.id.localeCompare(right.id))) visit(node.id, []);
  return cycles;
}

function orderNodes(nodes: SchemaDependencyNode[], cycles: SchemaDependencyCycle[]) {
  const cyclic = new Set(cycles.flatMap((cycle) => cycle.node_ids));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ordered: SchemaDependencyNode[] = [];
  const temporary = new Set<string>();
  const permanent = new Set<string>();

  const visit = (node: SchemaDependencyNode) => {
    if (permanent.has(node.id) || temporary.has(node.id) || cyclic.has(node.id)) return;
    temporary.add(node.id);
    for (const dependencyId of node.dependency_ids.filter((item) => byId.has(item)).sort()) visit(byId.get(dependencyId) as SchemaDependencyNode);
    temporary.delete(node.id);
    permanent.add(node.id);
    ordered.push(node);
  };

  for (const node of nodes.slice().sort((left, right) => left.planned_phase - right.planned_phase || left.id.localeCompare(right.id))) visit(node);
  ordered.forEach((node, index) => {
    node.planned_order = index + 1;
  });
}

function summarize(nodes: SchemaDependencyNode[], cycles: SchemaDependencyCycle[], unsupportedObjectTypes: string[]): SchemaDependencyPlanSummary {
  const missing = nodes.filter((node) => !node.definition_available || node.category === "missing_definition");
  const unresolvedDependencyCount = nodes.reduce((sum, node) => sum + node.dependency_ids.filter((id) => !nodes.some((candidate) => candidate.id === id || candidate.category === "missing_definition")).length, 0);
  const resolvedDependencyCount = nodes.reduce((sum, node) => sum + node.dependency_ids.length, 0) - unresolvedDependencyCount;
  const totalObjects = nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.category] = (acc[node.category] || 0) + 1;
    return acc;
  }, {});
  const classifiedBlockers = buildClassifiedBlockers(nodes, cycles, unsupportedObjectTypes);
  const blockers = classifiedBlockers.map((blocker) => `${blocker.classification}: ${blocker.object_name} — ${blocker.reason}`);
  const readiness: SchemaDependencyReadiness = nodes.length === 0
    ? "inventory_only"
    : blockers.length > 0
      ? "blocked"
      : nodes.some((node) => node.dependency_evidence.some((edge) => edge.evidence_type !== "explicit"))
        ? "partially_plannable"
        : "ready_for_review";

  return {
    total_objects_by_category: totalObjects,
    resolved_dependency_count: resolvedDependencyCount,
    unresolved_dependency_count: unresolvedDependencyCount,
    cycle_count: cycles.length,
    missing_definition_count: missing.length,
    unsupported_object_count: unsupportedObjectTypes.length,
    readiness,
    classified_blockers: classifiedBlockers,
    live_database_verified: false,
    executable_sql_generated: false,
    restore_authorized: false,
    blockers,
    warnings: [
      "This plan is derived from repository migration evidence only and does not prove live database state.",
      "The plan is review metadata only and does not generate executable SQL or authorize restore writes.",
    ],
  };
}

export function buildSchemaDependencyPlan(input: BuildSchemaDependencyPlanInput): SchemaDependencyPlan {
  const projectRoot = input.projectRoot || process.cwd();
  const files = readRepositorySql(projectRoot);
  const parsed = parseSqlFiles(files);
  const nodes = Array.from(parsed.nodes.values()).sort((left, right) => left.planned_phase - right.planned_phase || left.id.localeCompare(right.id));
  const cycles = detectCycles(nodes);
  orderNodes(nodes, cycles);

  return {
    planner_version: schemaDependencyPlannerVersion,
    input_inventory_version: input.inputInventoryVersion,
    generated_at: input.generatedAt || new Date().toISOString(),
    backup_id: input.backupId,
    source_files_examined: files.map((file) => `supabase/migrations/${file.relativePath}`),
    latest_migration_file: files.at(-1)?.relativePath ? `supabase/migrations/${files.at(-1)?.relativePath}` : undefined,
    nodes,
    cycles,
    missing_definitions: nodes.filter((node) => !node.definition_available || node.category === "missing_definition").map((node) => node.id).sort(),
    unsupported_object_types: parsed.unsupported,
    summary: summarize(nodes, cycles, parsed.unsupported),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function validateSchemaDependencyPlan(plan: unknown, backupId: string): SchemaDependencyPlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!plan) return { valid: true, legacy: true, errors, warnings: ["schema_dependency_plan is absent. Treating schema recovery metadata as inventory-only."] };
  if (!isObject(plan)) return { valid: false, legacy: false, errors: ["schema_dependency_plan must be an object."], warnings };
  if (plan.planner_version !== schemaDependencyPlannerVersion) errors.push(`schema_dependency_plan version is unsupported. Expected ${schemaDependencyPlannerVersion}.`);
  if (plan.backup_id !== backupId) errors.push("schema_dependency_plan backup_id does not match manifest backup_id.");
  if (!Array.isArray(plan.nodes)) errors.push("schema_dependency_plan nodes must be an array.");
  if (!Array.isArray(plan.cycles)) errors.push("schema_dependency_plan cycles must be an array.");
  if (!Array.isArray(plan.source_files_examined)) errors.push("schema_dependency_plan source_files_examined must be an array.");

  const summary = isObject(plan.summary) ? plan.summary : null;
  if (!summary) {
    errors.push("schema_dependency_plan summary must be an object.");
  } else {
    if (summary.live_database_verified === true) errors.push("schema_dependency_plan must not claim live database verification.");
    if (summary.executable_sql_generated === true) errors.push("schema_dependency_plan must not claim executable SQL generation.");
    if (summary.restore_authorized === true) errors.push("schema_dependency_plan must not claim restore authorization.");
    if (!["inventory_only", "partially_plannable", "blocked", "ready_for_review"].includes(String(summary.readiness))) errors.push("schema_dependency_plan readiness is unsupported.");
    if (summary.classified_blockers !== undefined && !Array.isArray(summary.classified_blockers)) errors.push("schema_dependency_plan summary classified_blockers must be an array when present.");
  }

  for (const node of Array.isArray(plan.nodes) ? plan.nodes : []) {
    if (!isObject(node)) {
      errors.push("schema_dependency_plan contains a non-object node.");
      continue;
    }
    if (!node.id || !node.category || !node.name) errors.push("schema_dependency_plan node is missing id, category, or name.");
    if (node.definition_available === false && !Array.isArray(node.blockers)) errors.push(`schema_dependency_plan node ${String(node.id || "unknown")} lacks blockers for missing definition.`);
    if (!Array.isArray(node.dependency_evidence)) errors.push(`schema_dependency_plan node ${String(node.id || "unknown")} dependency_evidence must be an array.`);
  }

  return { valid: errors.length === 0, legacy: false, errors, warnings };
}