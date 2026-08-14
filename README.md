# envpeek

Safely inspect `.env` files without exposing secrets.

![CI](https://github.com/boroppi/envpeek/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/envpeek)
![license](https://img.shields.io/npm/l/envpeek)

## Overview

`envpeek` is a small, privacy-first CLI for inspecting `.env` files and environment-style configuration. It classifies variables, masks values that appear sensitive, and checks whether the file is ignored or tracked by Git.

```bash
npx envpeek
```

## Why envpeek exists

`.env` files are easy to dump into a terminal, a screenshot, a CI log, or a chat window. Most of the time you only needed the *names* and a hint about which values look public.

envpeek is built around one rule:

> Never expose secrets unless the user explicitly asks to reveal them.

## Installation

```bash
npm install -g envpeek
```

Or run it without installing:

```bash
npx envpeek
```

Requires Node.js 20 or later.

## Quick start

```bash
envpeek
envpeek .env.production
envpeek --file .env.staging
envpeek --json
envpeek --ci --fail-if-tracked --fail-if-unignored
```

By default envpeek inspects `.env.local` if that file exists in the current directory, otherwise `.env`. It does not scan the rest of the tree.

## Example output

```text
envpeek

Environment: .env.local
────────────────────────────────────────────

PUBLIC
  ✓ NEXT_PUBLIC_API_URL     https://api.example.com
  ✓ NEXT_PUBLIC_APP_NAME    My App

SENSITIVE
  🔒 DATABASE_URL            postgresql://••••••••••••@example.com/db
  🔒 STRIPE_SECRET_KEY       sk_live_••••••••••••
  🔒 JWT_SECRET              ••••••••••••••••

UNKNOWN
  ? FEATURE_FLAG             enabled

Summary
────────────────────────────────────────────
5 variables
2 public
3 protected

⚠ 3 variables appear to contain secrets

Git status
────────────────────────────────────────────

✓ .env.local is ignored by Git
✓ File is not tracked

💡 Values are masked by default.
```

## Security

envpeek masks sensitive values by default.

It does not upload environment files or make network requests.

However, no tool can guarantee that a secret is safe if you explicitly
choose to reveal it with `--show`.

Heuristic secret detection is **not perfect**. A public-looking name can still hold a credential. An unknown name can still be sensitive. When in doubt, envpeek masks the value.

## Secret detection

Classification is based on:

1. Value shape (PEM / OpenSSH private keys, well-known token prefixes)
2. Custom wildcard patterns from `.envpeek.json`
3. Public prefixes: `NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `NUXT_PUBLIC_`
4. Name tokens such as `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `PRIVATE_KEY`, `DATABASE_URL`, `JWT_SECRET`
5. Otherwise `unknown`

Language in the UI is probabilistic (`appears sensitive`, `likely secret`, `possibly public`) except for private-key PEM detection, which is treated as deterministic.

A name such as `NEXT_PUBLIC_API_KEY` is still classified as public, but envpeek warns that it appears to contain a credential and masks the value.

Empty values are labeled `Empty value` and are not counted as valid credentials.

`${VAR}` interpolation is **not** expanded. envpeek inspects the source file, not a resolved environment.

## Git integration

envpeek invokes local `git` with argument arrays (never a shell):

- Is this path inside a repository?
- Is the inspected file ignored?
- Is the inspected file tracked?

It finds the repository root from the file's directory, so running the command from a nested folder still works.

envpeek never edits `.gitignore` and never untracks files.

If a file is tracked, envpeek prints a high-priority warning and still does **not** display raw values.

## Commands

| Command | Meaning |
|---------|---------|
| `envpeek` | Inspect `.env.local` or `.env` |
| `envpeek <file>` | Inspect that file |
| `envpeek --file <file>` | Same as the positional form |
| `envpeek --help` | Show help |
| `envpeek --version` | Print `0.1.0` (from `package.json`) |

Do not combine a positional path with `--file`.

## Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | File to inspect |
| `--json` | JSON report; values stay masked |
| `--show` | Reveal values after confirmation |
| `-y, --yes` | Confirm `--show` without a prompt |
| `--debug` | Safe diagnostics on stderr (never values) |
| `--ci` | Non-interactive CI report; never reveals values |
| `--fail-if-tracked` | Exit 1 if the file is tracked |
| `--fail-if-unignored` | Exit 1 if the file is not ignored |
| `--fail-if-private-key` | Exit 1 if a private key is detected |
| `-h, --help` | Help |
| `-v, --version` | Version |

## JSON mode

```bash
envpeek --json
```

Sensitive values remain in `maskedValue`. There is no `value` field in normal output.

`--json --show` requires `--yes`. Without it, envpeek refuses and exits 2.

## CI mode

```bash
envpeek --ci
envpeek --ci --fail-if-tracked --fail-if-unignored
```

CI mode skips prompts and color (unless `FORCE_COLOR` is set), never reveals values, and returns useful exit codes.

## Configuration

Optional file in the current working directory: `.envpeek.json`.

```json
{
  "files": [".env", ".env.local"],
  "failIfTracked": true,
  "failIfUnignored": true,
  "failIfPrivateKey": false,
  "sensitivePatterns": ["MY_CUSTOM_SECRET", "*_CREDENTIAL", "INTERNAL_SECRET_*"]
}
```

CLI arguments override configuration for the same setting. There is no `--no-fail-if-tracked` switch in v0.1.0: if the config enables a policy, it stays on.

When `files` is set, envpeek uses the first existing file. In `--ci` mode it inspects every listed file that exists.

## Custom patterns

`sensitivePatterns` supports `*` wildcards only (not full regular expressions). Matching is case-sensitive.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Security / policy failure |
| 2 | Invalid usage, or reveal refused without confirmation |
| 3 | File or configuration error |

## Privacy

envpeek performs all analysis locally.

- no analytics
- no telemetry
- no tracking
- no network requests
- no external API calls

## Development

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

## Testing

```bash
npm test
```

`tests/leakage.test.ts` is a permanent regression test: a recognizable fake secret must never appear in terminal output, JSON, or error messages.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security reporting

See [SECURITY.md](./SECURITY.md). Do not include live secrets in public issues.

## License

MIT
