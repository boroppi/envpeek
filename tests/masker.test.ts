import { describe, expect, it } from 'vitest';

import { MASK, PRIVATE_KEY_HIDDEN } from '../src/constants.js';
import { maskValue } from '../src/env/masker.js';

describe('masker', () => {
  it('masks database userinfo and never keeps the password or username', () => {
    const masked = maskValue(
      'postgresql://admin:super-secret-password@localhost:5432/app',
      'database-credential',
      false,
    );
    expect(masked).toContain('••••');
    expect(masked).toContain('localhost');
    expect(masked).not.toContain('super-secret-password');
    expect(masked).not.toContain('admin');
  });

  it('keeps a well-known token prefix', () => {
    const masked = maskValue('sk_live_123456789abcdef', 'secret', false);
    expect(masked.startsWith('sk_live_')).toBe(true);
    expect(masked).not.toContain('123456789abcdef');
  });

  it('hides private keys completely', () => {
    const masked = maskValue(
      '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
      'private-key',
      false,
    );
    expect(masked).toBe(PRIVATE_KEY_HIDDEN);
    expect(masked).not.toContain('BEGIN');
  });

  it('leaves harmless public URLs visible', () => {
    expect(maskValue('https://api.example.com', 'public', false)).toBe('https://api.example.com');
  });

  it('masks public variables that look like credentials', () => {
    const masked = maskValue('not-a-real-public-key-value', 'public', false, true);
    expect(masked).toBe(MASK);
    expect(masked).not.toContain('not-a-real-public-key-value');
  });

  it('labels empty values', () => {
    expect(maskValue('', 'credential', true)).toBe('Empty value');
  });
});
