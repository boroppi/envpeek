import { runGit } from './spawn.js';

export async function isTracked(filePath: string, cwd: string): Promise<boolean | null> {
  const result = await runGit(['ls-files', '--error-unmatch', '--', filePath], cwd);
  if (!result.available) {
    return null;
  }
  if (result.code === 0) {
    return true;
  }
  if (result.code === 1) {
    return false;
  }
  return null;
}
