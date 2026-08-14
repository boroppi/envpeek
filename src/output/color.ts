export type ColorFns = {
  dim: (text: string) => string;
  green: (text: string) => string;
  yellow: (text: string) => string;
  red: (text: string) => string;
  cyan: (text: string) => string;
};

const identity = (text: string): string => text;

export function color(enabled: boolean): ColorFns {
  if (!enabled) {
    return {
      dim: identity,
      green: identity,
      yellow: identity,
      red: identity,
      cyan: identity,
    };
  }

  return {
    dim: (text) => `\u001b[2m${text}\u001b[0m`,
    green: (text) => `\u001b[32m${text}\u001b[0m`,
    yellow: (text) => `\u001b[33m${text}\u001b[0m`,
    red: (text) => `\u001b[31m${text}\u001b[0m`,
    cyan: (text) => `\u001b[36m${text}\u001b[0m`,
  };
}
