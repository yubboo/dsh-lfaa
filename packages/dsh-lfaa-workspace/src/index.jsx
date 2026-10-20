import { Workspace, PluginIcon, SettingsSection, Inspector, InspectorTitle } from './components.jsx';
import { installPresentation } from 'dsh-lfaa-appearance';
import { zh, en } from './locales.mjs';
import styles from './styles.css';

export const name = 'dsh-lfaa';
export const inject = ['slots', 'locale', 'theme', 'configForms', 'layout', 'sidebarRightTabs', 'sidebarRight', 'sessions'];

/** Native composition root: each contribution retains its DSH scope and owner. */
export function apply(ctx) {
  if (typeof ctx.theme.overrideTokens !== 'function') throw new Error('dsh-lfaa: incompatible DSH ThemeRuntime.');
  ctx.effect(() => ctx.locale.register(name, { zh, en }));
  const t = ctx.locale.bind(name);
  const form = ctx.configForms.get(name);
  const submitMinecraftPrompt = async (sessionId, prompt) => {
    if (!sessionId) throw new Error('请先在 DSH 会话中打开 dsh-lfaa 工作区。');
    await ctx.sessions.using(sessionId, { source: 'dsh-lfaa-minecraft-ui' }, async reference => {
      const session = reference.binding.session;
      const submission = session.beginSubmission({ mode: 'queue', text: prompt, attachments: [] });
      try {
        const result = await session.prompt([{ type: 'text', text: prompt }], 'queue', undefined, submission.requestId);
        if (!result.ok) throw new Error(result.error.message);
      } catch (error) {
        submission.abandon();
        throw error;
      }
    });
  };
  const face = () => ({
    hooks: { pluginConfig: form },
    setConfig: (field, value) => form.set(field, value),
    submitMinecraftPrompt,
    openWorkspace: () => ctx.layout.selectPanel(name),
    returnToChat: () => ctx.layout.selectPanel(null),
    openInspector: () => ctx.sidebarRight.openTab(name),
  });
  ctx.effect(() => {
    if (typeof document === 'undefined') return;
    const tag = document.createElement('style');
    tag.dataset.plugin = name;
    tag.textContent = styles;
    document.head.append(tag);
    return () => tag.remove();
  });
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  installPresentation(ctx, form, media);
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: name, locale: name, inject: face }, Workspace));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: name, order: 20, label: () => t('panel'), locale: name }, PluginIcon));
  // This is a Session-bound workspace view, not a new transcript or event store.
  ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: name, order: 20, label: () => t('view'), locale: name, inject: face }, Workspace));
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: name, order: 30, label: () => t('settings'), locale: name, inject: face }, SettingsSection));
  ctx.effect(() => ctx.sidebarRightTabs.register({ id: name, kind: name, priority: 'extension', title: () => t('name'), guide: [{ id: name, order: 20, title: () => t('panel'), description: () => t('auxiliaryDescription'), icon: PluginIcon }] }));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: name, locale: name, inject: face }, Inspector));
  ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({ name: 'sidebar.right.pane.tab.title', key: name, locale: name }, InspectorTitle));
}
