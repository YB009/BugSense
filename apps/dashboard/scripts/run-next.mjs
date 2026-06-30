import net from 'node:net';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] ?? 'dev';
const preferredPort = Number(process.env.PORT ?? 3006);
const maxPort = preferredPort + 20;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}

async function main() {
  let port = preferredPort;

  while (port <= maxPort) {
    if (await isPortAvailable(port)) {
      break;
    }

    port += 1;
  }

  if (port > maxPort) {
    console.error(
      `Dashboard could not start because ports ${preferredPort}-${maxPort} are unavailable.`,
    );
    process.exit(1);
  }

  if (port !== preferredPort) {
    console.log(`Dashboard port ${preferredPort} is busy. Using ${port} instead.`);
  }

  const localUrl = `http://localhost:${port}`;
  const networkUrl = `http://127.0.0.1:${port}`;

  if (mode === 'dev') {
    console.log('');
    console.log('='.repeat(64));
    console.log(`BugSense dashboard dev server: ${localUrl}`);
    console.log(`Loopback host URL:           ${networkUrl}`);
    console.log('='.repeat(64));
    console.log('');
  }

  const nodeArgs = [nextBin, mode];
  if (mode === 'dev') nodeArgs.push('--webpack');
  nodeArgs.push('-p', String(port));

  const child = spawn(process.execPath, nodeArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
