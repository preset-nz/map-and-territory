import { beforeEach, describe, expect, it } from "vitest";
import { executeCommand } from "@/lib/commands";
import { freeformManifest, freeformModule } from "@/plugin/builtin/freeform";
import { loadPlugin } from "@/plugin/loader";
import { useLayoutStore } from "@/stores/layout";

describe("Freeform tool commands", () => {
  beforeEach(async () => {
    // Reset active tool
    useLayoutStore.getState().setActiveTool("select");
    await loadPlugin(freeformManifest, freeformModule);
  });

  it("tool.freeform.paint sets activeTool to paint", async () => {
    await executeCommand("tool.freeform.paint");
    expect(useLayoutStore.getState().activeTool).toBe("paint");
  });

  it("tool.freeform.erase sets activeTool to erase", async () => {
    await executeCommand("tool.freeform.erase");
    expect(useLayoutStore.getState().activeTool).toBe("erase");
  });
});
