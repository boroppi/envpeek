import { runGit } from './spawn.js';

export async function findGitRoot(startDir: string): Promise<string | null> {
  const result = await runGit(['rev-parse', '--show-toplevel'], startDir);
  if (!result.available || result.code !== 0) {
    return null;
  }
  const root = result.stdout.trim();
  return root.length > 0 ? root : null;
}

export async function isGitAvailable(startDir: string): Promise<boolean> {
  const result = await runGit(['rev-parse', '--is-inside-work-tree'], startDir);
  return result.available;
}
