export type Classification =
  | 'secret'
  | 'credential'
  | 'token'
  | 'private-key'
  | 'password'
  | 'database-credential'
  | 'public'
  | 'unknown';

export type ExitCode = 0 | 1 | 2 | 3;

export type CliArgs = {
  file?: string;
  positionalFile?: string;
  json: boolean;
  show: boolean;
  yes: boolean;
  debug: boolean;
  ci: boolean;
  failIfTracked: boolean;
  failIfUnignored: boolean;
  failIfPrivateKey: boolean;
  help: boolean;
  version: boolean;
  argv: string[];
};

export type EnvpeekConfig = {
  files?: string[];
  failIfTracked?: boolean;
  failIfUnignored?: boolean;
  failIfPrivateKey?: boolean;
  sensitivePatterns?: string[];
};

export type RawAssignment = {
  name: string;
  rawValue: string;
  line: number;
};

export type DuplicateInfo = {
  name: string;
  lines: number[];
  count: number;
};

export type ParseResult =
  | { ok: true; file: string; assignments: RawAssignment[]; duplicates: DuplicateInfo[] }
  | { ok: false; file: string; line: number };

export type SafeVariable = {
  name: string;
  classification: Classification;
  maskedValue: string;
  empty: boolean;
  occurrences: number;
  warnings: string[];
};

export type RevealedVariable = SafeVariable & {
  revealedValue: string;
};

export type DisplayVariable = SafeVariable | RevealedVariable;

export type GitStatus = {
  available: boolean;
  repository: boolean;
  root?: string;
  ignored: boolean | null;
  tracked: boolean | null;
};

export type JsonVariable = {
  name: string;
  classification: Classification;
  maskedValue: string;
  empty: boolean;
  warnings: string[];
  occurrences: number;
  revealedValue?: string;
};

export type JsonReport = {
  file: string;
  variables: JsonVariable[];
  security: {
    gitIgnored: boolean | null;
    gitTracked: boolean | null;
    sensitiveVariableCount: number;
    privateKeyCount: number;
  };
  duplicates: Array<{ name: string; count: number }>;
};

export type RunResult = {
  exitCode: ExitCode;
  stdout: string;
  stderr: string;
};

export type ClassifyResult = {
  classification: Classification;
  warnings: string[];
  empty: boolean;
};
