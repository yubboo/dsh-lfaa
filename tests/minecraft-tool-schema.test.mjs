import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerMinecraftTool } from '../packages/dsh-lfaa-minecraft/src/tools.mjs';

test('minecraft_server schema registers with the DSH parameter DSL', () => {
  let registered;
  registerMinecraftTool({ tools: { register: tool => { registered = tool; } } }, {});

  assert.equal(registered.name, 'minecraft_server');
  assert.equal(registered.parameters.properties.properties.additionalProperties, true);
});
