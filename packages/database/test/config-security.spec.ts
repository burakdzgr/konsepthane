import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const prismaRequire = createRequire(require.resolve('prisma/package.json'));
const configRequire = createRequire(prismaRequire.resolve('@prisma/config'));
const { loadConfigFromFile } = prismaRequire('@prisma/config') as {
  loadConfigFromFile: (options: { configRoot: string }) => Promise<{
    error?: unknown;
    resolvedPath: string | null;
    config?: { schema?: string; migrations?: { path?: string } };
  }>;
};
const { deepmerge } = configRequire('deepmerge-ts') as {
  deepmerge: (...values: unknown[]) => unknown;
};

describe('Prisma 6 security override compatibility', () => {
  it('actually resolves the patched deepmerge version from Prisma config', () => {
    const manifestPath = path.resolve(
      path.dirname(configRequire.resolve('deepmerge-ts')),
      '../package.json',
    );
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version: string };
    expect(manifest.version).toBe('8.0.2');
  });
  it('merges ordinary nested configuration without mutating its inputs', () => {
    const base = { migrations: { path: 'prisma/migrations' }, options: { enabled: true } };
    const extra = { migrations: { seed: 'tsx prisma/seed.ts' } };
    expect(deepmerge(base, extra)).toEqual({
      migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
      options: { enabled: true },
    });
    expect(base.migrations).toEqual({ path: 'prisma/migrations' });
  });
  it('handles circular input without exhausting the stack', () => {
    const left: { self?: unknown } = {};
    const right: { self?: unknown } = {};
    left.self = left;
    right.self = right;
    expect(() => deepmerge(left, right)).not.toThrow();
  });
  it('loads the TypeScript Prisma config through c12 and the overridden merger', async () => {
    const fixtureRoot = fileURLToPath(new URL('./fixtures/config-security/', import.meta.url));
    const result = await loadConfigFromFile({ configRoot: fixtureRoot });
    expect(result.error).toBeUndefined();
    expect(result.resolvedPath).toBe(path.join(fixtureRoot, 'prisma.config.ts'));
    expect(result.config?.schema).toBe(path.resolve(fixtureRoot, '../../../prisma/schema.prisma'));
    expect(result.config?.migrations?.path).toBe(
      path.resolve(fixtureRoot, '../../../prisma/migrations'),
    );
  });
});
