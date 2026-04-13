#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, readdir } from 'fs/promises';
import { basename, extname, join, relative, resolve } from 'path';

interface UploadSourcemapsOptions {
  release: string;
  dir: string;
  endpoint: string;
  apiKey: string;
  projectId: string;
  dryRun?: boolean;
}

interface SourcemapRecord {
  filePath: string;
  relativePath: string;
  sourceMap: string;
}

const program = new Command();

program
  .name('bugsense')
  .description('BugSense SDK command line tools')
  .version('0.1.0');

program
  .command('upload-sourcemaps')
  .description('Upload sourcemap files for a release')
  .requiredOption('--release <release>', 'Release identifier, for example v1.0')
  .option('--dir <dir>', 'Directory to scan for .map files', 'dist')
  .option(
    '--endpoint <endpoint>',
    'BugSense sourcemap upload endpoint',
    'http://localhost:3000/sourcemaps',
  )
  .option(
    '--api-key <apiKey>',
    'Project API key',
    process.env.BUGSENSE_API_KEY,
  )
  .option(
    '--project-id <projectId>',
    'Project identifier',
    process.env.BUGSENSE_PROJECT_ID,
  )
  .option('--dry-run', 'Print discovered sourcemaps without uploading')
  .action(async (options: UploadSourcemapsOptions) => {
    try {
      const result = await uploadSourcemaps(options);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`bugsense upload-sourcemaps failed: ${message}\n`);
      process.exitCode = 1;
    }
  });

if (isCliExecution()) {
  void program.parseAsync(process.argv);
}

export async function uploadSourcemaps(options: UploadSourcemapsOptions) {
  if (!options.apiKey) {
    throw new Error('Missing --api-key or BUGSENSE_API_KEY');
  }

  if (!options.projectId) {
    throw new Error('Missing --project-id or BUGSENSE_PROJECT_ID');
  }

  const rootDir = resolve(options.dir);
  const records = await collectSourcemaps(rootDir);

  if (records.length === 0) {
    throw new Error(`No .map files found under ${rootDir}`);
  }

  if (options.dryRun) {
    return {
      uploaded: false,
      release: options.release,
      count: records.length,
      files: records.map((record) => record.relativePath),
    };
  }

  let uploaded = 0;
  for (const record of records) {
    await postSourcemap({
      apiKey: options.apiKey,
      endpoint: options.endpoint,
      payload: {
        projectId: options.projectId,
        release: options.release,
        fileName: basename(record.filePath),
        relativePath: record.relativePath,
        sourceMap: record.sourceMap,
      },
    });
    uploaded += 1;
  }

  return {
    uploaded: true,
    release: options.release,
    count: uploaded,
    endpoint: options.endpoint,
  };
}

async function collectSourcemaps(rootDir: string) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: SourcemapRecord[] = [];

  for (const entry of entries) {
    const filePath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourcemaps(filePath)));
      continue;
    }

    if (extname(entry.name) !== '.map') {
      continue;
    }

    files.push({
      filePath,
      relativePath: relative(resolve(process.cwd()), filePath).replaceAll('\\', '/'),
      sourceMap: await readFile(filePath, 'utf8'),
    });
  }

  return files;
}

async function postSourcemap(input: {
  endpoint: string;
  apiKey: string;
  payload: Record<string, string>;
}) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable in this runtime');
  }

  const response = await fetch(input.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bugsense-api-key': input.apiKey,
    },
    body: JSON.stringify(input.payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Upload failed with status ${response.status}: ${message || 'unknown error'}`,
    );
  }
}

function isCliExecution() {
  return process.argv[1]?.endsWith('upload-sourcemaps.cjs') ||
    process.argv[1]?.endsWith('upload-sourcemaps.js');
}
