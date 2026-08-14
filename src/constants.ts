export const EXIT = {
  OK: 0,
  POLICY: 1,
  USAGE: 2,
  IO: 3,
} as const;

export const DEFAULT_ENV_CANDIDATES = ['.env.local', '.env'] as const;

export const MASK = '••••••••••••';

export const PRIVATE_KEY_HIDDEN = 'Private key detected — value completely hidden';

export const MAX_FILE_BYTES = 1024 * 1024;

export const CONFIG_NAME = '.envpeek.json';

export const GIT_TIMEOUT_MS = 5000;
