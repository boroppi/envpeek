import { describe, expect, it } from 'vitest';

import { renderJson, toJsonReport } from '../src/output/json.js';
import { noDuplicates, sampleSafeVariables, TEST_SECRETS } from './helpers.js';

describe('json output', () => {
  it('emits valid JSON without raw secrets or a value key', () => {
    const report = toJsonReport({
      file: '.env.local',
      variables: sampleSafeVariables(),
      git: { available: true, repository: true, ignored: true, tracked: false },
      duplicates: noDuplicates(),
    });
    const text = renderJson(report);
    const parsed = JSON.parse(text) as typeof report;
    expect(parsed.variables[0]?.maskedValue).toBe('https://example.com');
    expect(parsed.security.sensitiveVariableCount).toBe(3);
    expect(text).not.toContain('"value"');
    for (const secret of TEST_SECRETS) {
      expect(text).not.toContain(secret);
    }
  });
});
