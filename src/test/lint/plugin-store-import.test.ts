import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslint = new ESLint({
  cwd: resolve(__dirname, "../../.."),
});

describe("plugin lint guard", () => {
  it("rejects direct store imports", async () => {
    const results = await eslint.lintText(
      'import { useCampaignStore } from "@/stores/campaign";',
      { filePath: "src/plugin/example.ts" },
    );
    const messages = results[0]?.messages ?? [];
    const restricted = messages.filter(
      (m) => m.ruleId === "no-restricted-imports",
    );
    expect(restricted.length).toBeGreaterThan(0);
    expect(restricted[0]?.message ?? "").toContain("ToolContext seams");
  });

  it("allows plugin runtime helpers", async () => {
    const results = await eslint.lintText(
      'import { getCurrentCampaign } from "@/platform/plugin-runtime/state";',
      { filePath: "src/plugin/example.ts" },
    );
    const messages = results[0]?.messages ?? [];
    expect(messages.every((m) => m.ruleId !== "no-restricted-imports")).toBe(
      true,
    );
  });
});
