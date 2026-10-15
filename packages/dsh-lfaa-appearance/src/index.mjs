/** Derive only the host tokens actually consumed by native surfaces and motion. */
export function presentationTokens(config, systemReduced = false) {
  if (!config.enabled) return {};
  const pair = value => ({ light: value, dark: value });
  const tokens = {};
  if (config.preset === 'soft') {
    // 共享卡片/弹窗圆角：小、中和主面板分别为 10/16/24px，呈现柔和边缘。
    tokens['--dsw-radius-sm'] = pair('10px');
    tokens['--dsw-radius-md'] = pair('16px');
    tokens['--dsw-radius-panel'] = pair('24px');
    // 浮层背景：浅色为94%不透明白色，深色为96%不透明中性深灰。
    tokens['--dsw-alias-bg-overlay'] = { light: 'rgb(255 255 255 / 94%)', dark: 'rgb(29 30 34 / 96%)' };
    // 主要弹窗阴影：浅色低浓度冷黑柔影，深色更深黑影，用于区分浮层层级。
    tokens['--dsw-elevation-prominent'] = { light: '0 16px 48px rgb(15 23 42 / 12%)', dark: '0 16px 48px rgb(0 0 0 / 36%)' };
  } else if (config.preset === 'crisp') {
    // 共享卡片/弹窗圆角：小、中和主面板分别为 6/10/16px，呈现更清晰边界。
    tokens['--dsw-radius-sm'] = pair('6px');
    tokens['--dsw-radius-md'] = pair('10px');
    tokens['--dsw-radius-panel'] = pair('16px');
    // 主要弹窗阴影：浅色14%冷黑短影、深色36%黑短影，减少视觉漂浮感。
    tokens['--dsw-elevation-prominent'] = { light: '0 8px 28px rgb(15 23 42 / 14%)', dark: '0 8px 28px rgb(0 0 0 / 36%)' };
  }
  const reduced = systemReduced || config.motion === 'reduced';
  if (reduced || config.preset !== 'native') {
    // 宿主共享过渡时长：减少动态效果时保留80ms轻淡变化，否则使用180ms快速响应。
    tokens['--ds-transition-duration'] = pair(reduced ? '80ms' : '180ms');
    tokens['--ds-transition-duration-fast'] = pair(reduced ? '80ms' : '125ms');
    tokens['--ds-transition-duration-slow'] = pair(reduced ? '80ms' : '240ms');
    // 宿主共享缓动：快速起步、平滑收尾，不增加弹跳或额外空间位移。
    tokens['--ds-ease-in-out'] = pair('cubic-bezier(0.23, 1, 0.32, 1)');
  }
  return tokens;
}

/** One settings subscription and one OS preference listener per plugin lifetime. */
export function installPresentation(ctx, form, media) {
  ctx.effect(() => {
    let remove;
    let signature;
    let disposed = false;
    const clear = () => { remove?.(); remove = undefined; signature = undefined; };
    const sync = () => {
      if (disposed) return;
      const snapshot = form.getSnapshot();
      if (snapshot.status !== 'ready' || !snapshot.value) { clear(); return; }
      const tokens = presentationTokens(snapshot.value, media?.matches === true);
      const next = JSON.stringify(tokens);
      if (next === signature) return;
      const previous = remove;
      remove = Object.keys(tokens).length ? ctx.theme.overrideTokens('dsh-lfaa', tokens) : undefined;
      previous?.();
      signature = next;
    };
    const unsubscribe = form.subscribe(sync);
    media?.addEventListener('change', sync);
    try { sync(); } catch (error) { unsubscribe(); media?.removeEventListener('change', sync); clear(); throw error; }
    return () => { disposed = true; unsubscribe(); media?.removeEventListener('change', sync); clear(); };
  });
}
