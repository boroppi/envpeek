import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { toSafeVariables } from '../src/env/classifier.js';
import { parseEnv } from '../src/env/parser.js';
import { renderJson, toJsonReport } from '../src/output/json.js';
import { renderTerminal } from '../src/output/terminal.js';
import { ParseError } from '../src/utils/errors.js';
import { assertNoSecrets, gitNone, TEST_SECRETS } from './helpers.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');

describe('secret leakage regression', () => {
  it('never prints recognizable secrets in terminal, JSON, errors, or debug-shaped strings', async () => {
    const file = join(fixtures, 'secrets.env');
    const content = await readFile(file, 'utf8');
    const parsed = parseEnv(content, file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const variables = toSafeVariables(parsed.assignments, parsed.duplicates);

    const terminal = renderTerminal({
      file,
      variables,
      git: gitNone(),
      duplicates: parsed.duplicates,
      colorEnabled: false,
      unicode: false,
      ci: false,
      revealed: false,
    });
    assertNoSecrets(terminal);

    const json = renderJson(
      toJsonReport({
        file,
        variables,
        git: gitNone(),
        duplicates: parsed.duplicates,
      }),
    );
    assertNoSecrets(json);
    const parsedJson: unknown = JSON.parse(json);
    expect(jsonHasKey(parsedJson, 'value')).toBe(false);

    const parseError = new ParseError(file, 2);
    assertNoSecrets(parseError.message);
    assertNoSecrets(String(parseError));

    const debug = [
      `Loaded file: ${file}`,
      `Variables found: ${variables.length}`,
      `Sensitive variables: 4`,
      `Private keys: 0`,
      `Git available: false`,
      `Git repository: false`,
      `Git tracked: null`,
      `Git ignored: null`,
    ].join('\n');
    assertNoSecrets(debug);

    const duplicateMessage =
      'PASSWORD appears 2 times. The final definition may override the earlier definition.';
    assertNoSecrets(duplicateMessage);

    for (const secret of TEST_SECRETS) {
      expect(terminal.includes(secret)).toBe(false);
      expect(json.includes(secret)).toBe(false);
    }
  });
});

function jsonHasKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => jsonHasKey(item, key));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([entryKey, entryValue]) => entryKey === key || jsonHasKey(entryValue, key),
    );
  }
  return false;
}
