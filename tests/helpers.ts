import type { DisplayVariable, DuplicateInfo, GitStatus } from '../src/types.js';

export const TEST_SECRETS = [
  'THIS_IS_A_TEST_SECRET_123456789',
  'SUPER_SECRET_PASSWORD',
  'sk_live_FAKE_SECRET_123',
  'THIS_IS_A_FAKE_JWT_SECRET',
] as const;

export function gitNone(): GitStatus {
  return {
    available: false,
    repository: false,
    ignored: null,
    tracked: null,
  };
}

export function assertNoSecrets(output: string): void {
  for (const secret of TEST_SECRETS) {
    if (output.includes(secret)) {
      throw new Error('Secret leaked into output');
    }
  }
}

export function sampleSafeVariables(): DisplayVariable[] {
  return [
    {
      name: 'NEXT_PUBLIC_API_URL',
      classification: 'public',
      maskedValue: 'https://example.com',
      empty: false,
      occurrences: 1,
      warnings: [],
    },
    {
      name: 'DATABASE_URL',
      classification: 'database-credential',
      maskedValue: 'postgresql://••••••••••••@example.com/db',
      empty: false,
      occurrences: 1,
      warnings: [],
    },
    {
      name: 'STRIPE_SECRET_KEY',
      classification: 'secret',
      maskedValue: 'sk_live_••••••••••••',
      empty: false,
      occurrences: 1,
      warnings: [],
    },
    {
      name: 'JWT_SECRET',
      classification: 'secret',
      maskedValue: '••••••••••••',
      empty: false,
      occurrences: 1,
      warnings: [],
    },
    {
      name: 'FEATURE_FLAG',
      classification: 'unknown',
      maskedValue: 'enabled',
      empty: false,
      occurrences: 1,
      warnings: [],
    },
  ];
}

export function noDuplicates(): DuplicateInfo[] {
  return [];
}
