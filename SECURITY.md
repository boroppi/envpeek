# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories on [boroppi/envpeek](https://github.com/boroppi/envpeek/security/advisories).

Do **not** open a public issue that contains:

- live secrets
- production `.env` files
- private keys
- access tokens

Use redacted or synthetic examples instead.

There is no separate security inbox for this project.

## Scope

envpeek is a local CLI. It does not collect telemetry, upload files, or make network requests.

A report is in scope if envpeek can print a secret during normal operation (default inspect, `--json`, `--debug`, `--ci`, help, or error messages) without an explicit confirmed `--show --yes`.

## Handling secrets

If you accidentally revealed a real credential while testing envpeek — in a terminal, CI log, or screenshot — rotate that credential. The tool cannot unsay a value that has already been printed.
