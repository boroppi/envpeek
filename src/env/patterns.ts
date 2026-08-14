import type { Classification } from '../types.js';

export const PUBLIC_PREFIXES = ['NEXT_PUBLIC_', 'VITE_', 'PUBLIC_', 'NUXT_PUBLIC_'] as const;

export const SUSPICIOUS_PUBLIC_TOKENS = [
  'API_KEY',
  'APIKEY',
  'SECRET',
  'TOKEN',
  'PASSWORD',
  'PRIVATE',
  'CREDENTIAL',
] as const;

type NameRule = {
  classification: Exclude<Classification, 'public' | 'unknown'>;
  exact: readonly string[];
  segments: readonly string[];
};

export const NAME_RULES: readonly NameRule[] = [
  {
    classification: 'private-key',
    exact: ['PRIVATE_KEY', 'PRIVATEKEY'],
    segments: [],
  },
  {
    classification: 'password',
    exact: ['PASSWORD', 'PASSWD', 'PWD'],
    segments: ['PASSWORD', 'PASSWD', 'PASS', 'PWD'],
  },
  {
    classification: 'database-credential',
    exact: [
      'DATABASE_URL',
      'DB_URL',
      'DB_PASSWORD',
      'DATABASE_PASSWORD',
      'MONGO_URI',
      'MONGODB_URI',
      'REDIS_URL',
      'MYSQL_URL',
      'POSTGRES_URL',
      'DATABASE_URI',
    ],
    segments: [],
  },
  {
    classification: 'token',
    exact: ['TOKEN', 'BEARER', 'AUTH_TOKEN', 'REFRESH_TOKEN'],
    segments: ['TOKEN', 'BEARER'],
  },
  {
    classification: 'credential',
    exact: [
      'API_KEY',
      'APIKEY',
      'ACCESS_KEY',
      'ACCESS_KEY_ID',
      'CLIENT_SECRET',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SECRET',
      'CONNECTION_STRING',
    ],
    segments: ['APIKEY'],
  },
  {
    classification: 'secret',
    exact: ['SECRET', 'ENCRYPTION_KEY', 'SIGNING_KEY', 'JWT_SECRET'],
    segments: ['SECRET'],
  },
];

export const PEM_PRIVATE_KEY = /-----BEGIN (?:[A-Z0-9 ]+)?PRIVATE KEY-----/;
export const OPENSSH_PRIVATE_KEY = /-----BEGIN OPENSSH PRIVATE KEY-----/;

export const TOKEN_PREFIXES: readonly { prefix: string; test: RegExp }[] = [
  { prefix: 'sk_live_', test: /^sk_live_/ },
  { prefix: 'sk_test_', test: /^sk_test_/ },
  { prefix: 'pk_live_', test: /^pk_live_/ },
  { prefix: 'pk_test_', test: /^pk_test_/ },
  { prefix: 'github_pat_', test: /^github_pat_/ },
  { prefix: 'ghp_', test: /^ghp_/ },
  { prefix: 'gho_', test: /^gho_/ },
  { prefix: 'ghu_', test: /^ghu_/ },
  { prefix: 'ghs_', test: /^ghs_/ },
  { prefix: 'ghr_', test: /^ghr_/ },
  { prefix: 'xoxb-', test: /^xoxb-/ },
  { prefix: 'xoxp-', test: /^xoxp-/ },
  { prefix: 'xoxa-', test: /^xoxa-/ },
  { prefix: 'xoxr-', test: /^xoxr-/ },
  { prefix: 'xoxs-', test: /^xoxs-/ },
];

export const SENSITIVE_QUERY_KEYS = /^(password|passwd|secret|token|key|auth|access_token)$/i;
