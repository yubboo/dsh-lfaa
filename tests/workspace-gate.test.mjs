import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, copyFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

test('workspace gate rejects a package missing the requested dsh- prefix', async () => {
  const temporaryRoot = fileURLToPath(new URL('../dist/.tmp/', import.meta.url));
  await mkdir(temporaryRoot, { recursive: true });
  const fixture = await mkdtemp(resolve(temporaryRoot, 'naming-gate-'));
  try {
    await mkdir(resolve(fixture, 'scripts'));
    await mkdir(resolve(fixture, 'packages/appearance'), { recursive: true });
    await writeFile(resolve(fixture, 'packages/appearance/package.json'), JSON.stringify({ name: 'appearance' }));
    await copyFile(new URL('../scripts/check-workspace.mjs', import.meta.url), resolve(fixture, 'scripts/check-workspace.mjs'));
    const result = spawnSync(process.execPath, [resolve(fixture, 'scripts/check-workspace.mjs')], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Package directory\/name must match and start with dsh-/);
  } finally {
    const inside = relative(temporaryRoot, fixture);
    assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside));
    await rm(fixture, { recursive: true, force: true });
  }
});
