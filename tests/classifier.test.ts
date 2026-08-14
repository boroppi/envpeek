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
    expect(classify('SUPABASE_SERVICE_ROLE_KEY', 'x').classification).toBe('credential');
    expect(classify('SERVICE_ROLE_KEY', 'x').classification).toBe('credential');
    expect(classify('SUPABASE_SERVICE_KEY', 'x').classification).toBe('credential');
    expect(classify('DIRECT_URL', 'postgresql://localhost/db').classification).toBe(
      'database-credential',
    );
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

  it('masks common SaaS and framework secrets that are easy to miss', () => {
    const sensitive: Array<[string, string]> = [
      ['APP_KEY', 'credential'],
      ['RAILS_MASTER_KEY', 'credential'],
      ['ALGOLIA_ADMIN_KEY', 'credential'],
      ['NEXTAUTH_SECRET', 'secret'],
      ['AUTH_SECRET', 'secret'],
      ['OPENAI_API_KEY', 'credential'],
      ['ANTHROPIC_API_KEY', 'credential'],
      ['STRIPE_WEBHOOK_SECRET', 'secret'],
      ['CLERK_SECRET_KEY', 'secret'],
      ['RESEND_API_KEY', 'credential'],
      ['PGPASSWORD', 'password'],
      ['POSTGRES_URL_NON_POOLING', 'database-credential'],
      ['DATABASE_URL_UNPOOLED', 'database-credential'],
      ['POSTGRES_PRISMA_URL', 'database-credential'],
      ['MONGO_URL', 'database-credential'],
      ['SENTRY_DSN', 'credential'],
      ['SMTP_PASSPHRASE', 'password'],
    ];

    for (const [name, expected] of sensitive) {
      expect(classify(name, 'x').classification, name).toBe(expected);
    }
  });

  it('leaves public or schema-like keys visible', () => {
    expect(classify('SUPABASE_ANON_KEY', 'x').classification).toBe('unknown');
    expect(classify('CLERK_PUBLISHABLE_KEY', 'not-a-known-prefix').classification).toBe('unknown');
    expect(classify('PRIMARY_KEY', 'id').classification).toBe('unknown');
    expect(classify('FEATURE_FLAG', 'on').classification).toBe('unknown');
    expect(classify('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co').classification).toBe(
      'public',
    );
  });

  it('treats well-known secret value prefixes as tokens', () => {
    expect(classify('FOO', 'sk-proj-abcdefghijklmnopqrstuvwxyz').classification).toBe('token');
    expect(classify('FOO', 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz').classification).toBe('token');
    expect(classify('FOO', 'whsec_abcdefghijklmnopqrstuvwxyz').classification).toBe('token');
    expect(classify('FOO', 'gsk_abcdefghijklmnopqrstuvwxyz').classification).toBe('token');
  });

  it('treats service-account JSON as a private key', () => {
    const value = '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\nfake"}';
    expect(classify('GOOGLE_CREDENTIALS', value).classification).toBe('private-key');
  });
});
