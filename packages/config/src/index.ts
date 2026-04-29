import { existsSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import net from 'net';
import { dirname, join } from 'path';

interface LoadEnvOptions {
  serviceName?: string;
  includeInfraEnv?: boolean;
}

export function loadEnvFiles(options: LoadEnvOptions = {}) {
  const protectedKeys = new Set(Object.keys(process.env));
  const cwd = process.cwd();
  const workspaceRoot = findWorkspaceRoot(cwd);
  const candidates: Array<{ filePath: string; overrideExisting: boolean }> = [
    {
      filePath: join(workspaceRoot, '.env'),
      overrideExisting: false,
    },
  ];

  if (options.includeInfraEnv) {
    candidates.push({
      filePath: join(workspaceRoot, 'infra', '.env'),
      overrideExisting: true,
    });
  }

  candidates.push(
    {
      filePath: join(workspaceRoot, '.env.local'),
      overrideExisting: true,
    },
  );

  if (options.serviceName) {
    candidates.push(
      {
        filePath: join(workspaceRoot, 'apps', options.serviceName, '.env'),
        overrideExisting: true,
      },
      {
        filePath: join(
          workspaceRoot,
          'apps',
          options.serviceName,
          '.env.local',
        ),
        overrideExisting: true,
      },
    );
  }

  for (const candidate of candidates) {
    loadEnvFile(candidate.filePath, {
      overrideExisting: candidate.overrideExisting,
      protectedKeys,
    });
  }
}

export function resolveWorkspacePath(...segments: string[]) {
  return join(findWorkspaceRoot(process.cwd()), ...segments);
}

export function resolveWorkspaceRoot() {
  return findWorkspaceRoot(process.cwd());
}

export async function resolveDevHttpPort(options: {
  serviceName: string;
  preferredPort: number;
  explicitPort?: boolean;
  host?: string;
  maxPortOffset?: number;
}) {
  const {
    serviceName,
    preferredPort,
    explicitPort = false,
    host = '127.0.0.1',
    maxPortOffset = 20,
  } = options;

  const maxPort = preferredPort + maxPortOffset;
  for (let port = preferredPort; port <= maxPort; port += 1) {
    if (explicitPort && port !== preferredPort) {
      break;
    }

    if (await isPortAvailable(port)) {
      await writeDevPortRegistry({
        [serviceName]: {
          host,
          port,
        },
      });
      return port;
    }
  }

  return null;
}

export async function registerDevServicePort(options: {
  serviceName: string;
  host?: string;
  port: number;
}) {
  const { serviceName, host = '127.0.0.1', port } = options;
  await writeDevPortRegistry({
    [serviceName]: {
      host,
      port,
    },
  });
}

export function getRegisteredDevServiceUrl(
  serviceName: string,
  fallbackUrl: string,
) {
  const registry = readDevPortRegistry();
  const registered = registry[serviceName];

  if (!registered?.port) {
    return fallbackUrl;
  }

  return `http://${registered.host ?? '127.0.0.1'}:${registered.port}`;
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

function loadEnvFile(
  filePath: string,
  options: {
    overrideExisting: boolean;
    protectedKeys: Set<string>;
  },
) {
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

    if (options.protectedKeys.has(key) && key in process.env) {
      continue;
    }

    if (options.overrideExisting || !(key in process.env)) {
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

async function isPortAvailable(port: number) {
  const ipv6Result = await canListenOnPort(port, '::');
  if (ipv6Result !== 'unsupported') {
    return ipv6Result;
  }

  return canListenOnPort(port, '0.0.0.0');
}

function canListenOnPort(port: number, host: string) {
  return new Promise<boolean | 'unsupported'>((resolve) => {
    const server = net.createServer();

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EAFNOSUPPORT') {
        resolve('unsupported');
        return;
      }

      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

function getDevPortRegistryPath() {
  return resolveWorkspacePath('.dev', 'ports.json');
}

function readDevPortRegistry(): Record<string, { host?: string; port: number }> {
  const registryPath = getDevPortRegistryPath();
  if (!existsSync(registryPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(registryPath, 'utf8')) as Record<
      string,
      { host?: string; port: number }
    >;
  } catch {
    return {};
  }
}

async function writeDevPortRegistry(
  patch: Record<string, { host?: string; port: number }>,
) {
  const registryPath = getDevPortRegistryPath();
  await mkdir(dirname(registryPath), { recursive: true });

  let current: Record<string, { host?: string; port: number }> = {};
  try {
    const raw = await readFile(registryPath, 'utf8');
    current = JSON.parse(raw) as Record<string, { host?: string; port: number }>;
  } catch {
    current = {};
  }

  await writeFile(
    registryPath,
    JSON.stringify(
      {
        ...current,
        ...patch,
      },
      null,
      2,
    ),
    'utf8',
  );
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
