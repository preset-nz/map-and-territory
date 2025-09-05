import { describe, it, expect, beforeEach } from "vitest";
import { resolvePreconditions } from "@/plugin/capabilities";
import { useProjectStore } from "@/stores/project";

describe("capabilities", () => {
  beforeEach(() => {
    useProjectStore.setState({ current: null });
  });

  it("hasActiveMap disables without an active map and enables after", () => {
    let res = resolvePreconditions(["hasActiveMap"]);
    expect(res.enabled).toBe(false);
    // Create project + map
    const p = useProjectStore.getState().createEmpty({ name: "P" });
    useProjectStore.getState().setActive(p);
    const id = useProjectStore.getState().addMap({ name: "M" })!;
    useProjectStore.getState().selectMap(id);
    res = resolvePreconditions(["hasActiveMap"]);
    expect(res.enabled).toBe(true);
  });
});
