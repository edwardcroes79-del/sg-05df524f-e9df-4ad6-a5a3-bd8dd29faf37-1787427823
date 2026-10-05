import crypto from "crypto";
import fs from "fs";
import path from "path";
import { once } from "events";
import zlib from "zlib";

export function safeArchivePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.\./g, "_");
}

export function sha256Buffer(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function writeChunk(stream: NodeJS.WritableStream, chunk: Buffer) {
  if (!stream.write(chunk)) {
    await once(stream, "drain");
  }
}

function writeTarString(header: Buffer, value: string, offset: number, length: number) {
  header.write(value.slice(0, length), offset, length, "utf8");
}

function writeTarOctal(header: Buffer, value: number, offset: number, length: number) {
  const octal = value.toString(8).padStart(length - 1, "0").slice(0, length - 1);
  header.write(octal + "\0", offset, length, "ascii");
}

function splitTarName(name: string) {
  if (Buffer.byteLength(name) <= 100) {
    return { name, prefix: "" };
  }

  const parts = name.split("/");
  let fileName = parts.pop() || "";
  let prefix = parts.join("/");

  while (Buffer.byteLength(fileName) > 100 && prefix) {
    fileName = `${prefix.split("/").pop()}/${fileName}`;
    prefix = prefix.split("/").slice(0, -1).join("/");
  }

  if (Buffer.byteLength(fileName) > 100 || Buffer.byteLength(prefix) > 155) {
    const digest = crypto.createHash("sha1").update(name).digest("hex");
    fileName = `${digest}-${path.basename(name)}`.slice(0, 100);
    prefix = path.dirname(name).slice(0, 155);
  }

  return { name: fileName, prefix };
}

function createTarHeader(filePath: string, size: number) {
  const header = Buffer.alloc(512, 0);
  const split = splitTarName(safeArchivePath(filePath));
  writeTarString(header, split.name, 0, 100);
  writeTarOctal(header, 0o644, 100, 8);
  writeTarOctal(header, 0, 108, 8);
  writeTarOctal(header, 0, 116, 8);
  writeTarOctal(header, size, 124, 12);
  writeTarOctal(header, Math.floor(Date.now() / 1000), 136, 12);
  header.fill(" ", 148, 156);
  writeTarString(header, "0", 156, 1);
  writeTarString(header, "ustar", 257, 6);
  writeTarString(header, "00", 263, 2);
  writeTarString(header, split.prefix, 345, 155);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeTarOctal(header, checksum, 148, 8);
  return header;
}

export async function addBufferToTar(gzip: zlib.Gzip, filePath: string, buffer: Buffer) {
  await writeChunk(gzip, createTarHeader(filePath, buffer.length));
  await writeChunk(gzip, buffer);

  const padding = (512 - (buffer.length % 512)) % 512;
  if (padding > 0) {
    await writeChunk(gzip, Buffer.alloc(padding));
  }
}

export async function addFileToTar(gzip: zlib.Gzip, archivePath: string, sourcePath: string, size: number) {
  await writeChunk(gzip, createTarHeader(archivePath, size));
  const stream = fs.createReadStream(sourcePath);

  for await (const chunk of stream) {
    await writeChunk(gzip, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const padding = (512 - (size % 512)) % 512;
  if (padding > 0) {
    await writeChunk(gzip, Buffer.alloc(padding));
  }
}

export async function finishTar(gzip: zlib.Gzip) {
  await writeChunk(gzip, Buffer.alloc(1024));
  gzip.end();
}