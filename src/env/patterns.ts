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
  'SERVICE_ROLE',
  'MASTER_KEY',
  'APP_KEY',
  'PASSPHRASE',
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
    exact: ['PASSWORD', 'PASSWD', 'PWD', 'PGPASSWORD', 'MYSQL_PWD'],
    segments: ['PASSWORD', 'PASSWD', 'PASS', 'PWD', 'PASSPHRASE'],
  },
  {
    classification: 'database-credential',
    exact: [
      'DATABASE_URL',
      'DB_URL',
      'DB_PASSWORD',
      'DATABASE_PASSWORD',
      'MONGO_URI',
      'MONGO_URL',
      'MONGODB_URI',
      'REDIS_URL',
      'MYSQL_URL',
      'POSTGRES_URL',
      'DATABASE_URI',
      'DIRECT_URL',
      'DATABASE_URL_UNPOOLED',
      'POSTGRES_URL_NON_POOLING',
      'POSTGRES_PRISMA_URL',
      'JDBC_URL',
      'AMQP_URL',
      'RABBITMQ_URL',
      'BROKER_URL',
      'CLOUDINARY_URL',
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
      'SERVICE_ROLE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SERVICE_KEY',
      'SERVICE_KEY',
      'APP_KEY',
      'MASTER_KEY',
      'ADMIN_KEY',
      'AUTH_KEY',
      'SERVER_KEY',
      'SESSION_KEY',
      'WEBHOOK_KEY',
      'HMAC_KEY',
      'CONSUMER_KEY',
    ],
    segments: ['APIKEY'],
  },
  {
    classification: 'secret',
    exact: ['SECRET', 'ENCRYPTION_KEY', 'SIGNING_KEY', 'JWT_SECRET'],
    segments: ['SECRET'],
  },
];

/** Substrings that make a name sensitive even when they are not a suffix. */
export const NAME_CONTAINS: readonly {
  needle: string;
  classification: Exclude<Classification, 'public' | 'unknown'>;
}[] = [
  { needle: 'SERVICE_ROLE', classification: 'credential' },
  { needle: 'DATABASE_URL', classification: 'database-credential' },
  { needle: 'DB_URL', classification: 'database-credential' },
  { needle: 'POSTGRES_URL', classification: 'database-credential' },
  { needle: 'MYSQL_URL', classification: 'database-credential' },
  { needle: 'MONGO_URL', classification: 'database-credential' },
  { needle: 'MONGO_URI', classification: 'database-credential' },
  { needle: 'MONGODB_URI', classification: 'database-credential' },
  { needle: 'REDIS_URL', classification: 'database-credential' },
  { needle: 'DATABASE_URI', classification: 'database-credential' },
  { needle: 'CONNECTION_STRING', classification: 'database-credential' },
  { needle: 'JDBC_URL', classification: 'database-credential' },
];

/**
 * If a name ends with `_KEY`, the previous segment decides whether it is a credential.
 * Keep PRIMARY/FOREIGN/CACHE/ANON/PUBLISHABLE out so schema and public keys stay visible.
 */
export const SENSITIVE_KEY_MODIFIERS = new Set([
  'ADMIN',
  'APP',
  'AUTH',
  'ACCESS',
  'API',
  'CONSUMER',
  'ENCRYPTION',
  'HMAC',
  'MASTER',
  'PRIVATE',
  'RESTRICTED',
  'SECRET',
  'SERVER',
  'SERVICE',
  'SESSION',
  'SIGNING',
  'WEBHOOK',
]);

export const HARMLESS_KEY_MODIFIERS = new Set([
  'ANON',
  'CACHE',
  'FOREIGN',
  'PARTITION',
  'PRIMARY',
  'PUBLIC',
  'PUBLISHABLE',
  'SORT',
  'STORAGE',
]);

export const PEM_PRIVATE_KEY = /-----BEGIN (?:[A-Z0-9 ]+)?PRIVATE KEY-----/;
export const OPENSSH_PRIVATE_KEY = /-----BEGIN OPENSSH PRIVATE KEY-----/;
export const SERVICE_ACCOUNT_JSON = /"type"\s*:\s*"service_account"/;
export const JSON_PRIVATE_KEY_FIELD = /"private_key"\s*:/;

export const TOKEN_PREFIXES: readonly { prefix: string; test: RegExp }[] = [
  { prefix: 'sb_secret_', test: /^sb_secret_/ },
  { prefix: 'sk_live_', test: /^sk_live_/ },
  { prefix: 'sk_test_', test: /^sk_test_/ },
  { prefix: 'rk_live_', test: /^rk_live_/ },
  { prefix: 'rk_test_', test: /^rk_test_/ },
  { prefix: 'pk_live_', test: /^pk_live_/ },
  { prefix: 'pk_test_', test: /^pk_test_/ },
  { prefix: 'sk-proj-', test: /^sk-proj-/ },
  { prefix: 'sk-ant-', test: /^sk-ant-/ },
  { prefix: 'sk-or-', test: /^sk-or-/ },
  { prefix: 'github_pat_', test: /^github_pat_/ },
  { prefix: 'whsec_', test: /^whsec_/ },
  { prefix: 'dop_v1_', test: /^dop_v1_/ },
  { prefix: 'glpat-', test: /^glpat-/ },
  { prefix: 'shpat_', test: /^shpat_/ },
  { prefix: 'shpss_', test: /^shpss_/ },
  { prefix: 'gsk_', test: /^gsk_/ },
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
  { prefix: 'xoxe-', test: /^xoxe-/ },
  { prefix: 'xai-', test: /^xai-/ },
  { prefix: 'npm_', test: /^npm_/ },
  { prefix: 're_', test: /^re_[A-Za-z0-9]/ },
  { prefix: 'SG.', test: /^SG\./ },
];

export const SENSITIVE_QUERY_KEYS = /^(password|passwd|secret|token|key|auth|access_token)$/i;
