import { describe, expect, it } from 'vitest';

import { classify } from '../src/env/classifier.js';

describe('classifier', () => {
  it('classifies sensitive names', () => {
    expect(classify('PASSWORD', 'x').classification).toBe('password');
    expect(classify('SECRET', 'x').classification).toBe('secret');
    expect(classify('TOKEN', 'x').classification).toBe('token');
    expect(classify('API_KEY', 'x').classification).toBe('credential');
    expect(classify('PRIVATE_KEY', 'x').classification).toBe('private-key');
    expect(classify('DATABASE_URL', 'postgres://localhost/db').classification).toBe(
      'database-credential',
    );
    expect(classify('JWT_SECRET', 'x').classification).toBe('secret');
  });

  it('classifies public prefixes as public', () => {
    expect(classify('NEXT_PUBLIC_API_URL', 'https://api.example.com').classification).toBe(
      'public',
    );
    expect(classify('VITE_API_URL', 'https://vite.example.com').classification).toBe('public');
    expect(classify('PUBLIC_URL', 'https://public.example.com').classification).toBe('public');
  });

  it('warns when a public name appears to contain a credential', () => {
    const result = classify('NEXT_PUBLIC_API_KEY', 'abc');
    expect(result.classification).toBe('public');
    expect(
      result.warnings.some((warning) => warning.includes('appears to contain a credential')),
    ).toBe(true);
  });

  it('treats PEM values as private keys even with a harmless name', () => {
    const result = classify('FOO', '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----');
    expect(result.classification).toBe('private-key');
  });

  it('marks empty values without treating them as valid credentials', () => {
    const result = classify('API_KEY', '');
    expect(result.empty).toBe(true);
    expect(result.classification).toBe('credential');
  });

  it('applies custom wildcard patterns', () => {
    expect(classify('FOO_CREDENTIAL', 'x', ['*_CREDENTIAL']).classification).toBe('secret');
  });
});
