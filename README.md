# envpeek

**Safely inspect `.env` files without exposing secrets.**

[![CI](https://github.com/boroppi/envpeek/actions/workflows/ci.yml/badge.svg)](https://github.com/boroppi/envpeek/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/envpeek)](https://www.npmjs.com/package/envpeek)
[![license](https://img.shields.io/npm/l/envpeek)](./LICENSE)
[![node](https://img.shields.io/node/v/envpeek)](https://nodejs.org)

```bash
npx envpeek
```

Values are **masked by default**. Nothing is uploaded. There are no network requests.

---

## Why

`.env` files are easy to dump into a terminal, a screenshot, a CI log, or a chat window. Most of the time you only needed the *names* and a hint about which values look public.

envpeek is built around one rule:

> Never expose secrets unless the user explicitly asks to reveal them.

## Features

- Masks likely secrets, tokens, private keys, and database URLs
- Keeps common public values visible (`NEXT_PUBLIC_*`, `VITE_*`, …)
- Warns when a public-looking name still looks like a credential
- Checks whether the file is **ignored** or **tracked** by Git
- JSON and CI modes that never leak values by accident
- Zero production dependencies, runs entirely offline

## Install

```bash
npm install -g envpeek
```

Or run once:

```bash
npx envpeek
```

Requires **Node.js 20+**.

## Quick start

```bash
envpeek                          # .env.local, else .env
envpeek .env.production          # positional file
envpeek --file .env.staging      # same, via flag
envpeek --json                   # machine-readable, still masked
envpeek --ci --fail-if-tracked   # CI policy check
```

Default file preference is `.env.local`, then `.env`. envpeek does **not** scan the rest of the tree.

Do not combine a positional path with `--file`.

## Example

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

Heuristic detection is **not perfect**. A public-looking name can still hold a credential. An unknown name can still be sensitive. When in doubt, envpeek masks the value.

`--show` prints a warning and requires confirmation. `--json --show` also requires `--yes`. `--ci` never reveals values.

## Secret detection

Classification, in order:

| Step | What it looks at |
|------|------------------|
| 1 | Value shape — PEM / OpenSSH private keys, service-account JSON |
| 2 | Custom `sensitivePatterns` from `.envpeek.json` |
| 3 | Public prefixes — `NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `NUXT_PUBLIC_` |
| 4 | Name tokens — `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `PRIVATE_KEY`, `DATABASE_URL`, `JWT_SECRET`, `SERVICE_ROLE_KEY`, `APP_KEY`, `MASTER_KEY`, `DSN` |
| 5 | Database-style names anywhere in the name — `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED` |
| 6 | Well-known prefixes — `sk_live_`, `sk-proj-`, `sk-ant-`, `sb_secret_`, `whsec_`, `gsk_` |
| 7 | Otherwise `unknown`. URLs with `user:password@host` are still masked |

Left visible on purpose: `ANON_KEY`, `PUBLISHABLE_KEY`, `PRIMARY_KEY`.

`NEXT_PUBLIC_API_KEY` stays classified as public, but envpeek warns that it appears to contain a credential and **masks the value**.

Empty values are labeled `Empty value` and are not counted as valid credentials.

`${VAR}` interpolation is **not** expanded. envpeek inspects the source file, not a resolved environment.

UI language is probabilistic (`appears sensitive`, `likely secret`) except for private-key PEM detection, which is treated as deterministic.

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
| `envpeek --version` | Print the version from `package.json` |

## Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | File to inspect |
| `--json` | JSON report; values stay masked |
| `--show` | Reveal values after confirmation |
| `-y, --yes` | Confirm `--show` without a prompt |
| `--debug` | Safe diagnostics on stderr (never values) |
| `--ci` | Non-interactive CI report; never reveals values |
| `--fail-if-tracked` | Exit `1` if the file is tracked |
| `--fail-if-unignored` | Exit `1` if the file is not ignored |
| `--fail-if-private-key` | Exit `1` if a private key is detected |
| `-h, --help` | Help |
| `-v, --version` | Version |

## JSON mode

```bash
envpeek --json
```

Sensitive values remain in `maskedValue`. There is no `value` field in normal output.

`--json --show` requires `--yes`. Without it, envpeek refuses and exits `2`.

## CI mode

```bash
envpeek --ci
envpeek --ci --fail-if-tracked --fail-if-unignored
```

Skips prompts and color (unless `FORCE_COLOR` is set), never reveals values, and returns useful exit codes.

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

CLI arguments override configuration for the same setting. There is no `--no-fail-if-tracked` switch: if the config enables a policy, it stays on.

When `files` is set, envpeek uses the first existing file. In `--ci` mode it inspects every listed file that exists.

### Custom patterns

`sensitivePatterns` supports `*` wildcards only (not full regular expressions). Matching is case-sensitive.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Security / policy failure |
| `2` | Invalid usage, or reveal refused without confirmation |
| `3` | File or configuration error |

## Privacy

All analysis is local.

- No analytics
- No telemetry
- No tracking
- No network requests
- No external API calls

## Development

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

`tests/leakage.test.ts` is a permanent regression test: a recognizable fake secret must never appear in terminal output, JSON, or error messages.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security reporting

See [SECURITY.md](./SECURITY.md). Do not include live secrets in public issues.

## License

[MIT](./LICENSE)
