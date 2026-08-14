import { describe, expect, it } from 'vitest';

import {
  detectName,
  detectValue,
  isPublicPrefix,
  isSuspiciousPublicName,
  matchWildcard,
} from '../src/env/detector.js';

describe('detector', () => {
  it('detects common sensitive names', () => {
    expect(detectName('PASSWORD')).toBe('password');
    expect(detectName('SECRET')).toBe('secret');
    expect(detectName('TOKEN')).toBe('token');
    expect(detectName('API_KEY')).toBe('credential');
    expect(detectName('PRIVATE_KEY')).toBe('private-key');
    expect(detectName('DATABASE_URL')).toBe('database-credential');
    expect(detectName('JWT_SECRET')).toBe('secret');
    expect(detectName('SUPABASE_SERVICE_ROLE_KEY')).toBe('credential');
    expect(detectName('SERVICE_ROLE_KEY')).toBe('credential');
    expect(detectName('DIRECT_URL')).toBe('database-credential');
    expect(detectName('APP_KEY')).toBe('credential');
    expect(detectName('RAILS_MASTER_KEY')).toBe('credential');
    expect(detectName('POSTGRES_URL_NON_POOLING')).toBe('database-credential');
    expect(detectName('SENTRY_DSN')).toBe('credential');
    expect(detectName('PGPASSWORD')).toBe('password');
    expect(detectName('PRIMARY_KEY')).toBeNull();
    expect(detectName('ANON_KEY')).toBeNull();
  });

  it('detects public prefixes', () => {
    expect(isPublicPrefix('NEXT_PUBLIC_API_URL')).toBe(true);
    expect(isPublicPrefix('VITE_API_URL')).toBe(true);
    expect(isPublicPrefix('PUBLIC_URL')).toBe(true);
    expect(isPublicPrefix('DATABASE_URL')).toBe(false);
  });

  it('flags suspicious public names', () => {
    expect(isSuspiciousPublicName('NEXT_PUBLIC_API_KEY')).toBe(true);
    expect(isSuspiciousPublicName('NEXT_PUBLIC_API_URL')).toBe(false);
  });

  it('detects PEM private keys', () => {
    expect(detectValue('-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----')).toBe(
      'private-key',
    );
    expect(detectValue('-----BEGIN RSA PRIVATE KEY-----\nfake')).toBe('private-key');
    expect(detectValue('-----BEGIN OPENSSH PRIVATE KEY-----\nfake')).toBe('private-key');
    expect(detectValue('sb_secret_abcdefghijklmnopqrstuvwxyz')).toBe('token');
    expect(detectValue('sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe('token');
    expect(detectValue('whsec_abcdefghijklmnopqrstuvwxyz')).toBe('token');
    expect(detectValue('{"type":"service_account"}')).toBe('private-key');
  });

  it('matches simple wildcards', () => {
    expect(matchWildcard('FOO_CREDENTIAL', '*_CREDENTIAL')).toBe(true);
    expect(matchWildcard('INTERNAL_SECRET_X', 'INTERNAL_SECRET_*')).toBe(true);
    expect(matchWildcard('COMPANY_TOKEN', 'COMPANY_TOKEN')).toBe(true);
    expect(matchWildcard('OTHER', '*_CREDENTIAL')).toBe(false);
  });
});
