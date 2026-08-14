import { dirname, resolve } from 'node:path';

import { parseCliArgs, buildHelp } from './args.js';
import { loadConfig, mergeConfig } from './config.js';
import { EXIT } from './constants.js';
import { isSensitiveClassification, toSafeVariables } from './env/classifier.js';
import { parseEnv } from './env/parser.js';
import { isIgnored } from './git/ignored.js';
import { findGitRoot, isGitAvailable } from './git/repository.js';
import { isTracked } from './git/tracked.js';
import { confirmShow } from './output/confirm.js';
import { renderJson, toJsonReport } from './output/json.js';
import { renderTerminal } from './output/terminal.js';
import type {
  CliArgs,
  DisplayVariable,
  DuplicateInfo,
  EnvpeekConfig,
  ExitCode,
  GitStatus,
  RevealedVariable,
  RunResult,
  SafeVariable,
} from './types.js';
import { FileError, ParseError, UsageError } from './utils/errors.js';
import { fileExists, readEnvFile, readPackageVersion, resolveDefaultFile } from './utils/files.js';
import { isColorEnabled, isUnicodeEnabled } from './utils/process-env.js';

export type RunOptions = {
  argv: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  stdoutIsTTY?: boolean;
  stdinIsTTY?: boolean;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
};

export async function run(options: RunOptions): Promise<RunResult> {
  const args = parseCliArgs(options.argv);
  const env = options.env ?? process.env;

  if (args.help) {
    return { exitCode: EXIT.OK, stdout: buildHelp(), stderr: '' };
  }

  if (args.version) {
    const version = await readPackageVersion();
    return { exitCode: EXIT.OK, stdout: `${version}\n`, stderr: '' };
  }

  if (args.ci && args.show) {
    throw new UsageError('CI mode never reveals values. Do not combine --ci with --show.');
  }

  const config = await loadConfig(options.cwd);
  const merged = mergeConfig(config, args);
  const files = await resolveTargetFiles(args, merged, options.cwd);

  const reports: Array<{
    file: string;
    variables: DisplayVariable[];
    git: GitStatus;
    duplicates: DuplicateInfo[];
    rawByName: Map<string, string>;
  }> = [];

  for (const file of files) {
    const content = await readEnvFile(file);
    const parsed = parseEnv(content, file);
    if (!parsed.ok) {
      throw new ParseError(parsed.file, parsed.line);
    }

    const variables = toSafeVariables(
      parsed.assignments,
      parsed.duplicates,
      merged.sensitivePatterns ?? [],
    );
    const rawByName = lastValues(parsed.assignments);
    const git = await inspectGit(file);

    reports.push({
      file,
      variables,
      git,
      duplicates: parsed.duplicates,
      rawByName,
    });
  }

  let stderr = '';
  if (args.debug) {
    stderr = reports.map((report) => formatDebug(report)).join('');
  }

  let revealed = false;
  if (args.show) {
    const confirmed = await confirmShow({
      yes: args.yes,
      isTTY: options.stdinIsTTY ?? Boolean(process.stdin.isTTY),
      json: args.json,
      ci: args.ci,
      io:
        options.stdin && options.stdout
          ? { stdin: options.stdin, stdout: options.stdout }
          : undefined,
    });
    if (!confirmed) {
      return {
        exitCode: EXIT.USAGE,
        stdout: '',
        stderr: args.json
          ? 'Refusing to reveal values in JSON without --yes.\n'
          : 'Confirmation required to reveal values. Re-run with --show --yes.\n',
      };
    }
    revealed = true;
    for (const report of reports) {
      report.variables = attachRevealed(report.variables, report.rawByName);
    }
  }

  const stdoutIsTTY = options.stdoutIsTTY ?? Boolean(process.stdout.isTTY);
  const colorEnabled = isColorEnabled(stdoutIsTTY, env, args.ci);
  const unicode = isUnicodeEnabled(stdoutIsTTY, env, process.platform);

  const stdout = reports
    .map((report) => {
      if (args.json) {
        return renderJson(
          toJsonReport({
            file: report.file,
            variables: report.variables,
            git: report.git,
            duplicates: report.duplicates,
          }),
        );
      }
      return renderTerminal({
        file: report.file,
        variables: report.variables,
        git: report.git,
        duplicates: report.duplicates,
        colorEnabled,
        unicode,
        ci: args.ci,
        revealed,
        failed: policyFailed([report], args, merged),
      });
    })
    .join(args.json && reports.length > 1 ? '' : '');

  const exitCode = policyExit(reports, args, merged);
  return { exitCode, stdout, stderr };
}

function lastValues(assignments: { name: string; rawValue: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const assignment of assignments) {
    map.set(assignment.name, assignment.rawValue);
  }
  return map;
}

function attachRevealed(
  variables: SafeVariable[],
  rawByName: Map<string, string>,
): RevealedVariable[] {
  return variables.map((variable) => ({
    ...variable,
    revealedValue:
      variable.classification === 'private-key'
        ? variable.maskedValue
        : (rawByName.get(variable.name) ?? ''),
  }));
}

function formatDebug(report: {
  file: string;
  variables: DisplayVariable[];
  git: GitStatus;
}): string {
  const sensitive = report.variables.filter(
    (v) => isSensitiveClassification(v.classification) && !v.empty,
  ).length;
  const privateKeys = report.variables.filter((v) => v.classification === 'private-key').length;
  return [
    `Loaded file: ${report.file}`,
    `Variables found: ${report.variables.length}`,
    `Sensitive variables: ${sensitive}`,
    `Private keys: ${privateKeys}`,
    `Git available: ${report.git.available}`,
    `Git repository: ${report.git.repository}`,
    `Git tracked: ${report.git.tracked}`,
    `Git ignored: ${report.git.ignored}`,
    '',
  ].join('\n');
}

async function resolveTargetFiles(
  args: CliArgs,
  config: EnvpeekConfig,
  cwd: string,
): Promise<string[]> {
  const explicit = args.positionalFile ?? args.file;
  if (explicit) {
    return [resolve(cwd, explicit)];
  }

  if (config.files && config.files.length > 0) {
    const existing: string[] = [];
    for (const entry of config.files) {
      const resolved = resolve(cwd, entry);
      if (await fileExists(resolved)) {
        existing.push(resolved);
      }
    }
    if (existing.length === 0) {
      throw new FileError(
        resolve(cwd, config.files[0] ?? '.env'),
        'None of the configured env files exist.',
      );
    }
    if (args.ci) {
      return existing;
    }
    const first = existing[0];
    if (!first) {
      throw new FileError(cwd, 'None of the configured env files exist.');
    }
    return [first];
  }

  const fallback = await resolveDefaultFile(cwd);
  if (!fallback) {
    throw new FileError(
      resolve(cwd, '.env'),
      'No .env.local or .env file found. Pass a path or use --file.',
    );
  }
  return [fallback];
}

async function inspectGit(file: string): Promise<GitStatus> {
  const startDir = dirname(file);
  const available = await isGitAvailable(startDir);
  if (!available) {
    return {
      available: false,
      repository: false,
      ignored: null,
      tracked: null,
    };
  }

  const root = await findGitRoot(startDir);
  if (!root) {
    return {
      available: true,
      repository: false,
      ignored: null,
      tracked: null,
    };
  }

  const [ignored, tracked] = await Promise.all([
    isIgnored(file, startDir),
    isTracked(file, startDir),
  ]);

  return {
    available: true,
    repository: true,
    root,
    ignored,
    tracked,
  };
}

function policyFailed(
  reports: Array<{ variables: DisplayVariable[]; git: GitStatus }>,
  args: CliArgs,
  config: EnvpeekConfig,
): boolean {
  const failIfTracked = args.failIfTracked || config.failIfTracked === true;
  const failIfUnignored = args.failIfUnignored || config.failIfUnignored === true;
  const failIfPrivateKey = args.failIfPrivateKey || config.failIfPrivateKey === true;

  for (const report of reports) {
    if (failIfTracked && report.git.tracked === true) {
      return true;
    }
    if (failIfUnignored && report.git.ignored === false) {
      return true;
    }
    if (
      failIfPrivateKey &&
      report.variables.some((variable) => variable.classification === 'private-key')
    ) {
      return true;
    }
  }

  return false;
}

function policyExit(
  reports: Array<{ variables: DisplayVariable[]; git: GitStatus }>,
  args: CliArgs,
  config: EnvpeekConfig,
): ExitCode {
  return policyFailed(reports, args, config) ? EXIT.POLICY : EXIT.OK;
}
