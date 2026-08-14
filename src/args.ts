import { parseArgs } from 'node:util';

import { UsageError } from './utils/errors.js';
import type { CliArgs } from './types.js';

export function parseCliArgs(argv: string[]): CliArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        file: { type: 'string', short: 'f' },
        json: { type: 'boolean', default: false },
        show: { type: 'boolean', default: false },
        yes: { type: 'boolean', short: 'y', default: false },
        debug: { type: 'boolean', default: false },
        ci: { type: 'boolean', default: false },
        'fail-if-tracked': { type: 'boolean', default: false },
        'fail-if-unignored': { type: 'boolean', default: false },
        'fail-if-private-key': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid arguments';
    throw new UsageError(message);
  }

  if (parsed.positionals.length > 1) {
    throw new UsageError('Only one positional file path is allowed.');
  }

  const positionalFile = parsed.positionals[0];
  const file = parsed.values.file;

  if (positionalFile && file) {
    throw new UsageError('Do not combine a positional file path with --file.');
  }

  return {
    file,
    positionalFile,
    json: parsed.values.json === true,
    show: parsed.values.show === true,
    yes: parsed.values.yes === true,
    debug: parsed.values.debug === true,
    ci: parsed.values.ci === true,
    failIfTracked: parsed.values['fail-if-tracked'] === true,
    failIfUnignored: parsed.values['fail-if-unignored'] === true,
    failIfPrivateKey: parsed.values['fail-if-private-key'] === true,
    help: parsed.values.help === true,
    version: parsed.values.version === true,
    argv,
  };
}

export function buildHelp(): string {
  return `envpeek

Safely inspect .env files without accidentally exposing secrets.

Usage
  envpeek [file] [options]
  envpeek --file <path>
  envpeek --json
  envpeek --ci
  envpeek --show --yes

Options
  -f, --file <path>         Inspect this file instead of the default
      --json                Print a JSON report (values remain masked)
      --show                Reveal actual values (dangerous; requires confirmation)
  -y, --yes                 Confirm --show without an interactive prompt
      --debug               Print safe diagnostic details to stderr
      --ci                  Non-interactive CI report; never reveals values
      --fail-if-tracked     Exit 1 if an inspected file is tracked by Git
      --fail-if-unignored   Exit 1 if an inspected file is not ignored by Git
      --fail-if-private-key Exit 1 if a private key is detected
  -h, --help                Show this help
  -v, --version             Print the package version

Examples
  envpeek
  envpeek .env.production
  envpeek --file .env.staging
  envpeek --json
  envpeek --ci --fail-if-tracked --fail-if-unignored
  envpeek --show --yes

Security
  Values are masked by default.
  --show reveals secrets in your terminal. They may remain in history,
  logs, recordings, or CI output. --json --show requires --yes.
  envpeek never uploads files or makes network requests.
`;
}
