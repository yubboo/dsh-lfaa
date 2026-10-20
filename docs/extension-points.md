# Native extension contracts

English | [中文](extension-points.zh.md)

| Surface | DSH interface | Plugin obligation |
|---|---|---|
| Left navigation | sidebar.panellist + layout.selectPanel | Keep host navigation; the plugin id selects its own registered main panel. |
| Central workspace | keyed main + global `useSessions` hook | The global panel lists DSH conversations and requires a selected target for Agent operations. |
| Novel workspace | `remote.account` + `sessions.using`/Session events | Verify the current DSH account profile ID before opening its local IndexedDB; route polish/continuation through the selected Session and apply returned text only after user action. |
| Conversation/Trajectory tabs | list conversation.view | Add dsh-lfaa beside native tabs. Session identity comes from framework props; preserve native history, view selection and developer-mode policy. |
| Right pane | sidebarRightTabs + sidebar.right.pane.tab/title + openTab | Register type and body/title together; the current on-screen Session owns the pane. Global panels are not Session surfaces. |
| Settings | settings.section + ConfigForms | Share the same accepted schema and revision-fenced persistence with the workspace. Handle unavailable/read-only/refused writes truthfully. |
| Minecraft Host domain | `ctx.lfaaMinecraft`, provided by dsh-lfaa-minecraft | Owns Paper/Fabric version and build discovery, Java inspection/install, instances, EULA, lifecycle, bounded files/config, console, backups, and Fabric mods. The workspace submits requests to `minecraft_server` through the selected DSH conversation. |

In DSH tool parameters, the root is an implicit open property map; each explicit nested object declares boolean `additionalProperties`. The Minecraft `server.properties` map is open at the schema boundary, while its Host domain owner enforces supported keys, string values, and request bounds.

All contributions dispose. Use slots.inject to wait for declarations, and retain original props/children/store/scope contracts when shading native slots. Lower numeric shadow priority wins; identical priority collisions are errors. Do not target private DOM or hashed classes.

Theme overrides use theme.overrideTokens with paired light/dark values and a stable plugin source. Default native appearance produces no layer. density changes affect only the plugin workspace. System reduced motion takes precedence, and no new animation is imposed on high-frequency keyboard actions.

Host and Client entries build separately; browser registration uses the upstream ModuleLoader envelope and host-shared platform modules. Native Modal owns focus, keyboard and dismissal. Public tokens do not imply a universal dialog replacement factory; changes to deeper host behavior require an actual public seam and tests.

Supported package baseline: DSH 0.2.1-rc.2 with exact peer versions. Scope, exports, disposal, settings roundtrips and actual browser behavior must still be validated against the installed runtime before claiming full compatibility. See [actual evidence](validation.md).
