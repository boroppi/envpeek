#!/usr/bin/env node
import { run } from './run.js';
import { exitCodeFor, formatSafeError } from './utils/errors.js';

async function main(): Promise<void> {
  try {
    const result = await run({
      argv: process.argv.slice(2),
      cwd: process.cwd(),
      env: process.env,
      stdoutIsTTY: Boolean(process.stdout.isTTY),
      stdinIsTTY: Boolean(process.stdin.isTTY),
    });
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exitCode = result.exitCode;
  } catch (err) {
    process.stderr.write(`${formatSafeError(err)}\n`);
    process.exitCode = exitCodeFor(err);
  }
}

void main();
