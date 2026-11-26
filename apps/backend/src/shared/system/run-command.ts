import { execFile } from 'node:child_process';

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface RunCommandOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Runs an executable without a shell, so arguments are never interpreted.
 * Resolves for non-zero exit codes (callers decide what they mean) and rejects
 * only when the command could not be started at all.
 */
export function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: options.timeoutMs, signal: options.signal, windowsHide: true, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`Command not found: ${command}`));
          return;
        }
        const exitCode = error ? (typeof error.code === 'number' ? error.code : null) : 0;
        resolve({ exitCode, stdout, stderr });
      },
    );
  });
}
