import Schema from '@deepseek-ai/schemastery';

/** Profile-level controls; DSH validates, persists and projects the same schema. */
export const Config = Schema.object({
  enabled: Schema.boolean().default(true).volatile().description({ zh: '启用体验配置；关闭后恢复宿主原外观。', en: 'Enable experience settings; disabling restores the host appearance.' }),
  preset: Schema.union(['native', 'soft', 'crisp']).default('native').volatile().description({ zh: '视觉方案：原生、柔和、清晰。', en: 'Visual style: native, soft or crisp.' }),
  density: Schema.union(['comfortable', 'compact']).default('comfortable').volatile().description({ zh: '插件工作区密度，不改动 DSH 会话布局状态。', en: 'Plugin workspace density; does not change DSH conversation geometry.' }),
  motion: Schema.union(['system', 'reduced']).default('system').volatile().description({ zh: '跟随系统或减少动态效果，系统偏好优先。', en: 'Follow the system or reduce motion; system accessibility takes precedence.' }),
});
