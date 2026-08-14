import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { EXIT } from '../src/constants.js';
import { run } from '../src/run.js';
import {
  exitCodeFor,
  UsageError,
  FileError,
  ConfigError,
  ParseError,
  PolicyError,
} from '../src/utils/errors.js';

describe('exit codes', () => {
  it('maps error classes to stable public codes', () => {
    expect(exitCodeFor(new UsageError('nope'))).toBe(EXIT.USAGE);
    expect(exitCodeFor(new PolicyError('nope'))).toBe(EXIT.POLICY);
    expect(exitCodeFor(new FileError('x', 'nope'))).toBe(EXIT.IO);
    expect(exitCodeFor(new ConfigError('x', 'nope'))).toBe(EXIT.IO);
    expect(exitCodeFor(new ParseError('x', 1))).toBe(EXIT.IO);
  });

  it('returns 0 for a clean inspect', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-ok-'));
    await writeFile(join(dir, '.env'), 'FOO=bar\n');
    const result = await run({ argv: [], cwd: dir, stdoutIsTTY: false, stdinIsTTY: false });
    expect(result.exitCode).toBe(EXIT.OK);
  });

  it('returns 2 for unknown flags', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-usage-'));
    await expect(run({ argv: ['--explode'], cwd: dir })).rejects.toBeInstanceOf(UsageError);
  });

  it('returns 2 when --show is used without a TTY or --yes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-show-'));
    await writeFile(join(dir, '.env'), 'SECRET=THIS_IS_A_TEST_SECRET_123456789\n');
    const result = await run({
      argv: ['--show'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.USAGE);
    expect(result.stdout + result.stderr).not.toContain('THIS_IS_A_TEST_SECRET_123456789');
  });

  it('returns 2 for --json --show without --yes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-jsonshow-'));
    await writeFile(join(dir, '.env'), 'SECRET=THIS_IS_A_TEST_SECRET_123456789\n');
    const result = await run({
      argv: ['--json', '--show'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.USAGE);
    expect(result.stdout).not.toContain('THIS_IS_A_TEST_SECRET_123456789');
  });

  it('returns 2 for --ci --show', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-cishow-'));
    await writeFile(join(dir, '.env'), 'FOO=bar\n');
    await expect(
      run({ argv: ['--ci', '--show'], cwd: dir, stdoutIsTTY: false, stdinIsTTY: false }),
    ).rejects.toBeInstanceOf(UsageError);
  });

  it('returns 3 for a missing file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-missing-'));
    await expect(run({ argv: ['--file', 'nope.env'], cwd: dir })).rejects.toBeInstanceOf(FileError);
  });

  it('returns 3 for invalid config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-badcfg-'));
    await writeFile(join(dir, '.env'), 'FOO=bar\n');
    await writeFile(join(dir, '.envpeek.json'), '{');
    await expect(run({ argv: [], cwd: dir })).rejects.toBeInstanceOf(ConfigError);
  });

  it('returns 3 for malformed env', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-badenv-'));
    await writeFile(join(dir, '.env'), 'not valid DATABASE_PASSWORD=supersecret\n');
    await expect(run({ argv: [], cwd: dir })).rejects.toBeInstanceOf(ParseError);
  });
});
