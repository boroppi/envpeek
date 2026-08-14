import { access, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONFIG_NAME, DEFAULT_ENV_CANDIDATES, MAX_FILE_BYTES } from '../constants.js';
import { ConfigError, FileError } from './errors.js';

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readEnvFile(path: string): Promise<string> {
  let info;
  try {
    info = await stat(path);
  } catch {
    throw new FileError(path, `File not found: ${path}`);
  }

  if (!info.isFile()) {
    throw new FileError(path, `Not a file: ${path}`);
  }

  if (info.size > MAX_FILE_BYTES) {
    throw new FileError(path, `File exceeds the 1 MiB size limit: ${path}`);
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(path);
  } catch {
    throw new FileError(path, `Unable to read file: ${path}`);
  }

  if (buffer.includes(0)) {
    throw new FileError(path, `File does not look like a text .env file: ${path}`);
  }

  return buffer.toString('utf8');
}

export async function resolvePackageRoot(startDir?: string): Promise<string> {
  const start = startDir ?? dirname(fileURLToPath(import.meta.url));

  let dir = start;
  for (;;) {
    const candidate = join(dir, 'package.json');
    if (await fileExists(candidate)) {
      try {
        const raw = await readFile(candidate, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'name' in parsed &&
          (parsed as { name?: unknown }).name === 'envpeek'
        ) {
          return dir;
        }
      } catch {
        // keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new FileError(candidate, 'Unable to locate the envpeek package root.');
    }
    dir = parent;
  }
}

export async function readPackageVersion(): Promise<string> {
  const root = await resolvePackageRoot();
  const raw = await readFile(join(root, 'package.json'), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    typeof (parsed as { version?: unknown }).version === 'string'
  ) {
    return (parsed as { version: string }).version;
  }
  throw new FileError(join(root, 'package.json'), 'package.json is missing a version field.');
}

export async function resolveDefaultFile(cwd: string): Promise<string | undefined> {
  for (const name of DEFAULT_ENV_CANDIDATES) {
    const candidate = resolve(cwd, name);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function configPath(cwd: string): string {
  return resolve(cwd, CONFIG_NAME);
}

export { ConfigError };
