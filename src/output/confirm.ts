import { createInterface } from 'node:readline';

import { UsageError } from '../utils/errors.js';

export const SHOW_WARNING = `⚠ WARNING

You are about to display environment values in your terminal.
Sensitive values may remain in terminal history, logs, recordings,
or CI output.

Continue? [y/N]`;

export type ConfirmIo = {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
};

export async function confirmShow(opts: {
  yes: boolean;
  isTTY: boolean;
  json: boolean;
  ci: boolean;
  io?: ConfirmIo;
}): Promise<boolean> {
  if (opts.ci) {
    throw new UsageError('CI mode never reveals values. Do not combine --ci with --show.');
  }

  if (opts.yes) {
    return true;
  }

  if (opts.json) {
    return false;
  }

  if (!opts.isTTY) {
    return false;
  }

  const stdin = opts.io?.stdin ?? process.stdin;
  const stdout = opts.io?.stdout ?? process.stdout;

  stdout.write(`${SHOW_WARNING} `);

  return await new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: false });
    rl.question('', (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
    rl.on('close', () => {
      // if question already resolved this is a no-op for the promise
    });
  });
}
