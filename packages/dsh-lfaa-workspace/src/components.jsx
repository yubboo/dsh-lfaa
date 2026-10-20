import { Component, useState, useSyncExternalStore } from 'react';
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { WritingWorkspace } from './writing.tsx';

export function PluginIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 4v16M9 10h11" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

function Preview({ t }) {
  return <div className="lfaa-preview" aria-label={t('previewLabel')}>
    <div className="lfaa-preview-chrome"><span/><span/><span/></div>
    <div className="lfaa-preview-layout"><div className="lfaa-preview-rail"><i/><i/><i/></div><div className="lfaa-preview-content"><span className="lfaa-kicker">{t('cardTitle')}</span><div className="lfaa-sample-card"><div className="lfaa-mark"><PluginIcon/></div><strong>{t('sampleDetail')}</strong><p>{t('sampleNote')}</p><div className="lfaa-sample-lines" aria-hidden="true"><i/><i/></div></div></div></div>
  </div>;
}

export function AppearanceControls(props) {
  const { t } = props;
  const snapshot = props.usePluginConfig(snapshot => snapshot);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (snapshot.status !== 'ready' || !snapshot.value) return <div className="lfaa-empty" role="status">{t(snapshot.status === 'loading' ? 'loading' : 'unavailable')}</div>;
  const config = snapshot.value;
  const disabled = pending || !snapshot.writable;
  const change = async (field, value) => {
    setPending(true); setError('');
    try { if (!await props.setConfig(field, value)) setError(t('rejected')); }
    catch { setError(t('error')); }
    finally { setPending(false); }
  };
  return <div className="lfaa-controls" data-density={config.density}>
    <div className="lfaa-section-heading"><div><h2>{t('appearance')}</h2><p>{t('settingsDescription')}</p></div><span className="lfaa-sync">{t(snapshot.writable ? 'saved' : 'readonly')}</span></div>
    <fieldset className="lfaa-presets" disabled={disabled}><legend>{t('preset')}</legend><div className="lfaa-preset-grid">{['native', 'soft', 'crisp'].map(preset => <button type="button" key={preset} className="lfaa-preset" aria-pressed={config.preset === preset} onClick={() => change('preset', preset)}><span className={`lfaa-style-swatch lfaa-swatch-${preset}`} aria-hidden="true"><i/><i/><i/></span><strong>{t(preset)}</strong><span>{t(`${preset}Hint`)}</span></button>)}</div></fieldset>
    <div className="lfaa-settings-rows">
      <label className="lfaa-setting-row"><span>{t('density')}</span><select value={config.density} disabled={disabled} onChange={event => change('density', event.target.value)}>{['comfortable', 'compact'].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
      <label className="lfaa-setting-row"><span>{t('motion')}</span><select value={config.motion} disabled={disabled} onChange={event => change('motion', event.target.value)}>{['system', 'reduced'].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
      <label className="lfaa-setting-row"><span><strong>{t('enabled')}</strong><small>{t('enabledHint')}</small></span><input type="checkbox" checked={config.enabled} disabled={disabled} onChange={event => change('enabled', event.target.checked)}/></label>
    </div>
    {error && <p className="lfaa-error" role="alert">{error}</p>}
  </div>;
}

class SurfaceErrorBoundary extends Component {
  state = { error: undefined };

  static getDerivedStateFromError(error) { return { error }; }

  render() {
    if (this.state.error) return <section className="lfaa-render-error" role="alert">
      <h2>{this.props.t('renderErrorTitle')}</h2>
      <p>{this.props.t('renderErrorHint')}</p>
      <pre>{String(this.state.error?.message ?? this.state.error).slice(0, 4000)}</pre>
    </section>;
    return this.props.children;
  }
}

export function Workspace(props) {
  return <SurfaceErrorBoundary t={props.t}><WorkspaceContent {...props}/></SurfaceErrorBoundary>;
}

function WorkspaceContent(props) {
  const { t } = props;
  const config = props.usePluginConfig(snapshot => snapshot).value;
  const sessionList = props.useSessions(state => state);
  const writingAccount = useSyncExternalStore(props.subscribeWritingAccount, props.getWritingAccount, props.getWritingAccount);
  const [dialog, setDialog] = useState(false);
  const [page, setPage] = useState('writing');
  return <section className="lfaa-panel" data-density={config?.density ?? 'comfortable'}>
    <header className="lfaa-topbar"><div className="lfaa-brand"><PluginIcon/><span>{t('name')}</span><span className="lfaa-separator">/</span><span>{t('eyebrow')}</span></div><nav className="lfaa-workspace-tabs" aria-label={t('workspaceSections')}>
      <button type="button" aria-current={page === 'writing' ? 'page' : undefined} onClick={() => setPage('writing')}>{t('writingNav')}</button>
      <button type="button" aria-current={page === 'minecraft' ? 'page' : undefined} onClick={() => setPage('minecraft')}>{t('minecraftTitle')}</button>
      <button type="button" aria-current={page === 'appearance' ? 'page' : undefined} onClick={() => setPage('appearance')}>{t('appearance')}</button>
    </nav><button className="lfaa-quiet-button" onClick={props.returnToChat}>{t('returnChat')}<span aria-hidden="true">↗</span></button></header>
    <div className="lfaa-page lfaa-workspace-page">
      {page === 'writing' && (writingAccount.status === 'ready'
        ? <WritingWorkspace key={writingAccount.accountId} {...props} sessionList={sessionList} accountId={writingAccount.accountId}/>
        : <div className="lfaa-writing-account-state" role="status"><h1>{t('writingTitle')}</h1><p>{t(writingAccount.status === 'loading' ? 'writingAccountLoading' : writingAccount.status === 'signed-out' ? 'writingAccountRequired' : 'writingAccountError')}</p></div>)}
      {page === 'minecraft' && <MinecraftManager {...props} sessionList={sessionList}/>}
      {page === 'appearance' && <div className="lfaa-appearance-page"><div className="lfaa-intro"><span className="lfaa-kicker">{t('eyebrow')}</span><h1>{props.sessionId ? t('linkedSession') : t('title')}</h1><p>{props.sessionId ? t('linkedHint') : t('description')}</p><div className="lfaa-actions"><button className="lfaa-primary-button" onClick={() => setDialog(true)}>{t('preview')}<span aria-hidden="true">↗</span></button>{props.sessionId && <button className="lfaa-secondary-button" onClick={props.openInspector}>{t('inspector')}</button>}</div></div>
        <div className="lfaa-work-grid"><div><AppearanceControls {...props}/></div><aside className="lfaa-preview-column"><Preview t={t}/><h3>{t('cardTitle')}</h3><p>{t('cardDescription')}</p></aside></div>
        {props.sessionId ? <details className="lfaa-session-meta"><summary>{t('sessionId')}</summary><code>{props.sessionId}</code></details> : <p className="lfaa-footnote">{t('noSession')}</p>}
      </div>}
    </div>
    <Modal open={dialog} onClose={() => setDialog(false)} title={t('dialogTitle')} closeLabel={t('close')} description={t('dialogDescription')} className="lfaa-dialog" footer={<button className="lfaa-primary-button" onClick={() => setDialog(false)}>{t('done')}</button>}><p>{t('dialogText')}</p></Modal>
  </section>;
}

function MinecraftManager(props) {
  const { t } = props;
  const sessionList = props.sessionList;
  const [sessionChoice, setSessionChoice] = useState('');
  const [dataRoot, setDataRoot] = useState('');
  const [distribution, setDistribution] = useState('paper');
  const [version, setVersion] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [modQuery, setModQuery] = useState('');
  const [modProjectId, setModProjectId] = useState('');
  const [modVersionId, setModVersionId] = useState('');
  const [backupId, setBackupId] = useState('');
  const [relativePath, setRelativePath] = useState('.');
  const [consoleCommand, setConsoleCommand] = useState('');
  const [propertyChanges, setPropertyChanges] = useState('{\n  "motd": "My Minecraft Server"\n}');
  const [instanceName, setInstanceName] = useState('Minecraft Server');
  const [memoryMb, setMemoryMb] = useState(4096);
  const [port, setPort] = useState(25565);
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedSessionId = props.sessionId ?? (sessionList.byId[sessionChoice] ? sessionChoice : sessionList.ids[0] ?? '');
  const available = Boolean(selectedSessionId && props.submitMinecraftPrompt && !pending);

  const send = async (action) => {
    setError(''); setMessage('');
    if (!selectedSessionId) { setError(t('minecraftNeedsSession')); return; }
    if (!dataRoot.trim()) { setError(t('minecraftDataRootRequired')); return; }
    if (action !== 'discover' && !version.trim() && action === 'install') { setError(t('minecraftVersionRequired')); return; }
    if (['status', 'start', 'stop', 'backup', 'backups', 'restore', 'config', 'updateConfig', 'files', 'readFile', 'console', 'sendConsole', 'modInstall'].includes(action) && !instanceId.trim()) { setError(t('minecraftInstanceRequired')); return; }
    if (['modSearch', 'modInstall'].includes(action) && distribution !== 'fabric') { setError(t('minecraftModsFabricOnly')); return; }
    if (action === 'modSearch' && (!version.trim() || modQuery.trim().length < 2)) { setError(t('minecraftModSearchRequired')); return; }
    if (action === 'modInstall' && !modProjectId.trim()) { setError(t('minecraftModProjectRequired')); return; }
    if (action === 'accept' && !eulaAccepted) { setError(t('minecraftEulaRequired')); return; }
    if (action === 'restore' && !backupId.trim()) { setError(t('minecraftBackupRequired')); return; }
    if (action === 'sendConsole' && !consoleCommand.trim()) { setError(t('minecraftCommandRequired')); return; }
    let properties;
    if (action === 'updateConfig') {
      try {
        properties = JSON.parse(propertyChanges);
        if (!properties || Array.isArray(properties) || typeof properties !== 'object' || Object.values(properties).some(value => typeof value !== 'string')) throw new Error();
      } catch { setError(t('minecraftPropertiesInvalid')); return; }
    }
    const input = { dataRoot: dataRoot.trim(), distribution, ...(version.trim() ? { version: version.trim() } : {}), ...(instanceId.trim() ? { id: instanceId.trim() } : {}) };
    const requests = {
      discover: `Call minecraft_server with action=list_versions and distribution=${distribution}. Show the available stable Minecraft versions for ${distribution} and ask me to choose. Do not create an instance, accept the EULA, or start a server. User data root: ${JSON.stringify(input.dataRoot)}.`,
      modSearch: `Search Modrinth for Fabric Minecraft server mods using minecraft_server action=mod_search with ${JSON.stringify({ distribution: 'fabric', version: version.trim(), query: modQuery.trim() })}. Show each result's title, projectId, serverSide compatibility, and downloads. Warn me if a result is client-only or its server support is unknown. Do not install anything.`,
      modInstall: `Install the selected Modrinth Fabric mod using minecraft_server action=mod_install with ${JSON.stringify({ ...input, distribution: 'fabric', projectId: modProjectId.trim(), ...(modVersionId.trim() ? { versionId: modVersionId.trim() } : {}) })}. Confirm this is the stopped Fabric instance and report the installed mod and required dependencies. Do not start the server.`,
      install: `Install a ${distribution} Minecraft server using minecraft_server. Parameters: ${JSON.stringify({ ...input, name: instanceName.trim(), memoryMb: Number(memoryMb), port: Number(port) })}. First confirm the requested version through list_versions for ${distribution}, inspect Java compatibility, and if needed install the compatible Temurin runtime under this same data root. Then create the instance with distribution=${distribution} and install its latest stable build. Never call accept_eula or start; report the instance id and wait for my EULA decision.`,
      status: `Use minecraft_server action=status for ${JSON.stringify(input)} and report the actual state.`,
      start: `Use minecraft_server action=start for ${JSON.stringify(input)}. Do not accept the EULA on my behalf; if the server reports the EULA has not been accepted, stop and tell me how to review it.`,
      stop: `Use minecraft_server action=stop for ${JSON.stringify(input)} and report whether the server stopped cleanly.`,
      backup: `Use minecraft_server action=backup_create for ${JSON.stringify(input)} and report the returned backup id and checksum.`,
      accept: `I have reviewed and explicitly accept the Minecraft EULA at https://www.minecraft.net/eula. Use minecraft_server action=accept_eula with accepted=true for ${JSON.stringify(input)}. Do not start the server until I request that separately.`,
      config: `Use minecraft_server action=config_read for ${JSON.stringify(input)} and show the current server.properties values. Do not change anything until I specify the exact changes.`,
      updateConfig: `Use minecraft_server action=config_update with properties ${JSON.stringify(properties)} for ${JSON.stringify(input)}. Report the exact accepted changes.`,
      backups: `Use minecraft_server action=backup_list for ${JSON.stringify(input)} and show available backup ids, sizes, and checksums.`,
      restore: `Restore backup ${JSON.stringify(backupId.trim())} for ${JSON.stringify(input)} using minecraft_server action=backup_restore. Confirm the server is stopped and report the checksum validation result.`,
      files: `Use minecraft_server action=list_files for ${JSON.stringify({ ...input, path: relativePath.trim() || '.' })} and list the instance files at that relative path.`,
      readFile: `Use minecraft_server action=read_file for ${JSON.stringify({ ...input, path: relativePath.trim() })} and summarize the file. Do not edit it.`,
      console: `Use minecraft_server action=console_read for ${JSON.stringify(input)} and report the recent console output.`,
      sendConsole: `Send the single command ${JSON.stringify(consoleCommand.trim())} to the server using minecraft_server action=console_send for ${JSON.stringify(input)}. Do not execute shell commands or use another tool.`,
    };
    setPending(true);
    try {
      await props.submitMinecraftPrompt(selectedSessionId, requests[action]);
      setMessage(t('minecraftRequestQueued'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('minecraftRequestFailed'));
    } finally { setPending(false); }
  };

  return <section className="lfaa-minecraft" aria-labelledby="lfaa-minecraft-title">
    <div className="lfaa-section-heading"><div><span className="lfaa-kicker">{t('minecraftEyebrow')}</span><h2 id="lfaa-minecraft-title">{t('minecraftTitle')}</h2><p>{t('minecraftDescription')}</p></div><span className="lfaa-sync">{t('minecraftSupportedDistributions')}</span></div>
    <div className="lfaa-minecraft-grid">
      {!props.sessionId && <label>{t('minecraftSession')}<select value={selectedSessionId} onChange={event => setSessionChoice(event.target.value)}><option value="">{t('minecraftSessionPlaceholder')}</option>{sessionList.ids.map(id => <option key={id} value={id}>{sessionList.byId[id]?.displayTitle ?? id}</option>)}</select></label>}
      <label>{t('minecraftDataRoot')}<input value={dataRoot} onChange={event => setDataRoot(event.target.value)} placeholder={t('minecraftDataRootPlaceholder')} autoComplete="off" spellCheck="false"/></label>
      <label>{t('minecraftDistribution')}<select value={distribution} onChange={event => setDistribution(event.target.value)}><option value="paper">Paper</option><option value="fabric">Fabric</option></select></label>
      <label>{t('minecraftVersion')}<input value={version} onChange={event => setVersion(event.target.value)} placeholder={t('minecraftVersionPlaceholder')} autoComplete="off"/></label>
      <label>{t('minecraftInstanceId')}<input value={instanceId} onChange={event => setInstanceId(event.target.value)} placeholder={t('minecraftInstancePlaceholder')} autoComplete="off" spellCheck="false"/></label>
      <details className="lfaa-minecraft-options"><summary>{t('minecraftInstallOptions')}</summary><div>
        <label>{t('minecraftName')}<input value={instanceName} onChange={event => setInstanceName(event.target.value)} maxLength={64}/></label>
        <label>{t('minecraftMemory')}<input type="number" min="512" max="131072" step="512" value={memoryMb} onChange={event => setMemoryMb(event.target.value)}/></label>
        <label>{t('minecraftPort')}<input type="number" min="1" max="65535" value={port} onChange={event => setPort(event.target.value)}/></label>
      </div></details>
    </div>
    <div className="lfaa-minecraft-actions">
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('discover')}>{t(distribution === 'paper' ? 'minecraftDiscoverPaper' : 'minecraftDiscoverFabric')}</button>
      <button className="lfaa-primary-button" disabled={!available} onClick={() => send('install')}>{t('minecraftInstall')}</button>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('status')}>{t('minecraftStatus')}</button>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('start')}>{t('minecraftStart')}</button>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('stop')}>{t('minecraftStop')}</button>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('backup')}>{t('minecraftBackup')}</button>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('config')}>{t('minecraftConfig')}</button>
    </div>
    <label className="lfaa-minecraft-eula"><input type="checkbox" checked={eulaAccepted} onChange={event => setEulaAccepted(event.target.checked)}/><span>{t('minecraftEulaConfirm')} <a href="https://www.minecraft.net/eula" target="_blank" rel="noreferrer">{t('minecraftEulaLink')}</a></span></label>
    <button className="lfaa-secondary-button" disabled={!available || !eulaAccepted} onClick={() => send('accept')}>{t('minecraftAcceptEula')}</button>
    <details className="lfaa-minecraft-options lfaa-minecraft-more"><summary>{t('minecraftMoreOperations')}</summary><div className="lfaa-minecraft-more-grid">
      {distribution === 'fabric' && <>
        <label className="lfaa-minecraft-wide">{t('minecraftModSearch')}<input value={modQuery} onChange={event => setModQuery(event.target.value)} minLength={2} autoComplete="off"/></label>
        <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('modSearch')}>{t('minecraftSearchMods')}</button>
        <label>{t('minecraftModProjectId')}<input value={modProjectId} onChange={event => setModProjectId(event.target.value)} autoComplete="off" spellCheck="false"/></label>
        <label>{t('minecraftModVersionId')}<input value={modVersionId} onChange={event => setModVersionId(event.target.value)} autoComplete="off" spellCheck="false"/></label>
        <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('modInstall')}>{t('minecraftInstallMod')}</button>
      </>}
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('backups')}>{t('minecraftListBackups')}</button>
      <label>{t('minecraftBackupId')}<input value={backupId} onChange={event => setBackupId(event.target.value)} autoComplete="off" spellCheck="false"/></label>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('restore')}>{t('minecraftRestore')}</button>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('files')}>{t('minecraftListFiles')}</button>
      <label>{t('minecraftRelativePath')}<input value={relativePath} onChange={event => setRelativePath(event.target.value)} autoComplete="off" spellCheck="false"/></label>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('readFile')}>{t('minecraftReadFile')}</button>
      <label className="lfaa-minecraft-wide">{t('minecraftConfigChanges')}<textarea value={propertyChanges} onChange={event => setPropertyChanges(event.target.value)} rows={4} spellCheck="false"/></label>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('updateConfig')}>{t('minecraftUpdateConfig')}</button>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('console')}>{t('minecraftReadConsole')}</button>
      <label className="lfaa-minecraft-wide">{t('minecraftConsoleCommand')}<input value={consoleCommand} onChange={event => setConsoleCommand(event.target.value)} autoComplete="off"/></label>
      <button className="lfaa-secondary-button" disabled={!available} onClick={() => send('sendConsole')}>{t('minecraftSendConsole')}</button>
    </div></details>
    {!selectedSessionId && <p className="lfaa-footnote">{t('minecraftNeedsSession')}</p>}
    {message && <p className="lfaa-success" role="status">{message}</p>}
    {error && <p className="lfaa-error" role="alert">{error}</p>}
    {pending && <p className="lfaa-footnote" role="status">{t('minecraftSending')}</p>}
  </section>;
}

export function SettingsSection(props) {
  return <SurfaceErrorBoundary t={props.t}><section className="lfaa-settings-section"><AppearanceControls {...props}/></section></SurfaceErrorBoundary>;
}

export function Inspector(props) {
  const { t } = props;
  const config = props.usePluginConfig(snapshot => snapshot).value;
  return <section className="lfaa-inspector"><div className="lfaa-mark"><PluginIcon size={22}/></div><h2>{t('auxiliary')}</h2><p>{t('auxiliaryDescription')}</p>{config && <dl>{[['currentPreset', config.preset], ['currentDensity', config.density], ['currentMotion', config.motion]].map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{t(value)}</dd></div>)}</dl>}<button className="lfaa-secondary-button" onClick={props.openWorkspace}>{t('configure')}</button><details className="lfaa-session-meta"><summary>{t('sessionId')}</summary><code>{props.sessionId}</code></details></section>;
}

export function InspectorTitle({ t }) { return <span>{t('name')}</span>; }
