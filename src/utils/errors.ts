import { basename } from 'node:path';

import { EXIT } from '../constants.js';
import type { ExitCode } from '../types.js';

export class UsageError extends Error {
  readonly code = EXIT.USAGE;

  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

export class FileError extends Error {
  readonly code = EXIT.IO;
  readonly file: string;

  constructor(file: string, message: string) {
    super(message);
    this.name = 'FileError';
    this.file = file;
  }
}

export class ParseError extends Error {
  readonly code = EXIT.IO;
  readonly file: string;
  readonly line: number;

  constructor(file: string, line: number) {
    super(
      `Unable to parse ${basename(file)}.\n\nLine ${line} appears to contain invalid syntax.\n\nNo environment values were displayed.`,
    );
    this.name = 'ParseError';
    this.file = file;
    this.line = line;
  }
}

export class ConfigError extends Error {
  readonly code = EXIT.IO;
  readonly file: string;
  readonly key?: string;

  constructor(file: string, message: string, key?: string) {
    super(message);
    this.name = 'ConfigError';
    this.file = file;
    this.key = key;
  }
}

export class PolicyError extends Error {
  readonly code = EXIT.POLICY;

  constructor(message: string) {
    super(message);
    this.name = 'PolicyError';
  }
}

export function formatSafeError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return 'Error: unexpected failure';
}

export function exitCodeFor(err: unknown): ExitCode {
  if (
    err instanceof UsageError ||
    err instanceof FileError ||
    err instanceof ParseError ||
    err instanceof ConfigError ||
    err instanceof PolicyError
  ) {
    return err.code;
  }
  return EXIT.IO;
}
