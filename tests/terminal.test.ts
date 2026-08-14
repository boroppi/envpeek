import { describe, expect, it } from 'vitest';

import { renderTerminal } from '../src/output/terminal.js';
import { gitNone, sampleSafeVariables } from './helpers.js';

describe('terminal output', () => {
  it('groups public, sensitive, and unknown variables', () => {
    const output = renderTerminal({
      file: '.env.local',
      variables: [
        ...sampleSafeVariables(),
        {
          name: 'API_KEY',
          classification: 'credential',
          maskedValue: 'Empty value',
          empty: true,
          occurrences: 1,
          warnings: [],
        },
      ],
      git: gitNone(),
      duplicates: [{ name: 'API_URL', lines: [1, 2], count: 2 }],
      colorEnabled: false,
      unicode: false,
      ci: false,
      revealed: false,
    });

    expect(output).toContain('PUBLIC');
    expect(output).toContain('SENSITIVE');
    expect(output).toContain('UNKNOWN');
    expect(output).toContain('NEXT_PUBLIC_API_URL');
    expect(output).toContain('••••');
    expect(output).toContain('Empty value');
    expect(output).toContain('API_URL appears 2 times.');
    expect(output).not.toContain('SUPER_SECRET_PASSWORD');
  });
});
