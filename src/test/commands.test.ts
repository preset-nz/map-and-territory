import { describe, it, expect } from "vitest";
import {
  registerCommand,
  executeCommand,
  hasCommand,
  unregisterCommand,
} from "@/lib/commands";

describe("Commands Registry", () => {
  it("registers and executes a command", async () => {
    registerCommand("test.echo", (p) => p);
    expect(hasCommand("test.echo")).toBe(true);
    const res = await executeCommand("test.echo", 123);
    expect(res).toBe(123);
    unregisterCommand("test.echo");
  });

  it("throws for unknown command", async () => {
    await expect(executeCommand("does.not.exist")).rejects.toThrow();
  });
});
