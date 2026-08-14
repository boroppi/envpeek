export type Symbols = {
  ok: string;
  lock: string;
  warn: string;
  critical: string;
  tip: string;
  fail: string;
  question: string;
};

export function symbols(unicode: boolean): Symbols {
  if (unicode) {
    return {
      ok: '✓',
      lock: '🔒',
      warn: '⚠',
      critical: '🔴',
      tip: '💡',
      fail: '✖',
      question: '?',
    };
  }

  return {
    ok: '[ok]',
    lock: '[lock]',
    warn: '[!]',
    critical: '[!!]',
    tip: '[i]',
    fail: '[x]',
    question: '?',
  };
}
