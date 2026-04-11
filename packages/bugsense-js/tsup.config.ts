import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'integrations/react': 'src/integrations/react.tsx',
      'integrations/node': 'src/integrations/node.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    external: ['react'],
  },
  {
    entry: {
      'cli/upload-sourcemaps': 'src/cli/upload-sourcemaps.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
    target: 'node18',
  },
]);

