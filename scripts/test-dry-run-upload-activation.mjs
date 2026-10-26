import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import Module from "node:module";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import zlib from "node:zlib";
import ts from "typescript";

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

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dry-run-upload-test-"));
const compiledDir = path.join(tempRoot, "compiled");
fs.mkdirSync(compiledDir, { recursive: true });

function compileModule(sourcePath) {
  const outputPath = path.join(compiledDir, sourcePath.replace(/^src\//, "").replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      skipLibCheck: true,
    },
    fileName: sourcePath,
  }).outputText;
  fs.writeFileSync(outputPath, transpiled);
  return outputPath;
}

const modulePaths = new Map();
[
  "src/lib/server/backupConfig.ts",
  "src/lib/server/completeRecoveryManifest.ts",
  "src/lib/server/restorePointConsistencyManifest.ts",
  "src/lib/server/schemaDependencyPlanner.ts",
  "src/lib/server/databaseSchemaRecoveryManifest.ts",
  "src/lib/server/backupValidator.ts",
  "src/lib/server/backupRestoreArchive.ts",
  "src/lib/server/backupRestorePreflight.ts",
  "src/lib/server/backupRestoreEngine.ts",
  "src/pages/api/admin/backups/restore-upload.ts",
].forEach((sourcePath) => {
  modulePaths.set(`@/${sourcePath.replace(/^src\//, "").replace(/\.ts$/, "")}`, compileModule(sourcePath));
});

const writeCalls = [];
const mockAdmin = {
  from(table) {
    writeCalls.push(`from:${table}`);
    throw new Error(`Unexpected database access during dry-run upload test: ${table}`);
  },
  storage: {
    from(bucket) {
      writeCalls.push(`storage:${bucket}`);
      throw new Error(`Unexpected storage access during dry-run upload test: ${bucket}`);
    },
  },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@/lib/server/adminAuth") {
    return {
      createServiceClient: () => mockAdmin,
      requireSuperAdmin: async () => "superadmin-test-user",
    };
  }

  if (request === "@/lib/server/backupEngine") {
    return {
      createBackupPackage: async () => {
        writeCalls.push("createBackupPackage");
        throw new Error("createBackupPackage must not run during dry-run upload validation");
      },
    };
  }

  if (modulePaths.has(request)) {
    return originalLoad.call(this, modulePaths.get(request), parent, isMain);
  }

  return originalLoad.call(this, request, parent, isMain);
};

function tarHeader(name, size) {
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, Math.min(Buffer.byteLength(name), 100), "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(size.toString(8).padStart(11, "0") + "\0", 124, 12, "ascii");
  header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0", 136, 12, "ascii");
  header.fill(" ", 148, 156);
  header.write("0", 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");

  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
  return header;
}

function createTarGz(entries) {
  const chunks = [];
  for (const entry of entries) {
    const content = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content);
    chunks.push(tarHeader(entry.name, content.length));
    chunks.push(content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) chunks.push(Buffer.alloc(padding, 0));
  }
  chunks.push(Buffer.alloc(1024, 0));
  return zlib.gzipSync(Buffer.concat(chunks));
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function buildMinimalBackupArchive(backupConfig) {
  const entries = [];
  const tables = backupConfig.requiredTables.map((table) => {
    const content = Buffer.alloc(0);
    const archivePath = `database/${table}.jsonl`;
    entries.push({ name: archivePath, content });
    return {
      table,
      path: archivePath,
      record_count: 0,
      bytes: content.length,
      sha256: sha256(content),
    };
  });

  const buckets = backupConfig.requiredBuckets.map((bucket) => ({
    bucket,
    object_count: 0,
    total_bytes: 0,
    objects: [],
  }));

  const manifest = {
    app: "aruba-royalty-stamp",
    backup_id: "dry-run-upload-focused-test",
    backup_version: backupConfig.backupVersion,
    package_format: "tar.gz",
    created_at: "2026-10-26T20:24:40.000Z",
    tables,
    buckets,
    row_counts: Object.fromEntries(backupConfig.requiredTables.map((table) => [table, 0])),
    total_database_bytes: 0,
    total_storage_bytes: 0,
    file_list: tables.map((table) => ({
      path: table.path,
      size: table.bytes,
      sha256: table.sha256,
    })),
    sha256_checksums: Object.fromEntries(tables.map((table) => [table.path, table.sha256])),
  };

  entries.push({ name: "manifest.json", content: Buffer.from(JSON.stringify(manifest, null, 2)) });
  return createTarGz(entries);
}

function createMockResponse() {
  const response = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return response;
}

try {
  const backupConfig = await import(modulePaths.get("@/lib/server/backupConfig"));
  const archive = buildMinimalBackupArchive(backupConfig);
  const handlerModule = await import(modulePaths.get("@/pages/api/admin/backups/restore-upload"));
  const handler = handlerModule.default?.default || handlerModule.default || handlerModule;

  assert.equal(typeof handler, "function");

  const req = Readable.from(archive);
  req.method = "POST";
  req.headers = {
    authorization: "Bearer test-superadmin",
    "content-type": "application/gzip",
    "x-backup-filename": encodeURIComponent("royalty-stamp-focused-test.tar.gz"),
    "x-restore-mode": "dry_run",
    "x-restore-confirmation": encodeURIComponent("RESTORE ROYALTY STAMP BACKUP"),
  };

  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.success, false);
  assert.equal(res.body.report.restore_mode, "dry_run");
  assert.match(res.body.report.restore_job_id, /^dry-run-/);
  assert.equal(res.body.report.validation.file_name, "royalty-stamp-focused-test.tar.gz");
  assert.equal(res.body.report.validation.valid, true);
  assert.equal(res.body.report.restored_records, 0);
  assert.equal(res.body.report.restored_files, 0);
  assert.equal(writeCalls.length, 0);
  assert.deepEqual(res.body.report.preflight.destructive_write_blockers, [
    "Restore destination label is required before write-enabled restore.",
    "Restore destination project reference is required before write-enabled restore.",
    "Restore writes require the explicit server-side confirmation flag.",
  ]);
} finally {
  Module._load = originalLoad;
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("dry run upload activation tests passed");