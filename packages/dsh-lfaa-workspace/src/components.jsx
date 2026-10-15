import { useState } from 'react';
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives';

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
  const snapshot = props.usePluginConfig();
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

export function Workspace(props) {
  const { t } = props;
  const config = props.usePluginConfig().value;
  const [dialog, setDialog] = useState(false);
  return <section className="lfaa-panel" data-density={config?.density ?? 'comfortable'}>
    <header className="lfaa-topbar"><div className="lfaa-brand"><PluginIcon/><span>{t('name')}</span><span className="lfaa-separator">/</span><span>{t('eyebrow')}</span></div><button className="lfaa-quiet-button" onClick={props.returnToChat}>{t('returnChat')}<span aria-hidden="true">↗</span></button></header>
    <div className="lfaa-page"><div className="lfaa-intro"><span className="lfaa-kicker">{t('eyebrow')}</span><h1>{props.sessionId ? t('linkedSession') : t('title')}</h1><p>{props.sessionId ? t('linkedHint') : t('description')}</p><div className="lfaa-actions"><button className="lfaa-primary-button" onClick={() => setDialog(true)}>{t('preview')}<span aria-hidden="true">↗</span></button>{props.sessionId && <button className="lfaa-secondary-button" onClick={props.openInspector}>{t('inspector')}</button>}</div></div>
      <div className="lfaa-work-grid"><div><AppearanceControls {...props}/></div><aside className="lfaa-preview-column"><Preview t={t}/><h3>{t('cardTitle')}</h3><p>{t('cardDescription')}</p></aside></div>
      {props.sessionId ? <details className="lfaa-session-meta"><summary>{t('sessionId')}</summary><code>{props.sessionId}</code></details> : <p className="lfaa-footnote">{t('noSession')}</p>}
    </div>
    <Modal open={dialog} onClose={() => setDialog(false)} title={t('dialogTitle')} closeLabel={t('close')} description={t('dialogDescription')} className="lfaa-dialog" footer={<button className="lfaa-primary-button" onClick={() => setDialog(false)}>{t('done')}</button>}><p>{t('dialogText')}</p></Modal>
  </section>;
}

export function SettingsSection(props) {
  return <section className="lfaa-settings-section"><AppearanceControls {...props}/></section>;
}

export function Inspector(props) {
  const { t } = props;
  const config = props.usePluginConfig().value;
  return <section className="lfaa-inspector"><div className="lfaa-mark"><PluginIcon size={22}/></div><h2>{t('auxiliary')}</h2><p>{t('auxiliaryDescription')}</p>{config && <dl>{[['currentPreset', config.preset], ['currentDensity', config.density], ['currentMotion', config.motion]].map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{t(value)}</dd></div>)}</dl>}<button className="lfaa-secondary-button" onClick={props.openWorkspace}>{t('configure')}</button><details className="lfaa-session-meta"><summary>{t('sessionId')}</summary><code>{props.sessionId}</code></details></section>;
}

export function InspectorTitle({ t }) { return <span>{t('name')}</span>; }
