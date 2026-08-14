import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { isIgnored } from '../src/git/ignored.js';
import { findGitRoot, isGitAvailable } from '../src/git/repository.js';
import { isTracked } from '../src/git/tracked.js';

const exec = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<void> {
  await exec('git', args, { cwd });
}

describe('git integration', () => {
  it('reports ignored, unignored, and tracked files in a temp repository', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-git-'));
    await git(dir, ['init']);
    await git(dir, ['config', 'user.email', 'envpeek@example.com']);
    await git(dir, ['config', 'user.name', 'envpeek']);

    await writeFile(join(dir, '.gitignore'), '.env\n');
    await writeFile(join(dir, '.env'), 'FOO=bar\n');
    await writeFile(join(dir, '.env.local'), 'FOO=bar\n');
    await writeFile(join(dir, '.env.tracked'), 'FOO=bar\n');

    const root = await findGitRoot(dir);
    expect(root).toBeTruthy();

    expect(await isIgnored(join(dir, '.env'), dir)).toBe(true);
    expect(await isTracked(join(dir, '.env'), dir)).toBe(false);

    expect(await isIgnored(join(dir, '.env.local'), dir)).toBe(false);
    expect(await isTracked(join(dir, '.env.local'), dir)).toBe(false);

    await git(dir, ['add', '-f', '.env.tracked']);
    expect(await isTracked(join(dir, '.env.tracked'), dir)).toBe(true);
  });

  it('handles a non-git directory without throwing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-nogit-'));
    const nested = join(dir, 'nested');
    await mkdir(nested);
    await writeFile(join(nested, '.env'), 'FOO=bar\n');

    expect(await isGitAvailable(nested)).toBe(true);
    expect(await findGitRoot(nested)).toBeNull();
    expect(await isIgnored(join(nested, '.env'), nested)).not.toBe(true);
    expect(await isTracked(join(nested, '.env'), nested)).not.toBe(true);
  });
});
