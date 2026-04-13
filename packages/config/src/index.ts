import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

interface LoadEnvOptions {
  serviceName?: string;
  includeInfraEnv?: boolean;
}

export function loadEnvFiles(options: LoadEnvOptions = {}) {
  const cwd = process.cwd();
  const workspaceRoot = findWorkspaceRoot(cwd);
  const candidates = [
    join(workspaceRoot, '.env'),
    join(workspaceRoot, '.env.local'),
  ];

  if (options.serviceName) {
    candidates.push(
      join(workspaceRoot, 'apps', options.serviceName, '.env'),
      join(workspaceRoot, 'apps', options.serviceName, '.env.local'),
    );
  }

  if (options.includeInfraEnv) {
    candidates.push(join(workspaceRoot, 'infra', '.env'));
  }

  for (const filePath of candidates) {
    loadEnvFile(filePath);
  }
}

export function resolveWorkspacePath(...segments: string[]) {
  return join(findWorkspaceRoot(process.cwd()), ...segments);
}

export function parseProjectApiKeys(
  rawValue: string | undefined,
): Record<string, string> {
  if (!rawValue) {
    return {};
  }

  return rawValue
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const separatorIndex = pair.indexOf(':');
      if (separatorIndex <= 0) {
        return acc;
      }

      const projectId = pair.slice(0, separatorIndex).trim();
      const apiKey = pair.slice(separatorIndex + 1).trim();

      if (projectId && apiKey) {
        acc[projectId] = apiKey;
      }

      return acc;
    }, {});
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function findWorkspaceRoot(startDir: string) {
  let currentDir = startDir;

  while (true) {
    if (existsSync(join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
}

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
