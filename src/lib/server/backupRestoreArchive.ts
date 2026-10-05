import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import type { BackupManifest } from "@/lib/server/backupConfig";

export type ExtractedArchiveEntry = {
  archivePath: string;
  filePath: string;
  size: number;
  sha256: string;
  newlineCount: number;
};

export type ExtractedBackupArchive = {
  rootDir: string;
  manifest: BackupManifest;
  entries: Map<string, ExtractedArchiveEntry>;
};

function parseTarString(buffer: Buffer, start: number, length: number) {
  return buffer.subarray(start, start + length).toString("utf8").replace(/\0.*$/, "").trim();
}

function parseTarOctal(buffer: Buffer, start: number, length: number) {
  const value = parseTarString(buffer, start, length).replace(/\0/g, "").trim();
  return value ? Number.parseInt(value, 8) : 0;
}

function isZeroBlock(buffer: Buffer) {
  return buffer.every((byte) => byte === 0);
}

function isSafeArchivePath(archivePath: string) {
  if (!archivePath || archivePath.startsWith("/") || archivePath.includes("\\") || /^[a-zA-Z]:/.test(archivePath)) return false;
  return archivePath.split("/").every((part) => part !== ".." && part !== "");
}

function countNewlines(buffer: Buffer) {
  let count = 0;
  for (const byte of buffer) {
    if (byte === 10) count += 1;
  }
  return count;
}

function resolveSafePath(rootDir: string, archivePath: string) {
  if (!isSafeArchivePath(archivePath)) {
    throw new Error(`Unsafe archive path rejected: ${archivePath}`);
  }

  const resolved = path.resolve(rootDir, archivePath);
  const normalizedRoot = path.resolve(rootDir);

  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`Archive path escapes restore directory: ${archivePath}`);
  }

  return resolved;
}

export async function extractBackupArchive(filePath: string, extractRootDir: string): Promise<ExtractedBackupArchive> {
  const rootDir = path.join(extractRootDir, "archive");
  await fs.promises.mkdir(rootDir, { recursive: true });

  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  const iterator = stream[Symbol.asyncIterator]();
  const entries = new Map<string, ExtractedArchiveEntry>();
  let buffer = Buffer.alloc(0);

  const pull = async () => {
    const next = await iterator.next();
    if (next.done) return false;
    const chunk = Buffer.isBuffer(next.value) ? next.value : Buffer.from(next.value);
    buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
    return true;
  };

  const fill = async (size: number) => {
    while (buffer.length < size) {
      const hasMore = await pull();
      if (!hasMore) throw new Error("Archive ended unexpectedly");
    }
  };

  const skipBytes = async (size: number) => {
    let remaining = size;
    while (remaining > 0) {
      if (buffer.length === 0) {
        const hasMore = await pull();
        if (!hasMore) throw new Error("Archive ended unexpectedly while skipping bytes");
      }

      const take = Math.min(remaining, buffer.length);
      buffer = buffer.subarray(take);
      remaining -= take;
    }
  };

  const writeEntry = async (archivePath: string, size: number) => {
    const targetPath = resolveSafePath(rootDir, archivePath);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

    const output = fs.createWriteStream(targetPath, { flags: "wx" });
    const hash = crypto.createHash("sha256");
    let remaining = size;
    let newlineCount = 0;

    try {
      while (remaining > 0) {
        if (buffer.length === 0) {
          const hasMore = await pull();
          if (!hasMore) throw new Error(`Archive ended unexpectedly while reading ${archivePath}`);
        }

        const take = Math.min(remaining, buffer.length);
        const chunk = buffer.subarray(0, take);
        hash.update(chunk);
        newlineCount += countNewlines(chunk);

        if (!output.write(chunk)) {
          await new Promise<void>((resolve) => output.once("drain", resolve));
        }

        buffer = buffer.subarray(take);
        remaining -= take;
      }
    } finally {
      output.end();
      await new Promise<void>((resolve, reject) => {
        output.once("finish", resolve);
        output.once("error", reject);
      });
    }

    const padding = (512 - (size % 512)) % 512;
    if (padding > 0) await skipBytes(padding);

    entries.set(archivePath, {
      archivePath,
      filePath: targetPath,
      size,
      sha256: hash.digest("hex"),
      newlineCount,
    });
  };

  while (true) {
    await fill(512);
    const header = buffer.subarray(0, 512);
    buffer = buffer.subarray(512);

    if (isZeroBlock(header)) break;

    const name = parseTarString(header, 0, 100);
    const prefix = parseTarString(header, 345, 155);
    const archivePath = prefix ? `${prefix}/${name}` : name;
    const size = parseTarOctal(header, 124, 12);
    const typeFlag = parseTarString(header, 156, 1) || "0";

    if (!isSafeArchivePath(archivePath)) {
      throw new Error(`Unsafe archive path rejected: ${archivePath}`);
    }

    if (typeFlag !== "0") {
      await skipBytes(size + ((512 - (size % 512)) % 512));
      continue;
    }

    await writeEntry(archivePath, size);
  }

  const manifestEntry = entries.get("manifest.json");
  if (!manifestEntry) {
    throw new Error("manifest.json is missing from the backup archive");
  }

  const manifest = JSON.parse(await fs.promises.readFile(manifestEntry.filePath, "utf8")) as BackupManifest;

  return {
    rootDir,
    manifest,
    entries,
  };
}