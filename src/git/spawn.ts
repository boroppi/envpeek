import { spawn } from 'node:child_process';

import { GIT_TIMEOUT_MS } from '../constants.js';

export type GitRunResult = {
  code: number;
  stdout: string;
  stderr: string;
  available: boolean;
};

export function runGit(args: readonly string[], cwd: string): Promise<GitRunResult> {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn('git', [...args], {
      cwd,
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const finish = (result: GitRunResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({ code: 1, stdout: '', stderr: '', available: true });
    }, GIT_TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        finish({ code: 1, stdout: '', stderr: '', available: false });
        return;
      }
      finish({ code: 1, stdout: '', stderr: '', available: false });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      finish({
        code: code ?? 1,
        stdout,
        stderr,
        available: true,
      });
    });
  });
}
