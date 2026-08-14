import type { Classification } from '../types.js';
import {
  NAME_RULES,
  OPENSSH_PRIVATE_KEY,
  PEM_PRIVATE_KEY,
  PUBLIC_PREFIXES,
  SUSPICIOUS_PUBLIC_TOKENS,
  TOKEN_PREFIXES,
} from './patterns.js';

export function matchWildcard(name: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(name);
}

export function isPublicPrefix(name: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function isSuspiciousPublicName(name: string): boolean {
  const upper = name.toUpperCase();
  return SUSPICIOUS_PUBLIC_TOKENS.some((token) => upper.includes(token));
}

export function detectCustom(name: string, customPatterns: readonly string[]): boolean {
  return customPatterns.some((pattern) => matchWildcard(name, pattern));
}

export function detectName(name: string): Classification | null {
  const upper = name.toUpperCase();
  const segments = upper.split('_').filter(Boolean);

  for (const rule of NAME_RULES) {
    if (rule.exact.some((exact) => upper === exact || upper.endsWith(`_${exact}`))) {
      return rule.classification;
    }
    if (rule.segments.some((segment) => segments.includes(segment))) {
      return rule.classification;
    }
  }

  if (upper.includes('API_KEY') || upper.endsWith('_APIKEY') || upper.includes('_API_KEY')) {
    return 'credential';
  }

  return null;
}

export function detectValue(value: string): 'private-key' | 'token' | null {
  if (PEM_PRIVATE_KEY.test(value) || OPENSSH_PRIVATE_KEY.test(value)) {
    return 'private-key';
  }
  if (TOKEN_PREFIXES.some((entry) => entry.test.test(value))) {
    return 'token';
  }
  return null;
}
