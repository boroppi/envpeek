import { describe, expect, it } from 'vitest';

import { buildHelp, parseCliArgs } from '../src/args.js';
import { UsageError } from '../src/utils/errors.js';

describe('args', () => {
  it('parses a positional file', () => {
    const args = parseCliArgs(['.env.production']);
    expect(args.positionalFile).toBe('.env.production');
    expect(args.file).toBeUndefined();
  });

  it('rejects combining a positional path with --file', () => {
    expect(() => parseCliArgs(['.env.production', '--file', '.env.staging'])).toThrow(UsageError);
  });

  it('includes required help sections', () => {
    const help = buildHelp();
    expect(help).toContain('Usage');
    expect(help).toContain('Options');
    expect(help).toContain('Examples');
    expect(help).toMatch(/security|masked|secrets/i);
  });

  it('parses long flags', () => {
    const args = parseCliArgs(['--json', '--ci', '--fail-if-tracked', '--debug']);
    expect(args.json).toBe(true);
    expect(args.ci).toBe(true);
    expect(args.failIfTracked).toBe(true);
    expect(args.debug).toBe(true);
  });

  it('rejects unknown flags', () => {
    expect(() => parseCliArgs(['--explode'])).toThrow(UsageError);
  });
});
