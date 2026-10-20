import { Workspace, PluginIcon, SettingsSection, Inspector, InspectorTitle } from './components.jsx';
import { installPresentation } from 'dsh-lfaa-appearance';
import { zh, en } from './locales.mjs';
import styles from './styles.css';

export const name = 'dsh-lfaa';
export const inject = ['slots', 'locale', 'theme', 'configForms', 'layout', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'remote', 'remote.account'];

/** Native composition root: each contribution retains its DSH scope and owner. */
export function apply(ctx) {
  if (typeof ctx.theme.overrideTokens !== 'function') throw new Error('dsh-lfaa: incompatible DSH ThemeRuntime.');
  ctx.effect(() => ctx.locale.register(name, { zh, en }));
  const t = ctx.locale.bind(name);
  const form = ctx.configForms.get(name);
  let writingAccount = { status: 'loading' };
  const writingAccountListeners = new Set();
  const publishWritingAccount = next => {
    writingAccount = next;
    for (const listener of writingAccountListeners) listener();
  };
  const subscribeWritingAccount = listener => {
    writingAccountListeners.add(listener);
    return () => writingAccountListeners.delete(listener);
  };
  const getWritingAccount = () => writingAccount;
  const readWritingAccountId = async () => {
    const result = await ctx.remote.account.getProfile({
      version: 'dsh-lfaa/0.1.3',
      locale: ctx.locale.getSnapshot().active,
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    });
    if (!result.ok) throw new Error('DSH 账号身份暂时无法读取。');
    const accountId = result.value?.status === 'ready' ? result.value.value.id : undefined;
    if (!accountId) throw new Error(t('writingAccountRequired'));
    return accountId;
  };
  ctx.effect(() => {
    const controller = new AbortController();
    let revision = 0;
    void (async () => {
      try {
        for await (const account of ctx.remote.account.watch(controller.signal)) {
          const current = ++revision;
          if (account.status !== 'credential-stored') {
            publishWritingAccount({ status: 'signed-out' });
            continue;
          }
          publishWritingAccount({ status: 'loading' });
          void readWritingAccountId().then(accountId => {
            if (current === revision && !controller.signal.aborted) publishWritingAccount({ status: 'ready', accountId });
          }).catch(() => {
            if (current === revision && !controller.signal.aborted) publishWritingAccount({ status: 'error' });
          });
        }
      } catch {
        if (!controller.signal.aborted) publishWritingAccount({ status: 'error' });
      }
    })();
    return () => {
      controller.abort();
      writingAccountListeners.clear();
    };
  }, 'writing account scope');
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
  const submitWritingPrompt = async (sessionId, prompt, signal) => {
    if (!sessionId) throw new Error('请先选择一个 DSH 会话。');
    return await ctx.sessions.using(sessionId, { source: 'dsh-lfaa-writing', signal }, async reference => {
      await reference.ready;
      const { session, eventSource } = reference.binding;
      if (session.getSnapshot().running) throw new Error('所选 DSH 会话正在运行。请等它完成后再生成写作建议。');
      if (signal?.aborted) throw signal.reason ?? new DOMException('操作已取消。', 'AbortError');
      const cursor = Math.max(-1, ...eventSource.getSnapshot().entries.map(entry => entry.type === 'event' ? entry.event.seq : -1));
      let currentTurn;
      let userSeq;
      let latestText = '';
      let inspectedSeq = cursor;
      let resolveReply;
      let rejectReply;
      const reply = new Promise((resolve, reject) => { resolveReply = resolve; rejectReply = reject; });
      void reply.catch(() => {});
      const extractText = event => event?.data?.message?.content
        ?.filter(part => part.type === 'text')
        .map(part => part.text)
        .join('') ?? '';
      const inspect = () => {
        for (const entry of eventSource.getSnapshot().entries) {
          if (entry.type !== 'event') continue;
          const event = entry.event;
          if (event.seq <= inspectedSeq || event.seq <= cursor) continue;
          inspectedSeq = event.seq;
          if (event.type === 'turn/start') currentTurn = event.data.turn;
          if (event.type === 'user/message' && extractText(event) === prompt) userSeq = event.seq;
          if (userSeq === undefined || currentTurn === undefined || event.seq <= userSeq) continue;
          if (event.type === 'assistant/message' && event.data.turn === currentTurn && event.data.interrupted !== true) {
            const text = extractText(event);
            if (text.trim()) latestText = text;
          }
          if (event.type === 'turn/end' && event.data.turn === currentTurn) {
            if (event.data.reason.kind === 'completed' && latestText.trim()) resolveReply(latestText.trim());
            else rejectReply(new Error(`DSH 写作回复未正常完成（${event.data.reason.kind}）。`));
            return;
          }
        }
      };
      const unsubscribe = eventSource.subscribe(inspect);
      const timeout = setTimeout(() => rejectReply(new Error('等待 DSH 写作回复超时；你仍可在所选会话中查看 Agent 进度。')), 300_000);
      const abort = () => rejectReply(signal.reason ?? new DOMException('操作已取消。', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      try {
        const submission = session.beginSubmission({ mode: 'queue', text: prompt, attachments: [] });
        try {
          const result = await session.prompt([{ type: 'text', text: prompt }], 'queue', signal, submission.requestId);
          if (!result.ok) throw new Error(result.error.message);
        } catch (error) {
          submission.abandon();
          throw error;
        }
        inspect();
        return await reply;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
        unsubscribe();
      }
    });
  };
  const face = () => ({
    hooks: { pluginConfig: form },
    setConfig: (field, value) => form.set(field, value),
    submitMinecraftPrompt,
    submitWritingPrompt,
    createWritingSession: () => ctx.sessions.create(),
    subscribeWritingAccount,
    getWritingAccount,
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
