export type ProcessLikeEnv = Record<string, string | undefined>;

export function isColorEnabled(
  stdoutIsTTY: boolean,
  env: ProcessLikeEnv,
  ciFlag: boolean,
): boolean {
  if (env.NO_COLOR !== undefined) {
    return false;
  }
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '') {
    return true;
  }
  if (ciFlag) {
    return false;
  }
  return stdoutIsTTY;
}

export function isUnicodeEnabled(
  stdoutIsTTY: boolean,
  env: ProcessLikeEnv,
  platform: string,
): boolean {
  if (!stdoutIsTTY) {
    return false;
  }
  if (env.TERM === 'dumb') {
    return false;
  }
  if (platform !== 'win32') {
    return true;
  }
  if (env.WT_SESSION) {
    return true;
  }
  const term = env.TERM ?? '';
  if (/xterm|vt100|vt220|cygwin/i.test(term)) {
    return true;
  }
  if (env.LANG && /utf-?8/i.test(env.LANG)) {
    return true;
  }
  return false;
}

export function isCiEnv(env: ProcessLikeEnv, ciFlag: boolean): boolean {
  if (ciFlag) {
    return true;
  }
  const ci = env.CI;
  return ci !== undefined && ci !== '' && ci !== '0' && ci.toLowerCase() !== 'false';
}
