import { readFile } from 'node:fs/promises';

import type { CliArgs, EnvpeekConfig } from './types.js';
import { ConfigError } from './utils/errors.js';
import { configPath, fileExists } from './utils/files.js';

export async function loadConfig(cwd: string): Promise<EnvpeekConfig | undefined> {
  const path = configPath(cwd);
  if (!(await fileExists(path))) {
    return undefined;
  }

  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new ConfigError(path, `Unable to read configuration file: ${path}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(path, `Invalid JSON in configuration file: ${path}`);
  }

  return validateConfig(parsed, path);
}

function validateConfig(value: unknown, path: string): EnvpeekConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(path, `Configuration must be a JSON object: ${path}`);
  }

  const input = value as Record<string, unknown>;
  const result: EnvpeekConfig = {};

  if ('files' in input) {
    result.files = expectStringArray(input.files, path, 'files');
  }
  if ('failIfTracked' in input) {
    result.failIfTracked = expectBoolean(input.failIfTracked, path, 'failIfTracked');
  }
  if ('failIfUnignored' in input) {
    result.failIfUnignored = expectBoolean(input.failIfUnignored, path, 'failIfUnignored');
  }
  if ('failIfPrivateKey' in input) {
    result.failIfPrivateKey = expectBoolean(input.failIfPrivateKey, path, 'failIfPrivateKey');
  }
  if ('sensitivePatterns' in input) {
    result.sensitivePatterns = expectStringArray(
      input.sensitivePatterns,
      path,
      'sensitivePatterns',
    );
  }

  return result;
}

function expectBoolean(value: unknown, path: string, key: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ConfigError(path, `Configuration key "${key}" must be a boolean.`, key);
  }
  return value;
}

function expectStringArray(value: unknown, path: string, key: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw new ConfigError(
      path,
      `Configuration key "${key}" must be an array of non-empty strings.`,
      key,
    );
  }
  return value as string[];
}

export function mergeConfig(config: EnvpeekConfig | undefined, args: CliArgs): EnvpeekConfig {
  return {
    files: config?.files,
    failIfTracked: args.failIfTracked || config?.failIfTracked === true,
    failIfUnignored: args.failIfUnignored || config?.failIfUnignored === true,
    failIfPrivateKey: args.failIfPrivateKey || config?.failIfPrivateKey === true,
    sensitivePatterns: config?.sensitivePatterns ?? [],
  };
}
