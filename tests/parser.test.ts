import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseEnv } from '../src/env/parser.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');

async function parseFixture(name: string) {
  const file = join(fixtures, name);
  const content = await readFile(file, 'utf8');
  return parseEnv(content, file);
}

describe('parser', () => {
  it('parses basic assignments', async () => {
    const result = await parseFixture('basic.env');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.assignments).toEqual([
      { name: 'FOO', rawValue: 'bar', line: 1 },
      { name: 'HELLO', rawValue: 'world', line: 2 },
    ]);
  });

  it('parses quoted values', async () => {
    const result = await parseFixture('quoted.env');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.assignments[0]).toMatchObject({ name: 'FOO', rawValue: 'hello world' });
    expect(result.assignments[1]).toMatchObject({ name: 'BAR', rawValue: 'single quoted' });
  });

  it('ignores comments', async () => {
    const result = await parseFixture('comments.env');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.assignments.map((item) => item.name)).toEqual(['FOO', 'BAZ']);
  });

  it('parses empty values', async () => {
    const result = await parseFixture('empty.env');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.assignments[0]).toMatchObject({ name: 'FOO', rawValue: '' });
    expect(result.assignments[1]).toMatchObject({ name: 'API_KEY', rawValue: '' });
    expect(result.assignments[2]).toMatchObject({ name: 'BLANK', rawValue: '' });
  });

  it('records duplicate definitions', async () => {
    const result = await parseFixture('duplicates.env');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.assignments).toHaveLength(2);
    expect(result.duplicates).toEqual([{ name: 'FOO', lines: [1, 2], count: 2 }]);
    expect(result.assignments[1]?.rawValue).toBe('two');
  });

  it('does not expand interpolation', async () => {
    const result = await parseFixture('interpolation.env');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.assignments[1]?.rawValue).toBe('${API_URL}/api');
  });

  it('reports malformed syntax by line number only', async () => {
    const result = await parseFixture('malformed.env');
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.line).toBe(2);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('supersecret');
    expect(serialized).not.toContain('DATABASE_PASSWORD=supersecret');
  });
});
