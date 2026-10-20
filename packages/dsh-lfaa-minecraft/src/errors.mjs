/** Error carrying a stable code for the Host service and later UI/tool callers. */
export class MinecraftError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'MinecraftError';
    this.code = code;
  }
}

/** Raise one localized by callers Minecraft domain failure. */
export function fail(code, message, options) {
  throw new MinecraftError(code, message, options);
}
