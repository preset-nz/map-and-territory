// Minimal commands registry for MVP
export type CommandHandler = (payload?: unknown) => Promise<unknown> | unknown;

const registry = new Map<string, CommandHandler>();

export function registerCommand(id: string, handler: CommandHandler) {
  registry.set(id, handler);
}

export function unregisterCommand(id: string) {
  registry.delete(id);
}

export function hasCommand(id: string) {
  return registry.has(id);
}

export async function executeCommand<T = unknown>(
  id: string,
  payload?: unknown,
): Promise<T> {
  const handler = registry.get(id);
  if (!handler) {
    throw new Error(`Command not found: ${id}`);
  }
  return (await handler(payload)) as T;
}

// Utility to ensure a command is registered only once
export function ensureCommand(id: string, handler: CommandHandler) {
  if (!hasCommand(id)) registerCommand(id, handler);
}
