import { apply as applyMinecraft } from 'dsh-lfaa-minecraft';
export { Config } from 'dsh-lfaa-appearance/config';

export const name = 'dsh-lfaa';
/** DSH provides filesystem, process, and model tool capabilities to the domain owner. */
export const inject = ['fs', 'subprocess', 'tools', 'sandboxPolicy'];

/** Host composition root: the Minecraft package owns all server lifecycle behavior. */
export function apply(ctx) {
  applyMinecraft(ctx);
}
