import { defineTool } from '@deepseek-ai/dsh-tools';
import { approveEscalation } from '@deepseek-ai/dsh-sandbox';

const ACTIONS = [
  'list_versions', 'list_builds', 'inspect_java', 'install_java', 'list_instances', 'create',
  'install_server', 'mod_search', 'mod_install', 'accept_eula', 'start', 'status', 'console_read', 'console_send', 'stop', 'restart',
  'list_files', 'read_file', 'write_file', 'config_read', 'config_update',
  'backup_create', 'backup_list', 'backup_restore',
];

const APPROVAL_ACTIONS = new Set([
  'install_java', 'create', 'install_server', 'mod_install', 'accept_eula', 'start', 'console_send', 'stop', 'restart',
  'write_file', 'config_update',
  'backup_create', 'backup_restore',
]);

const NEXT_STEPS = {
  MINECRAFT_JAVA_NOT_FOUND: 'Call inspect_java for the requested Minecraft version. If it reports requiresInstall, install Java from the official Temurin source into the user-selected dataRoot, then retry server installation.',
  MINECRAFT_JAVA_INCOMPATIBLE: 'Call inspect_java for the requested Minecraft version. If no compatible runtime is listed, call install_java and retry server installation with its returned executable.',
  MINECRAFT_EULA_REQUIRED: 'Ask the user to review and explicitly accept the Minecraft EULA. Only then call accept_eula with accepted=true.',
  MINECRAFT_NOT_INSTALLED: 'List official builds for the selected distribution and version, install the returned stable build, then retry the requested lifecycle action.',
  MINECRAFT_VERSION_UNAVAILABLE: 'Call list_versions with the selected distribution and let the user choose a version from that catalog.',
  MINECRAFT_DISK_SPACE_LOW: 'Tell the user how much disk space is needed and ask them to choose a dataRoot with enough free space.',
};

function resultText(value) {
  return JSON.stringify(value);
}

function errorText(error) {
  const code = typeof error?.code === 'string' ? error.code : 'MINECRAFT_OPERATION_FAILED';
  const nextStep = NEXT_STEPS[code] ?? 'Report the returned error and do not claim the action succeeded. If it came from a denied or cancelled DSH approval, stop without retrying through another tool.';
  return resultText({ error: { code, message: error instanceof Error ? error.message : String(error) }, nextStep });
}

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`${name} is required for this Minecraft action.`);
  return value;
}

/** Register the single model-facing orchestration tool over the Host-owned Minecraft service. */
export function registerMinecraftTool(ctx, service) {
  ctx.tools.register(defineTool({
    name: 'minecraft_server',
    description: 'Discover official Paper or Fabric Minecraft versions and server builds, inspect compatible Java runtimes, install a missing Java runtime from official Eclipse Temurin metadata with SHA-256 verification, create and install the selected server, search Modrinth for Minecraft-version-compatible Fabric mods and install a selected mod with required dependencies and SHA-512 verification, manage the server lifecycle, inspect instance files and server.properties, make approved text-configuration changes, and create, list, or restore stopped-instance backups. Decide the next action from each result: inspect Java for the selected Minecraft version first; if no compatible runtime is listed, install Java under the user-selected dataRoot before installing the server. Never invent a dataRoot. Mod installation is currently limited to Fabric mods from Modrinth and requires the server to be stopped. Ask the user to review and explicitly accept the Minecraft EULA before calling accept_eula with accepted=true. DSH permission policy may ask for one-call approval before downloads, file writes, console commands, backup restore, or process lifecycle actions. If an approval is denied or cancelled, stop and explain; never bypass it through another tool. Only Paper and Fabric are currently supported.',
    parameters: {
      action: { type: 'string', required: true, enum: ACTIONS, description: 'The discovery, installation, or lifecycle action to perform.' },
      distribution: { type: 'string', enum: ['paper', 'fabric'], description: 'Minecraft server distribution. Defaults to Paper; currently supported: paper and fabric.' },
      dataRoot: { type: 'string', description: 'Absolute local directory chosen by the user for Minecraft files and downloaded Java runtimes.' },
      version: { type: 'string', description: 'Minecraft version from list_versions.' },
      buildId: { type: 'string', description: 'Optional official stable Paper build id from list_builds.' },
      query: { type: 'string', description: 'Modrinth search text for mod_search, at least 2 characters.' },
      projectId: { type: 'string', description: 'Modrinth project id or slug for mod_install.' },
      versionId: { type: 'string', description: 'Optional exact Modrinth version id for mod_install; omit to choose the latest compatible release.' },
      id: { type: 'string', description: 'Minecraft instance id returned by create or list_instances.' },
      name: { type: 'string', description: 'User-chosen display name for a new Minecraft instance.' },
      memoryMb: { type: 'number', description: 'Maximum server heap in MiB, chosen by the user.' },
      port: { type: 'number', description: 'User-chosen server port from 1 to 65535.' },
      javaExecutable: { type: 'string', description: 'Optional compatible Java executable path returned by inspect_java or install_java.' },
      accepted: { type: 'boolean', description: 'For accept_eula only: true after the user explicitly says they accept the Minecraft EULA.' },
      command: { type: 'string', description: 'One single-line Minecraft server console command.' },
      limit: { type: 'number', description: 'Maximum number of recent console lines to return.' },
      path: { type: 'string', description: 'Instance-relative file or directory path. Never use an absolute path or parent-directory segment.' },
      content: { type: 'string', description: 'UTF-8 text content for write_file, at most 1 MiB.' },
      properties: {
        type: 'object',
        description: 'One to twenty server.properties values. Supported keys include motd, max-players, difficulty, gamemode, pvp, online-mode, white-list, allow-flight, view-distance, simulation-distance, spawn-protection, level-name, and server-port.',
        additionalProperties: { type: 'string' },
      },
      backupId: { type: 'string', description: 'Managed backup ID returned by backup_list.' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      try {
        if (APPROVAL_ACTIONS.has(args.action)) {
          const policy = ctx.sandboxPolicy.resolve(exec.agent === undefined ? {} : { session: exec.agent.session });
          await approveEscalation({
            requestedMode: 'danger-full-access',
            effectiveMode: policy.mode,
            subject: 'Minecraft server operation',
            justification: `minecraft_server ${args.action} ${JSON.stringify(args)}. This operation may download Java or Paper files, write the selected game-data directory, or run/stop a server process.`,
          }, {
            approver: ctx.get('approval'),
            agent: exec.agent,
            callId: exec.callId,
            toolName: 'minecraft_server',
            signal: exec.signal,
          });
        }
        exec.signal.throwIfAborted();
        let value;
        switch (args.action) {
          case 'list_versions':
            value = await service.listVersions(args.distribution ?? 'paper', exec.signal);
            break;
          case 'list_builds':
            value = await service.listBuilds(required(args.version, 'version'), args.distribution ?? 'paper', exec.signal);
            break;
          case 'inspect_java':
            value = await service.inspectJavaForVersion({ version: required(args.version, 'version'), signal: exec.signal });
            break;
          case 'install_java':
            value = await service.installJavaForVersion({ dataRoot: required(args.dataRoot, 'dataRoot'), version: required(args.version, 'version'), signal: exec.signal });
            break;
          case 'list_instances':
            value = await service.listInstances({ dataRoot: required(args.dataRoot, 'dataRoot'), signal: exec.signal });
            break;
          case 'create':
            value = await service.createInstance({
              dataRoot: required(args.dataRoot, 'dataRoot'),
              name: required(args.name, 'name'),
              version: required(args.version, 'version'),
              distribution: args.distribution ?? 'paper',
              memoryMb: required(args.memoryMb, 'memoryMb'),
              port: required(args.port, 'port'),
              signal: exec.signal,
            });
            break;
          case 'install_server':
            value = await service.install({
              dataRoot: required(args.dataRoot, 'dataRoot'),
              id: required(args.id, 'id'),
              ...(args.buildId === undefined ? {} : { buildId: args.buildId }),
              ...(args.javaExecutable === undefined ? {} : { javaExecutable: args.javaExecutable }),
              signal: exec.signal,
            });
            break;
          case 'mod_search':
            value = await service.searchMods({ query: required(args.query, 'query'), version: required(args.version, 'version'), distribution: args.distribution ?? 'fabric', signal: exec.signal });
            break;
          case 'mod_install':
            value = await service.installMod({
              dataRoot: required(args.dataRoot, 'dataRoot'),
              id: required(args.id, 'id'),
              projectId: required(args.projectId, 'projectId'),
              ...(args.versionId === undefined ? {} : { versionId: args.versionId }),
              signal: exec.signal,
            });
            break;
          case 'accept_eula':
            value = await service.acceptEula({
              dataRoot: required(args.dataRoot, 'dataRoot'),
              id: required(args.id, 'id'),
              accepted: args.accepted,
              signal: exec.signal,
            });
            break;
          case 'start':
            value = await service.start({
              dataRoot: required(args.dataRoot, 'dataRoot'),
              id: required(args.id, 'id'),
              ...(args.javaExecutable === undefined ? {} : { javaExecutable: args.javaExecutable }),
              signal: exec.signal,
            });
            break;
          case 'status':
            value = await service.status({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), signal: exec.signal });
            break;
          case 'console_read':
            value = await service.readConsole({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), limit: args.limit, signal: exec.signal });
            break;
          case 'console_send':
            value = await service.sendConsole({
              dataRoot: required(args.dataRoot, 'dataRoot'),
              id: required(args.id, 'id'),
              command: required(args.command, 'command'),
              signal: exec.signal,
            });
            break;
          case 'stop':
            value = await service.stop({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), signal: exec.signal });
            break;
          case 'restart':
            value = await service.restart({
              dataRoot: required(args.dataRoot, 'dataRoot'),
              id: required(args.id, 'id'),
              ...(args.javaExecutable === undefined ? {} : { javaExecutable: args.javaExecutable }),
              signal: exec.signal,
            });
            break;
          case 'list_files':
            value = await service.listFiles({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), path: args.path, signal: exec.signal });
            break;
          case 'read_file':
            value = await service.readFile({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), path: required(args.path, 'path'), signal: exec.signal });
            break;
          case 'write_file':
            value = await service.writeFile({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), path: required(args.path, 'path'), content: required(args.content, 'content'), signal: exec.signal });
            break;
          case 'config_read':
            value = await service.readConfig({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), signal: exec.signal });
            break;
          case 'config_update':
            value = await service.updateConfig({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), properties: required(args.properties, 'properties'), signal: exec.signal });
            break;
          case 'backup_create':
            value = await service.createBackup({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), signal: exec.signal });
            break;
          case 'backup_list':
            value = await service.listBackups({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), signal: exec.signal });
            break;
          case 'backup_restore':
            value = await service.restoreBackup({ dataRoot: required(args.dataRoot, 'dataRoot'), id: required(args.id, 'id'), backupId: required(args.backupId, 'backupId'), signal: exec.signal });
            break;
          default:
            value = { error: { code: 'MINECRAFT_ACTION_UNKNOWN', message: 'The requested Minecraft action is not supported.' } };
        }
        return resultText(value);
      } catch (error) {
        return errorText(error);
      }
    },
    presentCall: args => ({ card: 'generic', title: 'Minecraft server', kind: 'other', rawInput: args }),
  }));
}
