import { Readable, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { confirmShow } from '../src/output/confirm.js';
import { UsageError } from '../src/utils/errors.js';

function fakeIo(answer: string): { stdin: Readable; stdout: Writable; written: string } {
  const stdin = Readable.from([answer]);
  let written = '';
  const stdout = new Writable({
    write(chunk, _enc, cb) {
      written += String(chunk);
      cb();
    },
  });
  return { stdin, stdout, written };
}

describe('confirmShow', () => {
  it('returns true when --yes is set', async () => {
    await expect(confirmShow({ yes: true, isTTY: false, json: false, ci: false })).resolves.toBe(
      true,
    );
  });

  it('returns false for JSON without --yes', async () => {
    await expect(confirmShow({ yes: false, isTTY: true, json: true, ci: false })).resolves.toBe(
      false,
    );
  });

  it('returns false when stdin is not a TTY', async () => {
    await expect(confirmShow({ yes: false, isTTY: false, json: false, ci: false })).resolves.toBe(
      false,
    );
  });

  it('throws in CI mode', async () => {
    await expect(
      confirmShow({ yes: false, isTTY: true, json: false, ci: true }),
    ).rejects.toBeInstanceOf(UsageError);
  });

  it('accepts y from stdin', async () => {
    const io = fakeIo('y\n');
    await expect(
      confirmShow({
        yes: false,
        isTTY: true,
        json: false,
        ci: false,
        io: { stdin: io.stdin, stdout: io.stdout },
      }),
    ).resolves.toBe(true);
  });

  it('rejects n from stdin', async () => {
    const io = fakeIo('n\n');
    await expect(
      confirmShow({
        yes: false,
        isTTY: true,
        json: false,
        ci: false,
        io: { stdin: io.stdin, stdout: io.stdout },
      }),
    ).resolves.toBe(false);
  });
});
