import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { EXIT } from '../src/constants.js';
import { run } from '../src/run.js';

const exec = promisify(execFile);

describe('ci mode', () => {
  it('prints a concise PASS report without values', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-ci-pass-'));
    await writeFile(
      join(dir, '.env'),
      'NEXT_PUBLIC_API_URL=https://example.com\nSECRET=THIS_IS_A_TEST_SECRET_123456789\n',
    );
    const result = await run({
      argv: ['--ci'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.OK);
    expect(result.stdout).toContain('PASS');
    expect(result.stdout).toContain('envpeek CI check');
    expect(result.stdout).not.toContain('THIS_IS_A_TEST_SECRET_123456789');
  });

  it('fails when a tracked file is inspected with --fail-if-tracked', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-ci-track-'));
    await exec('git', ['init'], { cwd: dir });
    await exec('git', ['config', 'user.email', 'envpeek@example.com'], { cwd: dir });
    await exec('git', ['config', 'user.name', 'envpeek'], { cwd: dir });
    await writeFile(join(dir, '.env'), 'FOO=bar\n');
    await exec('git', ['add', '-f', '.env'], { cwd: dir });

    const result = await run({
      argv: ['--ci', '--fail-if-tracked'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.POLICY);
    expect(result.stdout).toContain('FAIL');
    expect(result.stdout).toMatch(/tracked/i);
    expect(result.stdout).not.toContain('bar');
  });

  it('fails when an unignored file is inspected with --fail-if-unignored', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-ci-ignore-'));
    await exec('git', ['init'], { cwd: dir });
    await writeFile(join(dir, '.env'), 'FOO=bar\n');

    const result = await run({
      argv: ['--ci', '--fail-if-unignored'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.POLICY);
    expect(result.stdout).toContain('FAIL');
  });
});
