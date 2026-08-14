import { runGit } from './spawn.js';

export async function isIgnored(filePath: string, cwd: string): Promise<boolean | null> {
  const result = await runGit(['check-ignore', '-q', '--', filePath], cwd);
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
