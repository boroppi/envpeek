import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { EXIT } from '../src/constants.js';
import { run } from '../src/run.js';

const MIXED = [
  'NEXT_PUBLIC_API_URL=https://example.com',
  'DATABASE_URL=postgresql://admin:SUPER_SECRET_PASSWORD@example.com/db',
  'STRIPE_SECRET_KEY=sk_live_FAKE_SECRET_123',
  'JWT_SECRET=THIS_IS_A_FAKE_JWT_SECRET',
  '',
].join('\n');

const FORBIDDEN = ['SUPER_SECRET_PASSWORD', 'sk_live_FAKE_SECRET_123', 'THIS_IS_A_FAKE_JWT_SECRET'];

describe('integration', () => {
  it('prints help and version', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-help-'));
    const help = await run({ argv: ['--help'], cwd: dir });
    expect(help.exitCode).toBe(EXIT.OK);
    expect(help.stdout).toContain('Usage');

    const version = await run({ argv: ['--version'], cwd: dir });
    expect(version.exitCode).toBe(EXIT.OK);
    expect(version.stdout.trim()).toBe('0.1.1');
  });

  it('masks Supabase service role keys in default output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-supabase-'));
    await writeFile(
      join(dir, '.env'),
      [
        'NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FAKE_SERVICE_ROLE',
        'DIRECT_URL=postgresql://postgres:REAL_DB_PASSWORD@db.xyz.supabase.co:5432/postgres',
        '',
      ].join('\n'),
    );
    const result = await run({
      argv: [],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.OK);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain('https://xyz.supabase.co');
    expect(combined).not.toContain('FAKE_SERVICE_ROLE');
    expect(combined).not.toContain('REAL_DB_PASSWORD');
    expect(combined).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('masks secrets in default, JSON, and CI output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-int-'));
    await writeFile(join(dir, '.env'), MIXED);

    for (const argv of [[], ['--json'], ['--ci']]) {
      const result = await run({
        argv,
        cwd: dir,
        stdoutIsTTY: false,
        stdinIsTTY: false,
      });
      expect(result.exitCode).toBe(EXIT.OK);
      const combined = result.stdout + result.stderr;
      for (const secret of FORBIDDEN) {
        expect(combined).not.toContain(secret);
      }
    }

    const json = await run({
      argv: ['--json'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    const parsed = JSON.parse(json.stdout) as { variables: unknown };
    expect(parsed.variables).toBeTruthy();
  });

  it('prefers .env.local over .env', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-pref-'));
    await writeFile(join(dir, '.env'), 'FROM=env\n');
    await writeFile(join(dir, '.env.local'), 'FROM=local\n');
    const result = await run({ argv: ['--json'], cwd: dir, stdoutIsTTY: false });
    expect(result.stdout).toContain('.env.local');
    expect(result.stdout).toContain('local');
  });

  it('inspects a file from a nested directory via --file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-nest-'));
    await writeFile(join(dir, '.env'), MIXED);
    const nested = join(dir, 'apps', 'web');
    await mkdir(nested, { recursive: true });

    const result = await run({
      argv: ['--file', join('..', '..', '.env'), '--json'],
      cwd: nested,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.OK);
    const combined = result.stdout + result.stderr;
    for (const secret of FORBIDDEN) {
      expect(combined).not.toContain(secret);
    }
  });

  it('reveals values only with --show --yes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-reveal-'));
    await writeFile(join(dir, '.env'), MIXED);
    const result = await run({
      argv: ['--show', '--yes'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.OK);
    expect(result.stdout).toContain('SUPER_SECRET_PASSWORD');
  });

  it('never reveals PEM private keys even with --show --yes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-pem-'));
    await writeFile(
      join(dir, '.env'),
      'PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMII_FAKE_PEM_BODY\\n-----END PRIVATE KEY-----"\n',
    );
    const result = await run({
      argv: ['--json', '--show', '--yes'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.exitCode).toBe(EXIT.OK);
    expect(result.stdout).not.toContain('MII_FAKE_PEM_BODY');
    expect(result.stdout).not.toContain('BEGIN PRIVATE KEY');
    expect(result.stdout).not.toContain('"revealedValue"');
  });

  it('writes debug details to stderr without values', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'envpeek-debug-'));
    await writeFile(join(dir, '.env'), MIXED);
    const result = await run({
      argv: ['--debug'],
      cwd: dir,
      stdoutIsTTY: false,
      stdinIsTTY: false,
    });
    expect(result.stderr).toContain('Loaded file:');
    expect(result.stderr).toContain('Variables found:');
    for (const secret of FORBIDDEN) {
      expect(result.stderr).not.toContain(secret);
    }
  });
});
