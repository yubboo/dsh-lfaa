import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presentationTokens, installPresentation } from 'dsh-lfaa-appearance';

const config = { enabled: true, preset: 'native', density: 'comfortable', motion: 'system' };

function fixture(value = config) {
  let snapshot = { status: 'ready', value };
  const listeners = new Set(), mediaListeners = new Set(), layers = new Map(), cleanups = [];
  let calls = 0;
  const media = { matches: false, addEventListener: (_, listener) => mediaListeners.add(listener), removeEventListener: (_, listener) => mediaListeners.delete(listener) };
  const form = { getSnapshot: () => snapshot, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } };
  const ctx = {
    effect: setup => cleanups.push(setup()),
    theme: { overrideTokens(source, tokens) {
      calls++; const layer = { tokens }; layers.set(source, layer);
      return () => { if (layers.get(source) === layer) layers.delete(source); };
    } },
  };
  return {
    ctx, form, media, listeners, mediaListeners, layers, get calls() { return calls; },
    update(next) { snapshot = next; for (const listener of [...listeners]) listener(); },
    reduce(value) { media.matches = value; for (const listener of [...mediaListeners]) listener(); },
    dispose() { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); },
  };
}

test('default preferences do not replace host palette or typography', () => {
  assert.deepEqual(presentationTokens(config), {});
  for (const preset of ['soft', 'crisp']) {
    const tokens = presentationTokens({ ...config, preset });
    assert.ok(Object.keys(tokens).length > 0);
    assert.ok(!Object.keys(tokens).some(key => /font|brand-primary/.test(key)));
    assert.ok(Object.values(tokens).every(value => typeof value.light === 'string' && typeof value.dark === 'string'));
  }
});

test('system reduced motion takes precedence and disabled returns all control to the host', () => {
  assert.equal(presentationTokens({ ...config, preset: 'soft' }, true)['--ds-transition-duration'].light, '80ms');
  assert.equal(presentationTokens({ ...config, motion: 'reduced' })['--ds-transition-duration'].dark, '80ms');
  assert.deepEqual(presentationTokens({ ...config, enabled: false, preset: 'soft' }, true), {});
});

test('unrelated density changes and identical echoes never restack theme layers', () => {
  const state = fixture({ ...config, preset: 'soft' });
  installPresentation(state.ctx, state.form, state.media);
  state.update({ status: 'ready', value: { ...config, preset: 'soft', density: 'compact' } });
  assert.equal(state.calls, 1);
  assert.equal(state.layers.size, 1);
  state.dispose();
});

test('disable, unavailable configuration and OS changes retain no stale overrides', () => {
  const state = fixture({ ...config, preset: 'soft' });
  installPresentation(state.ctx, state.form, state.media);
  state.reduce(true);
  assert.equal(state.calls, 2);
  assert.equal(state.layers.size, 1);
  state.update({ status: 'ready', value: { ...config, enabled: false } });
  assert.equal(state.layers.size, 0);
  state.update({ status: 'unavailable' });
  state.dispose();
  assert.equal(state.listeners.size, 0);
  assert.equal(state.mediaListeners.size, 0);
});

test('repeated load and teardown do not retain subscriptions', () => {
  const state = fixture({ ...config, preset: 'crisp' });
  for (let index = 0; index < 3; index++) {
    installPresentation(state.ctx, state.form, state.media);
    assert.equal(state.listeners.size, 1);
    assert.equal(state.mediaListeners.size, 1);
    state.dispose();
    assert.equal(state.layers.size, 0);
    assert.equal(state.listeners.size, 0);
    assert.equal(state.mediaListeners.size, 0);
  }
});
