import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseCliArgs } from '../src/args.js';
import { loadConfig, mergeConfig } from '../src/config.js';
import { ConfigError } from '../src/utils/errors.js';

describe('config', () => {
  it('returns undefined when the config file is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-noconfig-'));
    expect(await loadConfig(dir)).toBeUndefined();
  });

  it('loads a valid config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-config-'));
    await writeFile(
      join(dir, '.envpeek.json'),
      JSON.stringify({
        files: ['.env'],
        failIfTracked: true,
        sensitivePatterns: ['*_CREDENTIAL'],
      }),
    );
    const config = await loadConfig(dir);
    expect(config?.files).toEqual(['.env']);
    expect(config?.failIfTracked).toBe(true);
    expect(config?.sensitivePatterns).toEqual(['*_CREDENTIAL']);
  });

  it('rejects invalid JSON without echoing planted secrets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-badjson-'));
    await writeFile(join(dir, '.envpeek.json'), '{ SUPER_SECRET_PASSWORD');
    expect.assertions(2);
    try {
      await loadConfig(dir);
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect(String(err)).not.toContain('SUPER_SECRET_PASSWORD');
    }
  });

  it('rejects wrong types', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-badtype-'));
    await writeFile(join(dir, '.envpeek.json'), JSON.stringify({ failIfTracked: 'yes' }));
    await expect(loadConfig(dir)).rejects.toBeInstanceOf(ConfigError);
  });

  it('lets CLI --file override configured files and ORs policy flags', () => {
    const args = parseCliArgs(['--file', '.env.staging', '--fail-if-unignored']);
    const merged = mergeConfig(
      { files: ['.env'], failIfTracked: true, sensitivePatterns: ['X'] },
      args,
    );
    expect(merged.files).toEqual(['.env']);
    expect(args.file).toBe('.env.staging');
    expect(merged.failIfTracked).toBe(true);
    expect(merged.failIfUnignored).toBe(true);
    expect(merged.sensitivePatterns).toEqual(['X']);
  });
});
