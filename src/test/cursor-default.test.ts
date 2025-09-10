import { describe, it, expect } from "vitest";
import { getCursorForTool, registerToolCursor } from "@/plugin/loader";

describe("Tool cursor defaults", () => {
  it("returns undefined for tools without a registered cursor", () => {
    expect(getCursorForTool("select")).toBeUndefined();
    expect(getCursorForTool("nonexistent-tool")).toBeUndefined();
  });

  it("returns the registered cursor when defined", () => {
    const dispose = registerToolCursor("paint", "crosshair");
    expect(getCursorForTool("paint")).toBe("crosshair");
    dispose();
    expect(getCursorForTool("paint")).toBeUndefined();
  });
});
