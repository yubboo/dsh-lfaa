window.__ModuleLoader__.load({id:"dsh-lfaa",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/dsh-lfaa-workspace/src/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// packages/dsh-lfaa-workspace/src/components.jsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
function PluginIcon({ size = 18 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3.5", y: "3.5", width: "17", height: "17", rx: "5", stroke: "currentColor", strokeWidth: "1.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 4v16M9 10h11", stroke: "currentColor", strokeWidth: "1.5" })
  ] });
}
function Preview({ t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-preview", "aria-label": t("previewLabel"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-preview-chrome", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-preview-layout", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-preview-rail", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-preview-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lfaa-kicker", children: t("cardTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-sample-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lfaa-mark", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginIcon, {}) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("sampleDetail") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("sampleNote") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-sample-lines", "aria-hidden": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
          ] })
        ] })
      ] })
    ] })
  ] });
}
function AppearanceControls(props) {
  const { t } = props;
  const snapshot = props.usePluginConfig();
  const [pending, setPending] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  if (snapshot.status !== "ready" || !snapshot.value) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lfaa-empty", role: "status", children: t(snapshot.status === "loading" ? "loading" : "unavailable") });
  const config = snapshot.value;
  const disabled = pending || !snapshot.writable;
  const change = async (field, value) => {
    setPending(true);
    setError("");
    try {
      if (!await props.setConfig(field, value)) setError(t("rejected"));
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-controls", "data-density": config.density, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-section-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("appearance") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("settingsDescription") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lfaa-sync", children: t(snapshot.writable ? "saved" : "readonly") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { className: "lfaa-presets", disabled, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", { children: t("preset") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lfaa-preset-grid", children: ["native", "soft", "crisp"].map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "lfaa-preset", "aria-pressed": config.preset === preset, onClick: () => change("preset", preset), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `lfaa-style-swatch lfaa-swatch-${preset}`, "aria-hidden": "true", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t(preset) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t(`${preset}Hint`) })
      ] }, preset)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-settings-rows", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lfaa-setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("density") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: config.density, disabled, onChange: (event) => change("density", event.target.value), children: ["comfortable", "compact"].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value, children: t(value) }, value)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lfaa-setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("motion") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: config.motion, disabled, onChange: (event) => change("motion", event.target.value), children: ["system", "reduced"].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value, children: t(value) }, value)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lfaa-setting-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("enabled") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t("enabledHint") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: config.enabled, disabled, onChange: (event) => change("enabled", event.target.checked) })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lfaa-error", role: "alert", children: error })
  ] });
}
function Workspace(props) {
  const { t } = props;
  const config = props.usePluginConfig().value;
  const [dialog, setDialog] = (0, import_react.useState)(false);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "lfaa-panel", "data-density": config?.density ?? "comfortable", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "lfaa-topbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-brand", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginIcon, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("name") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lfaa-separator", children: "/" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("eyebrow") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "lfaa-quiet-button", onClick: props.returnToChat, children: [
        t("returnChat"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "\u2197" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-intro", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lfaa-kicker", children: t("eyebrow") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: props.sessionId ? t("linkedSession") : t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: props.sessionId ? t("linkedHint") : t("description") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "lfaa-primary-button", onClick: () => setDialog(true), children: [
            t("preview"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "\u2197" })
          ] }),
          props.sessionId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", onClick: props.openInspector, children: t("inspector") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MinecraftManager, { ...props }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-work-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppearanceControls, { ...props }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "lfaa-preview-column", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Preview, { t }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("cardTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("cardDescription") })
        ] })
      ] }),
      props.sessionId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "lfaa-session-meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: t("sessionId") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: props.sessionId })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lfaa-footnote", children: t("noSession") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Modal, { open: dialog, onClose: () => setDialog(false), title: t("dialogTitle"), closeLabel: t("close"), description: t("dialogDescription"), className: "lfaa-dialog", footer: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-primary-button", onClick: () => setDialog(false), children: t("done") }), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("dialogText") }) })
  ] });
}
function MinecraftManager(props) {
  const { t } = props;
  const sessionList = props.useSessions();
  const [sessionChoice, setSessionChoice] = (0, import_react.useState)("");
  const [dataRoot, setDataRoot] = (0, import_react.useState)("");
  const [distribution, setDistribution] = (0, import_react.useState)("paper");
  const [version, setVersion] = (0, import_react.useState)("");
  const [instanceId, setInstanceId] = (0, import_react.useState)("");
  const [modQuery, setModQuery] = (0, import_react.useState)("");
  const [modProjectId, setModProjectId] = (0, import_react.useState)("");
  const [modVersionId, setModVersionId] = (0, import_react.useState)("");
  const [backupId, setBackupId] = (0, import_react.useState)("");
  const [relativePath, setRelativePath] = (0, import_react.useState)(".");
  const [consoleCommand, setConsoleCommand] = (0, import_react.useState)("");
  const [propertyChanges, setPropertyChanges] = (0, import_react.useState)('{\n  "motd": "My Minecraft Server"\n}');
  const [instanceName, setInstanceName] = (0, import_react.useState)("Minecraft Server");
  const [memoryMb, setMemoryMb] = (0, import_react.useState)(4096);
  const [port, setPort] = (0, import_react.useState)(25565);
  const [eulaAccepted, setEulaAccepted] = (0, import_react.useState)(false);
  const [pending, setPending] = (0, import_react.useState)(false);
  const [message, setMessage] = (0, import_react.useState)("");
  const [error, setError] = (0, import_react.useState)("");
  const selectedSessionId = props.sessionId ?? (sessionList.byId[sessionChoice] ? sessionChoice : sessionList.ids[0] ?? "");
  const available = Boolean(selectedSessionId && props.submitMinecraftPrompt && !pending);
  const send = async (action) => {
    setError("");
    setMessage("");
    if (!selectedSessionId) {
      setError(t("minecraftNeedsSession"));
      return;
    }
    if (!dataRoot.trim()) {
      setError(t("minecraftDataRootRequired"));
      return;
    }
    if (action !== "discover" && !version.trim() && action === "install") {
      setError(t("minecraftVersionRequired"));
      return;
    }
    if (["status", "start", "stop", "backup", "backups", "restore", "config", "updateConfig", "files", "readFile", "console", "sendConsole", "modInstall"].includes(action) && !instanceId.trim()) {
      setError(t("minecraftInstanceRequired"));
      return;
    }
    if (["modSearch", "modInstall"].includes(action) && distribution !== "fabric") {
      setError(t("minecraftModsFabricOnly"));
      return;
    }
    if (action === "modSearch" && (!version.trim() || modQuery.trim().length < 2)) {
      setError(t("minecraftModSearchRequired"));
      return;
    }
    if (action === "modInstall" && !modProjectId.trim()) {
      setError(t("minecraftModProjectRequired"));
      return;
    }
    if (action === "accept" && !eulaAccepted) {
      setError(t("minecraftEulaRequired"));
      return;
    }
    if (action === "restore" && !backupId.trim()) {
      setError(t("minecraftBackupRequired"));
      return;
    }
    if (action === "sendConsole" && !consoleCommand.trim()) {
      setError(t("minecraftCommandRequired"));
      return;
    }
    let properties;
    if (action === "updateConfig") {
      try {
        properties = JSON.parse(propertyChanges);
        if (!properties || Array.isArray(properties) || typeof properties !== "object" || Object.values(properties).some((value) => typeof value !== "string")) throw new Error();
      } catch {
        setError(t("minecraftPropertiesInvalid"));
        return;
      }
    }
    const input = { dataRoot: dataRoot.trim(), distribution, ...version.trim() ? { version: version.trim() } : {}, ...instanceId.trim() ? { id: instanceId.trim() } : {} };
    const requests = {
      discover: `Call minecraft_server with action=list_versions and distribution=${distribution}. Show the available stable Minecraft versions for ${distribution} and ask me to choose. Do not create an instance, accept the EULA, or start a server. User data root: ${JSON.stringify(input.dataRoot)}.`,
      modSearch: `Search Modrinth for Fabric Minecraft server mods using minecraft_server action=mod_search with ${JSON.stringify({ distribution: "fabric", version: version.trim(), query: modQuery.trim() })}. Show each result's title, projectId, serverSide compatibility, and downloads. Warn me if a result is client-only or its server support is unknown. Do not install anything.`,
      modInstall: `Install the selected Modrinth Fabric mod using minecraft_server action=mod_install with ${JSON.stringify({ ...input, distribution: "fabric", projectId: modProjectId.trim(), ...modVersionId.trim() ? { versionId: modVersionId.trim() } : {} })}. Confirm this is the stopped Fabric instance and report the installed mod and required dependencies. Do not start the server.`,
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
      files: `Use minecraft_server action=list_files for ${JSON.stringify({ ...input, path: relativePath.trim() || "." })} and list the instance files at that relative path.`,
      readFile: `Use minecraft_server action=read_file for ${JSON.stringify({ ...input, path: relativePath.trim() })} and summarize the file. Do not edit it.`,
      console: `Use minecraft_server action=console_read for ${JSON.stringify(input)} and report the recent console output.`,
      sendConsole: `Send the single command ${JSON.stringify(consoleCommand.trim())} to the server using minecraft_server action=console_send for ${JSON.stringify(input)}. Do not execute shell commands or use another tool.`
    };
    setPending(true);
    try {
      await props.submitMinecraftPrompt(selectedSessionId, requests[action]);
      setMessage(t("minecraftRequestQueued"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("minecraftRequestFailed"));
    } finally {
      setPending(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "lfaa-minecraft", "aria-labelledby": "lfaa-minecraft-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-section-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lfaa-kicker", children: t("minecraftEyebrow") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { id: "lfaa-minecraft-title", children: t("minecraftTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("minecraftDescription") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lfaa-sync", children: t("minecraftSupportedDistributions") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-minecraft-grid", children: [
      !props.sessionId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("minecraftSession"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: selectedSessionId, onChange: (event) => setSessionChoice(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: t("minecraftSessionPlaceholder") }),
          sessionList.ids.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: id, children: sessionList.byId[id]?.displayTitle ?? id }, id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("minecraftDataRoot"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: dataRoot, onChange: (event) => setDataRoot(event.target.value), placeholder: t("minecraftDataRootPlaceholder"), autoComplete: "off", spellCheck: "false" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("minecraftDistribution"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: distribution, onChange: (event) => setDistribution(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "paper", children: "Paper" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "fabric", children: "Fabric" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("minecraftVersion"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: version, onChange: (event) => setVersion(event.target.value), placeholder: t("minecraftVersionPlaceholder"), autoComplete: "off" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("minecraftInstanceId"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: instanceId, onChange: (event) => setInstanceId(event.target.value), placeholder: t("minecraftInstancePlaceholder"), autoComplete: "off", spellCheck: "false" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "lfaa-minecraft-options", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: t("minecraftInstallOptions") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            t("minecraftName"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: instanceName, onChange: (event) => setInstanceName(event.target.value), maxLength: 64 })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            t("minecraftMemory"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", min: "512", max: "131072", step: "512", value: memoryMb, onChange: (event) => setMemoryMb(event.target.value) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            t("minecraftPort"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", min: "1", max: "65535", value: port, onChange: (event) => setPort(event.target.value) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-minecraft-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("discover"), children: t(distribution === "paper" ? "minecraftDiscoverPaper" : "minecraftDiscoverFabric") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-primary-button", disabled: !available, onClick: () => send("install"), children: t("minecraftInstall") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("status"), children: t("minecraftStatus") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("start"), children: t("minecraftStart") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("stop"), children: t("minecraftStop") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("backup"), children: t("minecraftBackup") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("config"), children: t("minecraftConfig") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lfaa-minecraft-eula", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: eulaAccepted, onChange: (event) => setEulaAccepted(event.target.checked) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        t("minecraftEulaConfirm"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: "https://www.minecraft.net/eula", target: "_blank", rel: "noreferrer", children: t("minecraftEulaLink") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available || !eulaAccepted, onClick: () => send("accept"), children: t("minecraftAcceptEula") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "lfaa-minecraft-options lfaa-minecraft-more", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: t("minecraftMoreOperations") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lfaa-minecraft-more-grid", children: [
        distribution === "fabric" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lfaa-minecraft-wide", children: [
            t("minecraftModSearch"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: modQuery, onChange: (event) => setModQuery(event.target.value), minLength: 2, autoComplete: "off" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("modSearch"), children: t("minecraftSearchMods") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            t("minecraftModProjectId"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: modProjectId, onChange: (event) => setModProjectId(event.target.value), autoComplete: "off", spellCheck: "false" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            t("minecraftModVersionId"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: modVersionId, onChange: (event) => setModVersionId(event.target.value), autoComplete: "off", spellCheck: "false" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("modInstall"), children: t("minecraftInstallMod") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("backups"), children: t("minecraftListBackups") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          t("minecraftBackupId"),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: backupId, onChange: (event) => setBackupId(event.target.value), autoComplete: "off", spellCheck: "false" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("restore"), children: t("minecraftRestore") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("files"), children: t("minecraftListFiles") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          t("minecraftRelativePath"),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: relativePath, onChange: (event) => setRelativePath(event.target.value), autoComplete: "off", spellCheck: "false" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("readFile"), children: t("minecraftReadFile") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lfaa-minecraft-wide", children: [
          t("minecraftConfigChanges"),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: propertyChanges, onChange: (event) => setPropertyChanges(event.target.value), rows: 4, spellCheck: "false" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("updateConfig"), children: t("minecraftUpdateConfig") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("console"), children: t("minecraftReadConsole") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lfaa-minecraft-wide", children: [
          t("minecraftConsoleCommand"),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: consoleCommand, onChange: (event) => setConsoleCommand(event.target.value), autoComplete: "off" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", disabled: !available, onClick: () => send("sendConsole"), children: t("minecraftSendConsole") })
      ] })
    ] }),
    !selectedSessionId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lfaa-footnote", children: t("minecraftNeedsSession") }),
    message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lfaa-success", role: "status", children: message }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lfaa-error", role: "alert", children: error }),
    pending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lfaa-footnote", role: "status", children: t("minecraftSending") })
  ] });
}
function SettingsSection(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "lfaa-settings-section", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppearanceControls, { ...props }) });
}
function Inspector(props) {
  const { t } = props;
  const config = props.usePluginConfig().value;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "lfaa-inspector", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lfaa-mark", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginIcon, { size: 22 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("auxiliary") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("auxiliaryDescription") }),
    config && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", { children: [["currentPreset", config.preset], ["currentDensity", config.density], ["currentMotion", config.motion]].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: t(label) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: t(value) })
    ] }, label)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lfaa-secondary-button", onClick: props.openWorkspace, children: t("configure") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "lfaa-session-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: t("sessionId") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: props.sessionId })
    ] })
  ] });
}
function InspectorTitle({ t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("name") });
}

// packages/dsh-lfaa-appearance/src/index.mjs
function presentationTokens(config, systemReduced = false) {
  if (!config.enabled) return {};
  const pair = (value) => ({ light: value, dark: value });
  const tokens = {};
  if (config.preset === "soft") {
    tokens["--dsw-radius-sm"] = pair("10px");
    tokens["--dsw-radius-md"] = pair("16px");
    tokens["--dsw-radius-panel"] = pair("24px");
    tokens["--dsw-alias-bg-overlay"] = { light: "rgb(255 255 255 / 94%)", dark: "rgb(29 30 34 / 96%)" };
    tokens["--dsw-elevation-prominent"] = { light: "0 16px 48px rgb(15 23 42 / 12%)", dark: "0 16px 48px rgb(0 0 0 / 36%)" };
  } else if (config.preset === "crisp") {
    tokens["--dsw-radius-sm"] = pair("6px");
    tokens["--dsw-radius-md"] = pair("10px");
    tokens["--dsw-radius-panel"] = pair("16px");
    tokens["--dsw-elevation-prominent"] = { light: "0 8px 28px rgb(15 23 42 / 14%)", dark: "0 8px 28px rgb(0 0 0 / 36%)" };
  }
  const reduced = systemReduced || config.motion === "reduced";
  if (reduced || config.preset !== "native") {
    tokens["--ds-transition-duration"] = pair(reduced ? "80ms" : "180ms");
    tokens["--ds-transition-duration-fast"] = pair(reduced ? "80ms" : "125ms");
    tokens["--ds-transition-duration-slow"] = pair(reduced ? "80ms" : "240ms");
    tokens["--ds-ease-in-out"] = pair("cubic-bezier(0.23, 1, 0.32, 1)");
  }
  return tokens;
}
function installPresentation(ctx, form, media) {
  ctx.effect(() => {
    let remove;
    let signature;
    let disposed = false;
    const clear = () => {
      remove?.();
      remove = void 0;
      signature = void 0;
    };
    const sync = () => {
      if (disposed) return;
      const snapshot = form.getSnapshot();
      if (snapshot.status !== "ready" || !snapshot.value) {
        clear();
        return;
      }
      const tokens = presentationTokens(snapshot.value, media?.matches === true);
      const next = JSON.stringify(tokens);
      if (next === signature) return;
      const previous = remove;
      remove = Object.keys(tokens).length ? ctx.theme.overrideTokens("dsh-lfaa", tokens) : void 0;
      previous?.();
      signature = next;
    };
    const unsubscribe = form.subscribe(sync);
    media?.addEventListener("change", sync);
    try {
      sync();
    } catch (error) {
      unsubscribe();
      media?.removeEventListener("change", sync);
      clear();
      throw error;
    }
    return () => {
      disposed = true;
      unsubscribe();
      media?.removeEventListener("change", sync);
      clear();
    };
  });
}

// packages/dsh-lfaa-workspace/src/locales.mjs
var zh = {
  name: "dsh-lfaa",
  panel: "dsh-lfaa \u5DE5\u4F5C\u533A",
  view: "dsh-lfaa",
  settings: "dsh-lfaa",
  eyebrow: "\u5DE5\u4F5C\u533A",
  title: "\u8BA9\u5DE5\u4F5C\uFF0C\u5728\u540C\u4E00\u5904\u5C55\u5F00\u3002",
  description: "\u5728 DSH \u7684\u4F1A\u8BDD\u3001\u8F68\u8FF9\u4E0E\u8F85\u52A9\u9762\u677F\u4E4B\u95F4\uFF0C\u5B89\u6392\u81EA\u5DF1\u7684\u5DE5\u4F5C\u65B9\u5F0F\u3002",
  appearance: "\u754C\u9762\u4F53\u9A8C",
  appearanceDescription: "\u4E3B\u9898\u3001\u5361\u7247\u3001\u5F39\u7A97\u4E0E\u52A8\u6548\uFF0C\u662F\u8FD9\u4E2A\u5DE5\u4F5C\u533A\u7684\u4E00\u90E8\u5206\u3002",
  preview: "\u9884\u89C8\u5F39\u7A97",
  returnChat: "\u8FD4\u56DE\u4F1A\u8BDD",
  inspector: "\u6253\u5F00\u8F85\u52A9\u9762\u677F",
  configure: "\u7BA1\u7406\u754C\u9762\u4F53\u9A8C",
  settingsDescription: "\u5DE5\u4F5C\u533A\u4E0E\u8BBE\u7F6E\u4E2D\u5FC3\u5171\u4EAB\u8FD9\u4E9B\u504F\u597D\uFF0C\u4FEE\u6539\u540E\u5373\u65F6\u5E94\u7528\u3002",
  preset: "\u89C6\u89C9\u65B9\u6848",
  native: "\u8DDF\u968F DSH",
  soft: "\u67D4\u548C",
  crisp: "\u6E05\u6670",
  nativeHint: "\u4FDD\u7559\u5BBF\u4E3B\u539F\u6709\u7684\u989C\u8272\u3001\u5706\u89D2\u548C\u9634\u5F71\u3002",
  softHint: "\u67D4\u548C\u7684\u8FB9\u89D2\u4E0E\u8F7B\u76C8\u7684\u6D6E\u5C42\uFF0C\u9605\u8BFB\u66F4\u5B89\u9759\u3002",
  crispHint: "\u66F4\u514B\u5236\u7684\u5706\u89D2\u4E0E\u6E05\u695A\u7684\u5C42\u6B21\uFF0C\u4FE1\u606F\u66F4\u5229\u843D\u3002",
  density: "\u5DE5\u4F5C\u533A\u5BC6\u5EA6",
  comfortable: "\u8212\u9002",
  compact: "\u7D27\u51D1",
  motion: "\u52A8\u6001\u6548\u679C",
  system: "\u8DDF\u968F\u7CFB\u7EDF",
  reduced: "\u51CF\u5C11\u52A8\u6001\u6548\u679C",
  enabled: "\u542F\u7528\u4F53\u9A8C\u914D\u7F6E",
  enabledHint: "\u5173\u95ED\u540E\u6062\u590D DSH \u539F\u5916\u89C2\u3002",
  cardTitle: "\u5361\u7247\u9884\u89C8",
  cardDescription: "\u5C42\u6B21\u3001\u7559\u767D\u4E0E\u8FB9\u754C\u4FDD\u6301\u4E00\u81F4\uFF0C\u8BA9\u4FE1\u606F\u5BB9\u6613\u88AB\u627E\u5230\u3002",
  previewLabel: "\u5916\u89C2\u9884\u89C8",
  sampleDetail: "\u4E0E\u5F53\u524D\u4E3B\u9898\u540C\u6B65",
  sampleNote: "\u6B64\u5904\u7528\u4E8E\u67E5\u770B\u5361\u7247\u6548\u679C\u3002",
  linkedSession: "\u5F53\u524D\u4F1A\u8BDD\u5DE5\u4F5C\u533A",
  linkedHint: "\u7EE7\u7EED\u4F7F\u7528\u4E0A\u65B9\u7684\u4F1A\u8BDD\u548C\u8F68\u8FF9\uFF0C\u6216\u6253\u5F00\u53F3\u4FA7\u9762\u677F\u67E5\u770B\u5F53\u524D\u504F\u597D\u3002",
  noSession: "\u9009\u62E9\u4E00\u4E2A DSH \u4F1A\u8BDD\u540E\uFF0C\u53EF\u4EE5\u5728\u4F1A\u8BDD Tab \u4E2D\u6253\u5F00\u6B64\u5DE5\u4F5C\u533A\u3002",
  auxiliary: "\u8F85\u52A9\u9762\u677F",
  auxiliaryDescription: "\u4F1A\u8BDD\u7559\u5728\u4E2D\u95F4\uFF0C\u8BE6\u60C5\u548C\u504F\u597D\u653E\u5728\u4FA7\u8FB9\u3002",
  saved: "\u504F\u597D\u5DF2\u540C\u6B65",
  loading: "\u6B63\u5728\u8BFB\u53D6\u504F\u597D\u2026",
  unavailable: "\u6B64\u8FDE\u63A5\u672A\u63D0\u4F9B\u63D2\u4EF6\u8BBE\u7F6E\u3002",
  readonly: "\u5F53\u524D\u8FDE\u63A5\u53EA\u5141\u8BB8\u67E5\u770B\u8BBE\u7F6E\u3002",
  rejected: "\u672A\u4FDD\u5B58\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u8BBE\u7F6E\u540E\u91CD\u8BD5\u3002",
  error: "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u540E\u91CD\u8BD5\u3002",
  dialogTitle: "\u4E13\u6CE8\u4E8E\u6B64\u523B\u7684\u5DE5\u4F5C",
  dialogDescription: "\u8FD9\u662F\u5F39\u7A97\u9884\u89C8\uFF0C\u4E0D\u4F1A\u6267\u884C\u4EFB\u4F55\u4E1A\u52A1\u64CD\u4F5C\u3002",
  dialogText: "\u4FDD\u7559 DSH \u7684\u7126\u70B9\u3001\u952E\u76D8\u548C\u5173\u95ED\u884C\u4E3A\uFF0C\u53EA\u8C03\u6574\u4F53\u9A8C\u3002\u6309 Esc \u6216\u70B9\u51FB\u906E\u7F69\u5373\u53EF\u8FD4\u56DE\u3002",
  done: "\u5B8C\u6210",
  close: "\u5173\u95ED",
  session: "\u4F1A\u8BDD",
  sessionId: "\u5F53\u524D\u4F1A\u8BDD\u6807\u8BC6",
  currentPreset: "\u5F53\u524D\u89C6\u89C9\u65B9\u6848",
  currentDensity: "\u5DE5\u4F5C\u533A\u5BC6\u5EA6",
  currentMotion: "\u52A8\u6001\u6548\u679C",
  minecraftEyebrow: "\u670D\u52A1\u7AEF\u7BA1\u7406",
  minecraftTitle: "Minecraft \u670D\u52A1\u7AEF",
  minecraftDescription: "\u9009\u62E9\u4E00\u4E2A DSH \u4F1A\u8BDD\uFF0C\u8BA9\u8BE5\u4F1A\u8BDD\u4E2D\u7684 Agent \u67E5\u8BE2\u7248\u672C\u3001\u68C0\u67E5 Java \u5E76\u7BA1\u7406\u670D\u52A1\u5668\u3002\u7F3A\u5C11 Java \u65F6\u7531 Agent \u6309\u5B98\u65B9\u6765\u6E90\u5B89\u88C5\uFF1B\u5B9E\u9645\u64CD\u4F5C\u4ECD\u7ECF\u8FC7 DSH \u5BA1\u6279\u3002",
  minecraftSupportedDistributions: "Paper \xB7 Fabric",
  minecraftSession: "\u8BA9 Agent \u6267\u884C\u64CD\u4F5C\u7684\u4F1A\u8BDD",
  minecraftSessionPlaceholder: "\u9009\u62E9\u4E00\u4E2A DSH \u4F1A\u8BDD",
  minecraftDistribution: "\u670D\u52A1\u7AEF\u53D1\u884C\u7248",
  minecraftDataRoot: "\u670D\u52A1\u5668\u6570\u636E\u76EE\u5F55",
  minecraftDataRootPlaceholder: "\u8F93\u5165 DSH \u4E3B\u673A\u4E0A\u7684\u7EDD\u5BF9\u76EE\u5F55\u8DEF\u5F84",
  minecraftVersion: "Minecraft \u7248\u672C",
  minecraftVersionPlaceholder: "\u5148\u67E5\u8BE2\u53EF\u7528\u7248\u672C\uFF0C\u6216\u586B\u5165\u7248\u672C\u53F7",
  minecraftInstanceId: "\u5B9E\u4F8B ID\uFF08\u5DF2\u6709\u670D\u52A1\u5668\u64CD\u4F5C\u65F6\u586B\u5199\uFF09",
  minecraftInstancePlaceholder: "\u521B\u5EFA\u670D\u52A1\u5668\u540E\u4ECE\u4F1A\u8BDD\u56DE\u590D\u590D\u5236 ID",
  minecraftInstallOptions: "\u65B0\u5EFA\u670D\u52A1\u5668\u9009\u9879",
  minecraftName: "\u5B9E\u4F8B\u540D\u79F0",
  minecraftMemory: "\u6700\u5927\u5185\u5B58\uFF08MiB\uFF09",
  minecraftPort: "\u7AEF\u53E3",
  minecraftDiscoverPaper: "\u67E5\u8BE2 Paper \u7248\u672C",
  minecraftDiscoverFabric: "\u67E5\u8BE2 Fabric \u7248\u672C",
  minecraftInstall: "\u521B\u5EFA\u5E76\u5B89\u88C5",
  minecraftStatus: "\u67E5\u770B\u72B6\u6001",
  minecraftStart: "\u542F\u52A8",
  minecraftStop: "\u505C\u6B62",
  minecraftBackup: "\u521B\u5EFA\u5907\u4EFD",
  minecraftConfig: "\u8BFB\u53D6\u914D\u7F6E",
  minecraftEulaConfirm: "\u6211\u5DF2\u9605\u8BFB\u5E76\u63A5\u53D7 Minecraft EULA\u3002",
  minecraftEulaLink: "\u67E5\u770B EULA",
  minecraftAcceptEula: "\u8BB0\u5F55 EULA \u63A5\u53D7",
  minecraftRequestQueued: "\u8BF7\u6C42\u5DF2\u53D1\u9001\u5230\u6240\u9009 DSH \u4F1A\u8BDD\uFF0C\u8BF7\u5728\u4F1A\u8BDD\u4E2D\u67E5\u770B Agent \u7ED3\u679C\u4E0E\u5BA1\u6279\u3002",
  minecraftRequestFailed: "\u8BF7\u6C42\u672A\u80FD\u53D1\u9001\u3002",
  minecraftSending: "\u6B63\u5728\u53D1\u9001\u5230\u6240\u9009\u4F1A\u8BDD\u2026",
  minecraftNeedsSession: "\u8BF7\u5148\u65B0\u5EFA\u6216\u9009\u62E9\u4E00\u4E2A DSH \u4F1A\u8BDD\uFF1B\u6240\u6709\u64CD\u4F5C\u90FD\u4F1A\u7531\u8BE5\u4F1A\u8BDD\u4E2D\u7684 Agent \u6267\u884C\u3002",
  minecraftDataRootRequired: "\u8BF7\u5148\u586B\u5199 Minecraft \u6570\u636E\u76EE\u5F55\u3002",
  minecraftVersionRequired: "\u8BF7\u5148\u586B\u5199 Minecraft \u7248\u672C\uFF0C\u6216\u5148\u67E5\u8BE2\u53EF\u7528\u7248\u672C\u3002",
  minecraftInstanceRequired: "\u8BF7\u586B\u5199\u5DF2\u6709\u5B9E\u4F8B ID\u3002",
  minecraftEulaRequired: "\u8BF7\u5148\u52FE\u9009\u5DF2\u9605\u8BFB\u5E76\u63A5\u53D7 Minecraft EULA\u3002",
  minecraftMoreOperations: "\u66F4\u591A\u670D\u52A1\u5668\u64CD\u4F5C",
  minecraftModSearch: "\u641C\u7D22 Fabric \u6A21\u7EC4\uFF08Modrinth\uFF09",
  minecraftSearchMods: "\u641C\u7D22\u6A21\u7EC4",
  minecraftModProjectId: "\u6A21\u7EC4\u9879\u76EE ID \u6216 slug",
  minecraftModVersionId: "\u53EF\u9009\uFF1A\u6307\u5B9A\u6A21\u7EC4\u7248\u672C ID",
  minecraftInstallMod: "\u5B89\u88C5\u6A21\u7EC4",
  minecraftModsFabricOnly: "\u6A21\u7EC4\u641C\u7D22\u548C\u5B89\u88C5\u76EE\u524D\u53EA\u652F\u6301 Fabric\u3002",
  minecraftModSearchRequired: "\u8BF7\u5148\u9009\u62E9 Minecraft \u7248\u672C\uFF0C\u5E76\u8F93\u5165\u81F3\u5C11 2 \u4E2A\u5B57\u7B26\u7684\u6A21\u7EC4\u5173\u952E\u8BCD\u3002",
  minecraftModProjectRequired: "\u8BF7\u5148\u4ECE\u4F1A\u8BDD\u4E2D\u7684\u641C\u7D22\u7ED3\u679C\u590D\u5236\u6A21\u7EC4\u9879\u76EE ID \u6216 slug\u3002",
  minecraftListBackups: "\u5217\u51FA\u5907\u4EFD",
  minecraftBackupId: "\u5907\u4EFD ID",
  minecraftRestore: "\u6062\u590D\u5907\u4EFD",
  minecraftListFiles: "\u6D4F\u89C8\u5B9E\u4F8B\u6587\u4EF6",
  minecraftRelativePath: "\u5B9E\u4F8B\u76F8\u5BF9\u8DEF\u5F84",
  minecraftReadFile: "\u8BFB\u53D6\u6B64\u6587\u4EF6",
  minecraftConfigChanges: "\u914D\u7F6E\u53D8\u66F4\uFF08JSON \u5B57\u7B26\u4E32\uFF09",
  minecraftUpdateConfig: "\u5E94\u7528\u914D\u7F6E\u53D8\u66F4",
  minecraftReadConsole: "\u8BFB\u53D6\u63A7\u5236\u53F0",
  minecraftConsoleCommand: "\u5355\u6761\u670D\u52A1\u5668\u63A7\u5236\u53F0\u547D\u4EE4",
  minecraftSendConsole: "\u53D1\u9001\u63A7\u5236\u53F0\u547D\u4EE4",
  minecraftBackupRequired: "\u8BF7\u5148\u586B\u5199\u8981\u6062\u590D\u7684\u5907\u4EFD ID\u3002",
  minecraftCommandRequired: "\u8BF7\u586B\u5199\u4E00\u6761\u670D\u52A1\u5668\u63A7\u5236\u53F0\u547D\u4EE4\u3002",
  minecraftPropertiesInvalid: "\u914D\u7F6E\u5185\u5BB9\u5FC5\u987B\u662F JSON \u5BF9\u8C61\uFF0C\u4E14\u6BCF\u4E2A\u503C\u90FD\u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u3002"
};
var en = {
  name: "dsh-lfaa",
  panel: "dsh-lfaa workspace",
  view: "dsh-lfaa",
  settings: "dsh-lfaa",
  eyebrow: "WORKSPACE",
  title: "One place for your work.",
  description: "Make room for your work across DSH conversations, trajectories, and side panels.",
  appearance: "Interface experience",
  appearanceDescription: "Themes, cards, dialogs, and motion are one part of this workspace.",
  preview: "Preview dialog",
  returnChat: "Back to conversation",
  inspector: "Open side panel",
  configure: "Manage appearance",
  settingsDescription: "The workspace and Settings share these preferences. Changes apply immediately.",
  preset: "Visual style",
  native: "Follow DSH",
  soft: "Soft",
  crisp: "Crisp",
  nativeHint: "Keep the host palette, corners, and shadows.",
  softHint: "Softer corners and lighter overlays for quiet reading.",
  crispHint: "Restrained corners and clearer layers for focused work.",
  density: "Workspace density",
  comfortable: "Comfortable",
  compact: "Compact",
  motion: "Motion",
  system: "Follow system",
  reduced: "Reduce motion",
  enabled: "Enable experience settings",
  enabledHint: "Turn off to restore the host appearance.",
  cardTitle: "Card preview",
  cardDescription: "Consistent spacing, depth, and borders make information easier to find.",
  previewLabel: "Appearance preview",
  sampleDetail: "Follows the active theme",
  sampleNote: "Use this card to inspect the visual style.",
  linkedSession: "Current conversation workspace",
  linkedHint: "Keep using Conversation and Trajectory above, or open the side panel to inspect preferences.",
  noSession: "Select a DSH conversation to open this workspace from its view tabs.",
  auxiliary: "Side panel",
  auxiliaryDescription: "Keep the conversation in the center and supporting details beside it.",
  saved: "Preferences synced",
  loading: "Loading preferences\u2026",
  unavailable: "Plugin settings are unavailable on this connection.",
  readonly: "This connection provides read-only settings.",
  rejected: "Not saved. Reload settings and try again.",
  error: "Could not save. Check your connection and try again.",
  dialogTitle: "Focus on the work at hand",
  dialogDescription: "This is a dialog preview. It performs no business operation.",
  dialogText: "DSH retains focus, keyboard, and dismissal behavior. Press Escape or select the backdrop to return.",
  done: "Done",
  close: "Close",
  session: "Conversation",
  sessionId: "Current conversation ID",
  currentPreset: "Current visual style",
  currentDensity: "Workspace density",
  currentMotion: "Motion",
  minecraftEyebrow: "SERVER MANAGEMENT",
  minecraftTitle: "Minecraft servers",
  minecraftDescription: "Choose a DSH conversation and ask its Agent to discover versions, inspect Java, and manage a server. If Java is missing, the Agent can install it from the official source; DSH approvals still govern every operation.",
  minecraftSupportedDistributions: "Paper \xB7 Fabric",
  minecraftSession: "Conversation for Agent operations",
  minecraftSessionPlaceholder: "Choose a DSH conversation",
  minecraftDistribution: "Server distribution",
  minecraftDataRoot: "Server data directory",
  minecraftDataRootPlaceholder: "Absolute path on the DSH host",
  minecraftVersion: "Minecraft version",
  minecraftVersionPlaceholder: "Discover versions or enter a version",
  minecraftInstanceId: "Instance ID (for existing servers)",
  minecraftInstancePlaceholder: "Copy the ID from the setup reply",
  minecraftInstallOptions: "New server options",
  minecraftName: "Instance name",
  minecraftMemory: "Maximum memory (MiB)",
  minecraftPort: "Port",
  minecraftDiscoverPaper: "Discover Paper versions",
  minecraftDiscoverFabric: "Discover Fabric versions",
  minecraftInstall: "Create and install",
  minecraftStatus: "Status",
  minecraftStart: "Start",
  minecraftStop: "Stop",
  minecraftBackup: "Create backup",
  minecraftConfig: "Read configuration",
  minecraftEulaConfirm: "I have read and accept the Minecraft EULA.",
  minecraftEulaLink: "Read the EULA",
  minecraftAcceptEula: "Record EULA acceptance",
  minecraftRequestQueued: "Request sent to the selected DSH conversation. Check the conversation for the Agent result and approvals.",
  minecraftRequestFailed: "Could not send the request.",
  minecraftSending: "Sending to the selected conversation\u2026",
  minecraftNeedsSession: "Create or select a DSH conversation first. Its Agent will perform the operations.",
  minecraftDataRootRequired: "Enter the Minecraft data directory first.",
  minecraftVersionRequired: "Enter a Minecraft version or discover available versions first.",
  minecraftInstanceRequired: "Enter an existing instance ID.",
  minecraftEulaRequired: "Confirm that you read and accept the Minecraft EULA first.",
  minecraftMoreOperations: "More server operations",
  minecraftModSearch: "Search Fabric mods (Modrinth)",
  minecraftSearchMods: "Search mods",
  minecraftModProjectId: "Mod project ID or slug",
  minecraftModVersionId: "Optional: exact mod version ID",
  minecraftInstallMod: "Install mod",
  minecraftModsFabricOnly: "Mod search and installation currently support Fabric only.",
  minecraftModSearchRequired: "Choose a Minecraft version and enter at least 2 characters to search.",
  minecraftModProjectRequired: "Copy a mod project ID or slug from the search result in the conversation.",
  minecraftListBackups: "List backups",
  minecraftBackupId: "Backup ID",
  minecraftRestore: "Restore backup",
  minecraftListFiles: "Browse instance files",
  minecraftRelativePath: "Instance-relative path",
  minecraftReadFile: "Read this file",
  minecraftConfigChanges: "Configuration changes (JSON strings)",
  minecraftUpdateConfig: "Apply configuration changes",
  minecraftReadConsole: "Read console",
  minecraftConsoleCommand: "One server console command",
  minecraftSendConsole: "Send console command",
  minecraftBackupRequired: "Enter the backup ID to restore.",
  minecraftCommandRequired: "Enter one server console command.",
  minecraftPropertiesInvalid: "Enter a JSON object with string values."
};

// packages/dsh-lfaa-workspace/src/styles.css
var styles_default = '.lfaa-panel, .lfaa-settings-section, .lfaa-inspector { color: var(--dsw-alias-label-primary); font: inherit; box-sizing: border-box; }\n.lfaa-panel *, .lfaa-settings-section *, .lfaa-inspector * { box-sizing: border-box; }\n.lfaa-panel { height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; container-type: inline-size; background: var(--dsw-alias-bg-base); }\n.lfaa-topbar { flex: none; min-height: 58px; padding: 12px 28px; border-bottom: 1px solid var(--dsw-alias-border-l1); display: flex; gap: 14px; align-items: center; justify-content: space-between; }\n.lfaa-brand { display: flex; align-items: center; gap: 10px; font-size: .9em; min-width: 0; }\n.lfaa-brand > span:last-child, .lfaa-separator { color: var(--dsw-alias-label-secondary); }\n.lfaa-page { width: 100%; max-width: 1120px; margin: 0 auto; padding: 48px 40px 28px; overflow: auto; min-height: 0; scrollbar-gutter: stable; }\n.lfaa-intro { max-width: 700px; margin-bottom: 38px; }\n.lfaa-kicker { color: var(--dsw-alias-label-secondary); font-size: .8em; letter-spacing: .1em; font-weight: 500; }\n.lfaa-intro h1 { font-size: clamp(25px, 3.5cqi, 36px); font-weight: 550; letter-spacing: -.035em; line-height: 1.25; margin: 14px 0; text-wrap: balance; }\n.lfaa-intro p, .lfaa-controls p, .lfaa-preview-column p, .lfaa-inspector > p { color: var(--dsw-alias-label-secondary); line-height: 1.7; margin: 8px 0 0; font-size: .94em; }\n.lfaa-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }\n.lfaa-primary-button, .lfaa-secondary-button, .lfaa-quiet-button { font: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 36px; padding: 8px 14px; border-radius: var(--dsw-radius-sm); font-size: .88em; line-height: 1.3; }\n.lfaa-primary-button { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); border: 1px solid transparent; }\n.lfaa-secondary-button { background: var(--dsw-alias-bg-layer-1); color: inherit; border: 1px solid var(--dsw-alias-border-l1); }\n.lfaa-quiet-button { background: transparent; border: 0; color: var(--dsw-alias-label-secondary); padding: 6px; }\n.lfaa-primary-button:focus-visible, .lfaa-secondary-button:focus-visible, .lfaa-quiet-button:focus-visible, .lfaa-preset:focus-visible, .lfaa-setting-row select:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 3px; }\n.lfaa-work-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .65fr); gap: 36px; align-items: start; }\n.lfaa-controls { min-width: 0; }\n.lfaa-section-heading { display: flex; align-items: start; flex-wrap: wrap; gap: 12px; justify-content: space-between; margin-bottom: 24px; }\n.lfaa-section-heading > div { flex: 1; min-width: 180px; }\n.lfaa-section-heading h2 { margin: 0; font-size: 1.14em; font-weight: 550; }\n.lfaa-sync { color: var(--dsw-alias-label-secondary); font-size: .76em; padding-top: 3px; }\n.lfaa-presets { border: 0; margin: 0; padding: 0; min-width: 0; }\n.lfaa-presets legend { padding: 0; margin-bottom: 12px; font-size: .88em; font-weight: 500; }\n.lfaa-preset-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }\n.lfaa-preset { display: flex; flex-direction: column; align-items: start; gap: 8px; min-width: 0; padding: 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: inherit; font: inherit; text-align: start; cursor: pointer; }\n.lfaa-preset[aria-pressed="true"] { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, var(--dsw-alias-bg-layer-1)); }\n.lfaa-preset strong { font-size: .85em; font-weight: 500; }\n.lfaa-preset > span:last-child { font-size: .74em; line-height: 1.5; color: var(--dsw-alias-label-secondary); }\n.lfaa-style-swatch { display: grid; grid-template-columns: 1fr 3fr; grid-template-rows: 1fr 1fr; gap: 4px; width: 100%; height: 54px; padding: 7px; background: var(--dsw-alias-bg-layer-2); border-radius: 6px; }\n.lfaa-style-swatch i { background: var(--dsw-alias-border-l1); border: 1px solid var(--dsw-alias-border-l2); border-radius: 3px; }\n.lfaa-style-swatch i:first-child { grid-row: span 2; }\n.lfaa-swatch-soft { border-radius: 10px; }.lfaa-swatch-soft i { border-radius: 5px; }.lfaa-swatch-crisp { border-radius: 3px; }.lfaa-swatch-crisp i { border-radius: 1px; }\n.lfaa-settings-rows { display: flex; flex-direction: column; margin-top: 20px; }\n.lfaa-setting-row { min-height: 58px; padding: 14px 0; display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: .88em; }\n.lfaa-setting-row select { font: inherit; color: inherit; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); padding: 7px 10px; min-width: 120px; max-width: 65%; }\n.lfaa-setting-row strong { font-weight: 450; }.lfaa-setting-row small { display: block; color: var(--dsw-alias-label-secondary); margin-top: 5px; line-height: 1.5; }\n.lfaa-setting-row input { accent-color: var(--dsw-alias-brand-primary); width: 17px; height: 17px; flex: none; }\n.lfaa-preview-column { padding-top: 4px; }.lfaa-preview-column h3 { margin: 18px 0 0; font-size: .95em; font-weight: 500; }\n.lfaa-preview { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: var(--dsw-radius-panel); overflow: hidden; }\n.lfaa-preview-chrome { display: flex; gap: 5px; align-items: center; height: 34px; padding: 0 14px; border-bottom: 1px solid var(--dsw-alias-border-l1); }.lfaa-preview-chrome span { width: 5px; height: 5px; background: var(--dsw-alias-label-secondary); opacity: .35; border-radius: 50%; }\n.lfaa-preview-layout { display: grid; grid-template-columns: 35px minmax(0,1fr); min-height: 224px; }.lfaa-preview-rail { border-right: 1px solid var(--dsw-alias-border-l1); padding: 14px 10px; display: flex; flex-direction: column; gap: 13px; }.lfaa-preview-rail i { height: 11px; border-radius: 3px; background: var(--dsw-alias-border-l1); }.lfaa-preview-rail i:first-child { background: var(--dsw-alias-brand-primary); opacity: .5; }\n.lfaa-preview-content { padding: 18px; min-width: 0; }.lfaa-preview-content > .lfaa-kicker { font-size: .67em; letter-spacing: .03em; }\n.lfaa-sample-card { background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-md); margin-top: 12px; padding: 16px; }\n.lfaa-mark { color: var(--dsw-alias-brand-primary); margin-bottom: 12px; display: flex; }.lfaa-sample-card strong { font-size: .78em; font-weight: 500; }.lfaa-sample-card p { margin-top: 7px; font-size: .7em; }\n.lfaa-sample-lines { display: flex; flex-direction: column; gap: 7px; margin-top: 16px; }.lfaa-sample-lines i { height: 4px; background: var(--dsw-alias-border-l1); border-radius: 3px; }.lfaa-sample-lines i:last-child { width: 70%; }\n.lfaa-footnote, .lfaa-session-meta { margin-top: 30px; font-size: .79em; line-height: 1.6; color: var(--dsw-alias-label-secondary); }.lfaa-session-meta code { overflow-wrap: anywhere; }.lfaa-session-meta summary { cursor: pointer; }\n.lfaa-error { color: var(--dsw-alias-state-error-primary); }.lfaa-empty { padding: 24px 0; color: var(--dsw-alias-label-secondary); }\n.lfaa-settings-section { padding: 8px 0; min-width: 0; container-type: inline-size; }.lfaa-settings-section .lfaa-preset-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }\n.lfaa-inspector { padding: 24px 20px; height: 100%; overflow: auto; min-width: 0; }.lfaa-inspector h2 { font-size: 1.12em; margin: 0; font-weight: 500; }.lfaa-inspector dl { margin: 26px 0; }.lfaa-inspector dl > div { padding: 12px 0; display: flex; gap: 12px; justify-content: space-between; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: .85em; }.lfaa-inspector dt { color: var(--dsw-alias-label-secondary); }.lfaa-inspector dd { margin: 0; }\n.lfaa-dialog { max-height: min(80dvh, 640px); overflow-y: auto !important; }.lfaa-dialog p { line-height: 1.7; margin: 0; }\n[data-density="compact"] .lfaa-page { padding-top: 28px; }[data-density="compact"] .lfaa-intro { margin-bottom: 24px; }[data-density="compact"] .lfaa-setting-row { min-height: 46px; padding: 10px 0; }\n@media (hover: hover) and (pointer: fine) { .lfaa-preset:hover, .lfaa-secondary-button:hover { border-color: var(--dsw-alias-border-l2); }.lfaa-quiet-button:hover { color: var(--dsw-alias-label-primary); } }\n@container (max-width: 780px) { .lfaa-work-grid { grid-template-columns: minmax(0,1fr); gap: 28px; }.lfaa-preview-column { display: grid; grid-template-columns: minmax(180px,.7fr) minmax(0,1fr); column-gap: 22px; align-items: start; }.lfaa-preview-column .lfaa-preview { grid-row: span 2; }.lfaa-preview-column h3 { margin-top: 16px; }.lfaa-topbar { padding-inline: 20px; }.lfaa-page { padding-inline: 26px; } }\n@container (max-width: 460px) { .lfaa-topbar { padding-inline: 14px; gap: 8px; }.lfaa-brand { gap: 7px; }.lfaa-brand > span:last-child, .lfaa-separator { display: none; }.lfaa-page { padding: 28px 18px 20px; }.lfaa-preset-grid { grid-template-columns: 1fr; }.lfaa-preset { display: grid; grid-template-columns: 75px minmax(0,1fr); column-gap: 12px; }.lfaa-style-swatch { grid-row: span 2; height: 60px; }.lfaa-preset > span:last-child { font-size: .8em; }.lfaa-preview-column { display: block; }.lfaa-settings-section .lfaa-preset-grid { grid-template-columns: 1fr; } }\n@media (max-height: 560px) { .lfaa-page { padding-top: 24px; }.lfaa-intro { margin-bottom: 24px; }.lfaa-dialog { max-height: 88dvh; } }\n.lfaa-minecraft { padding: 22px; margin: 0 0 34px; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-panel); background: var(--dsw-alias-bg-layer-1); }\n.lfaa-minecraft .lfaa-section-heading { margin-bottom: 18px; }\n.lfaa-minecraft .lfaa-section-heading h2 { margin: 6px 0 0; }\n.lfaa-minecraft-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; align-items: end; }\n.lfaa-minecraft-grid > label, .lfaa-minecraft-options label { display: flex; flex-direction: column; gap: 7px; min-width: 0; color: var(--dsw-alias-label-secondary); font-size: .82em; }\n.lfaa-minecraft-grid input, .lfaa-minecraft-options input { width: 100%; min-width: 0; min-height: 38px; padding: 8px 10px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); font: inherit; }\n.lfaa-minecraft-grid select { width: 100%; min-width: 0; min-height: 38px; padding: 8px 10px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); font: inherit; }\n.lfaa-minecraft-grid input:focus-visible, .lfaa-minecraft-options input:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }\n.lfaa-minecraft-options { grid-column: 1/-1; padding-top: 5px; color: var(--dsw-alias-label-secondary); font-size: .85em; }\n.lfaa-minecraft-options summary { width: fit-content; cursor: pointer; }\n.lfaa-minecraft-options > div { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; padding: 14px 0 4px; }\n.lfaa-minecraft-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }\n.lfaa-minecraft-actions button:disabled, .lfaa-minecraft > button:disabled { opacity: .5; cursor: not-allowed; }\n.lfaa-minecraft-eula { display: flex; gap: 9px; align-items: flex-start; margin: 18px 0 10px; color: var(--dsw-alias-label-secondary); font-size: .82em; line-height: 1.5; }\n.lfaa-minecraft-eula input { margin: 2px 0 0; accent-color: var(--dsw-alias-brand-primary); flex: none; }\n.lfaa-minecraft-eula a { color: var(--dsw-alias-brand-primary); }\n.lfaa-success { color: var(--dsw-alias-state-success-primary); font-size: .85em; }\n.lfaa-minecraft-more { margin-top: 16px; }.lfaa-minecraft-more-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); align-items: end; gap: 10px; padding-top: 14px; }.lfaa-minecraft-more-grid label { display: flex; flex-direction: column; gap: 7px; color: var(--dsw-alias-label-secondary); font-size: .8em; }.lfaa-minecraft-more-grid input, .lfaa-minecraft-more-grid textarea { width: 100%; min-width: 0; min-height: 36px; padding: 8px 10px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm); font: inherit; resize: vertical; }.lfaa-minecraft-more-grid .lfaa-minecraft-wide { grid-column: span 2; }\n@container (max-width: 700px) { .lfaa-minecraft-grid { grid-template-columns: 1fr; }.lfaa-minecraft-options { grid-column: 1; }.lfaa-minecraft-options > div, .lfaa-minecraft-more-grid { grid-template-columns: 1fr; }.lfaa-minecraft-more-grid .lfaa-minecraft-wide { grid-column: auto; }.lfaa-minecraft { padding: 16px; } }\n';

// packages/dsh-lfaa-workspace/src/index.jsx
var name = "dsh-lfaa";
var inject = ["slots", "locale", "theme", "configForms", "layout", "sidebarRightTabs", "sidebarRight", "sessions"];
function apply(ctx) {
  if (typeof ctx.theme.overrideTokens !== "function") throw new Error("dsh-lfaa: incompatible DSH ThemeRuntime.");
  ctx.effect(() => ctx.locale.register(name, { zh, en }));
  const t = ctx.locale.bind(name);
  const form = ctx.configForms.get(name);
  const submitMinecraftPrompt = async (sessionId, prompt) => {
    if (!sessionId) throw new Error("\u8BF7\u5148\u5728 DSH \u4F1A\u8BDD\u4E2D\u6253\u5F00 dsh-lfaa \u5DE5\u4F5C\u533A\u3002");
    await ctx.sessions.using(sessionId, { source: "dsh-lfaa-minecraft-ui" }, async (reference) => {
      const session = reference.binding.session;
      const submission = session.beginSubmission({ mode: "queue", text: prompt, attachments: [] });
      try {
        const result = await session.prompt([{ type: "text", text: prompt }], "queue", void 0, submission.requestId);
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
    openInspector: () => ctx.sidebarRight.openTab(name)
  });
  ctx.effect(() => {
    if (typeof document === "undefined") return;
    const tag = document.createElement("style");
    tag.dataset.plugin = name;
    tag.textContent = styles_default;
    document.head.append(tag);
    return () => tag.remove();
  });
  const media = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : void 0;
  installPresentation(ctx, form, media);
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: name, locale: name, inject: face }, Workspace));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: name, order: 20, label: () => t("panel"), locale: name }, PluginIcon));
  ctx.slots.inject("conversation.view", () => ctx.slots.register({ name: "conversation.view", id: name, order: 20, label: () => t("view"), locale: name, inject: face }, Workspace));
  ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: name, order: 30, label: () => t("settings"), locale: name, inject: face }, SettingsSection));
  ctx.effect(() => ctx.sidebarRightTabs.register({ id: name, kind: name, priority: "extension", title: () => t("name"), guide: [{ id: name, order: 20, title: () => t("panel"), description: () => t("auxiliaryDescription"), icon: PluginIcon }] }));
  ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({ name: "sidebar.right.pane.tab", key: name, locale: name, inject: face }, Inspector));
  ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: name, locale: name }, InspectorTitle));
}
return module.exports;}});
