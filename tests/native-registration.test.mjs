import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
async function artifact() {
  const source = await readFile(new URL('../dist/packages/dsh-lfaa/client.js', import.meta.url), 'utf8');
  let registered;
  runInNewContext(source, { window: { __ModuleLoader__: { load: value => { registered = value; } } } });
  assert.equal(registered.id, 'dsh-lfaa');
  return registered.factory(name => name === '@deepseek-ai/dsh-client-ui-primitives' ? { Modal: () => null } : require(name));
}

test('one DSH artifact contributes native surfaces without replacing conversation, trajectory or root', async () => {
  const plugin = await artifact();
  const contributions = new Set(), types = new Set(), cleanups = [], subscribers = new Set();
  const snapshot = { status: 'ready', value: { enabled: true, preset: 'native', density: 'comfortable', motion: 'system' } };
  const form = { getSnapshot: () => snapshot, subscribe: listener => { subscribers.add(listener); return () => subscribers.delete(listener); }, set: async () => true };
  const ctx = {
    effect: setup => cleanups.push(setup()),
    locale: { register: () => () => {}, bind: () => key => key },
    configForms: { get: id => { assert.equal(id, 'dsh-lfaa'); return form; } },
    theme: { overrideTokens: () => () => {} },
    layout: { selectPanel() {} }, sidebarRight: { openTab() {} },
    sidebarRightTabs: { register: type => { types.add(type.kind); return () => types.delete(type.kind); } },
    slots: {
      inject: (_, setup) => cleanups.push(setup()),
      register: options => { contributions.add(options); return () => contributions.delete(options); },
    },
  };
  plugin.apply(ctx);
  assert.deepEqual([...contributions].map(entry => entry.name).sort(), ['conversation.view', 'main', 'settings.section', 'sidebar.panellist', 'sidebar.right.pane.tab', 'sidebar.right.pane.tab.title'].sort());
  assert.ok([...contributions].every(entry => !['chat', 'trajectory'].includes(entry.id)));
  const views = [...contributions].filter(entry => typeof entry.inject === 'function');
  assert.ok(views.every(entry => entry.inject().hooks.pluginConfig === form));
  assert.equal(types.size, 1);
  for (const cleanup of cleanups.reverse()) cleanup?.();
  assert.equal(subscribers.size, 0);
  assert.equal(contributions.size, 0);
  assert.equal(types.size, 0);
});

test('both languages define the same complete UI vocabulary', async () => {
  const { zh, en } = await import('../packages/dsh-lfaa-workspace/src/locales.mjs');
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
});
