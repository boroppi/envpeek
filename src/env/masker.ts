import { MASK, PRIVATE_KEY_HIDDEN } from '../constants.js';
import type { Classification } from '../types.js';
import { SENSITIVE_QUERY_KEYS, TOKEN_PREFIXES } from './patterns.js';

const SENSITIVE: ReadonlySet<Classification> = new Set([
  'secret',
  'credential',
  'token',
  'private-key',
  'password',
  'database-credential',
]);

export function maskValue(
  rawValue: string,
  classification: Classification,
  empty: boolean,
  forceMask = false,
): string {
  if (empty) {
    return 'Empty value';
  }

  if (classification === 'private-key') {
    return PRIVATE_KEY_HIDDEN;
  }

  const mustMask = forceMask || SENSITIVE.has(classification);

  if (!mustMask) {
    return maskIfUrlHasSensitiveQuery(rawValue) ?? rawValue;
  }

  const tokenMasked = maskKnownTokenPrefix(rawValue);
  if (tokenMasked !== null) {
    return tokenMasked;
  }

  const urlMasked = maskUrl(rawValue, true);
  if (urlMasked !== null) {
    return urlMasked;
  }

  return MASK;
}

function maskKnownTokenPrefix(value: string): string | null {
  for (const entry of TOKEN_PREFIXES) {
    if (entry.test.test(value)) {
      return `${entry.prefix}${MASK}`;
    }
  }
  return null;
}

function maskIfUrlHasSensitiveQuery(value: string): string | null {
  const parsed = tryParseUrl(value);
  if (!parsed) {
    return null;
  }
  let dirty = false;
  for (const key of parsed.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.test(key)) {
      parsed.searchParams.set(key, MASK);
      dirty = true;
    }
  }
  if (!dirty) {
    return null;
  }
  return restoreOriginalScheme(value, parsed.toString());
}

function maskUrl(value: string, sensitive: boolean): string | null {
  const parsed = tryParseUrl(value);
  if (!parsed) {
    return null;
  }

  if (parsed.username || parsed.password) {
    parsed.username = '';
    parsed.password = '';
    const withoutUserinfo = restoreOriginalScheme(value, parsed.toString());
    return insertMaskedUserinfo(withoutUserinfo, parsed.protocol);
  }

  if (!sensitive) {
    return maskIfUrlHasSensitiveQuery(value) ?? value;
  }

  for (const key of parsed.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.test(key)) {
      parsed.searchParams.set(key, MASK);
    }
  }

  // Sensitive non-userinfo URLs: keep host/path only if we successfully parsed.
  // Credentials in path are uncertain — host+path are usually not secret for DB URLs.
  return restoreOriginalScheme(value, parsed.toString());
}

function tryParseUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(trimmed)) {
    return null;
  }
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function restoreOriginalScheme(original: string, normalized: string): string {
  const originalScheme = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(original.trim())?.[1];
  const normalizedScheme = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(normalized)?.[1];
  if (originalScheme && normalizedScheme && originalScheme !== normalizedScheme) {
    return originalScheme + normalized.slice(normalizedScheme.length);
  }
  return normalized;
}

function insertMaskedUserinfo(url: string, protocol: string): string {
  const marker = protocol + '//';
  const index = url.indexOf(marker);
  if (index !== 0 && index !== -1) {
    // keep going with first occurrence
  }
  if (index === -1) {
    return `${protocol}//${MASK}@`;
  }
  return `${url.slice(0, index + marker.length)}${MASK}@${url.slice(index + marker.length)}`;
}
