import { basename } from 'node:path';

import { isSensitiveClassification } from '../env/classifier.js';
import type { DisplayVariable, DuplicateInfo, GitStatus } from '../types.js';
import { color, type ColorFns } from './color.js';
import { symbols, type Symbols } from './symbols.js';

export type TerminalRenderOptions = {
  file: string;
  variables: DisplayVariable[];
  git: GitStatus;
  duplicates: DuplicateInfo[];
  colorEnabled: boolean;
  unicode: boolean;
  ci: boolean;
  revealed: boolean;
  failed?: boolean;
};

export function renderTerminal(opts: TerminalRenderOptions): string {
  if (opts.ci) {
    return renderCi(opts);
  }
  return renderHuman(opts);
}

function displayValue(variable: DisplayVariable, revealed: boolean): string {
  if (revealed && 'revealedValue' in variable) {
    if (variable.classification === 'private-key') {
      return variable.maskedValue;
    }
    if (variable.empty) {
      return variable.maskedValue;
    }
    return variable.revealedValue;
  }
  return variable.maskedValue;
}

function nameWidth(variables: DisplayVariable[]): number {
  const max = variables.reduce((width, variable) => Math.max(width, variable.name.length), 0);
  return Math.min(Math.max(max, 1), 32);
}

function padName(name: string, width: number): string {
  if (name.length >= width) {
    return name;
  }
  return name.padEnd(width, ' ');
}

function renderHuman(opts: TerminalRenderOptions): string {
  const c = color(opts.colorEnabled);
  const s = symbols(opts.unicode);
  const fileName = basename(opts.file);
  const width = nameWidth(opts.variables);
  const lines: string[] = [];

  lines.push('envpeek');
  lines.push('');
  lines.push(`Environment: ${fileName}`);
  lines.push('────────────────────────────────────────────');
  lines.push('');

  const publicVars = opts.variables.filter((v) => v.classification === 'public');
  const sensitiveVars = opts.variables.filter((v) => isSensitiveClassification(v.classification));
  const unknownVars = opts.variables.filter((v) => v.classification === 'unknown');

  if (publicVars.length > 0) {
    lines.push(c.dim('PUBLIC'));
    for (const variable of publicVars) {
      lines.push(...formatVariable(variable, width, s, c, opts.revealed));
    }
    lines.push('');
  }

  if (sensitiveVars.length > 0) {
    lines.push(c.dim('SENSITIVE'));
    for (const variable of sensitiveVars) {
      lines.push(...formatVariable(variable, width, s, c, opts.revealed));
    }
    lines.push('');
  }

  if (unknownVars.length > 0) {
    lines.push(c.dim('UNKNOWN'));
    for (const variable of unknownVars) {
      lines.push(...formatVariable(variable, width, s, c, opts.revealed));
    }
    lines.push('');
  }

  if (opts.variables.length === 0) {
    lines.push('No variables found.');
    lines.push('');
  }

  const sensitiveCount = opts.variables.filter(
    (v) => isSensitiveClassification(v.classification) && !v.empty,
  ).length;
  const publicCount = publicVars.length;

  lines.push('Summary');
  lines.push('────────────────────────────────────────────');
  lines.push(`${opts.variables.length} variable${opts.variables.length === 1 ? '' : 's'}`);
  lines.push(`${publicCount} public`);
  lines.push(`${sensitiveCount} protected`);
  lines.push('');

  if (sensitiveCount > 0) {
    lines.push(
      `${s.warn} ${sensitiveCount} variable${sensitiveCount === 1 ? '' : 's'} appear to contain secrets`,
    );
    lines.push('');
  }

  const publicWarnings = opts.variables.flatMap((v) => v.warnings);
  if (publicWarnings.length > 0) {
    for (const warning of publicWarnings) {
      lines.push(`${s.warn} ${warning}`);
    }
    lines.push('');
  }

  if (opts.duplicates.length > 0) {
    lines.push(`${s.warn} Duplicate variable`);
    lines.push('');
    for (const duplicate of opts.duplicates) {
      lines.push(`${duplicate.name} appears ${duplicate.count} times.`);
      lines.push('The final definition may override the earlier definition.');
      lines.push('');
    }
  }

  lines.push(...renderGitSection(opts.git, fileName, s, c));
  lines.push('');

  if (sensitiveCount > 0) {
    lines.push(`${s.warn} Security warnings`);
    lines.push('');
    lines.push(
      `${sensitiveCount} potentially sensitive variable${sensitiveCount === 1 ? '' : 's'} detected.`,
    );
    lines.push('');
    lines.push('Never commit `.env.local` or production credentials to Git.');
    lines.push('');
    lines.push('Recommended:');
    lines.push('  • Add .env files to .gitignore');
    lines.push('  • Use .env.example for non-secret configuration');
    lines.push('  • Rotate credentials if they were accidentally committed');
    lines.push('');
  }

  lines.push(`${s.tip} Values are masked by default.`);
  lines.push('');

  return lines.join('\n');
}

function formatVariable(
  variable: DisplayVariable,
  width: number,
  s: Symbols,
  c: ColorFns,
  revealed: boolean,
): string[] {
  const value = displayValue(variable, revealed);
  const name = padName(variable.name, width);

  if (variable.empty) {
    return [`${s.warn} ${name}  Empty value`];
  }

  if (variable.classification === 'private-key') {
    return [`${s.critical} ${name}  ${value}`];
  }

  if (isSensitiveClassification(variable.classification)) {
    return [`${s.lock} ${name}  ${c.dim(value)}`];
  }

  if (variable.classification === 'unknown') {
    return [`${s.question} ${name}  ${value}`];
  }

  return [`${s.ok} ${name}  ${value}`];
}

function renderGitSection(git: GitStatus, fileName: string, s: Symbols, _c: ColorFns): string[] {
  const lines = ['Git status', '────────────────────────────────────────────', ''];

  if (!git.available) {
    lines.push('Git is not available; skip repository checks.');
    return lines;
  }

  if (!git.repository) {
    lines.push('Not a Git repository.');
    return lines;
  }

  if (git.tracked === true) {
    lines.push(`${s.critical} SECURITY WARNING`);
    lines.push('');
    lines.push(`${fileName} is tracked by Git.`);
    lines.push('');
    lines.push('Sensitive values in this file may already exist in repository history.');
    lines.push('');
    lines.push('envpeek will NOT display the values.');
    lines.push('');
    lines.push('Consider rotating any credentials stored in this file.');
    return lines;
  }

  if (git.ignored === true) {
    lines.push(`${s.ok} ${fileName} is ignored by Git`);
  } else if (git.ignored === false) {
    lines.push(`${s.warn} ${fileName} is NOT ignored by Git`);
    lines.push('');
    lines.push('This file may be accidentally committed.');
    lines.push('');
    lines.push('Recommended:');
    lines.push(`  Add \`${fileName}\` to \`.gitignore\``);
  } else {
    lines.push('Git ignore status is unavailable.');
  }

  if (git.tracked === false) {
    lines.push(`${s.ok} File is not tracked`);
  }

  return lines;
}

function renderCi(opts: TerminalRenderOptions): string {
  const s = symbols(false);
  const fileName = basename(opts.file);
  const lines = ['envpeek CI check', ''];

  if (opts.git.tracked === true) {
    lines.push(`${s.fail} ${fileName} is tracked by Git`);
  } else if (opts.git.available && opts.git.repository) {
    lines.push(`${s.ok} No sensitive .env files are tracked`);
  }

  if (opts.git.ignored === true) {
    lines.push(`${s.ok} ${fileName} is ignored`);
  } else if (opts.git.ignored === false) {
    lines.push(`${s.warn} ${fileName} is not ignored`);
  }

  const privateKeys = opts.variables.filter((v) => v.classification === 'private-key').length;
  if (privateKeys === 0) {
    lines.push(`${s.ok} No private keys detected`);
  } else {
    lines.push(`${s.warn} Private key detected`);
  }

  lines.push('');
  lines.push(opts.failed === true ? 'FAIL' : 'PASS');
  lines.push('');

  return lines.join('\n');
}
