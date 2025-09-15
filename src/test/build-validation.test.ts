import { describe, it, expect } from "vitest";

describe("Build and Import Validation", () => {
  it("should import layout components without errors", async () => {
    const { AppLayout } = await import("@/components/layout/app-layout");
    const { AppHeader } = await import("@/components/layout/app-header");
    const { MainContent } = await import("@/components/layout/main-content");

    expect(AppLayout).toBeDefined();
    expect(AppHeader).toBeDefined();
    expect(MainContent).toBeDefined();
  });

  it("should import layout stores without errors", async () => {
    const layoutStore = await import("@/stores/layout");

    expect(layoutStore.useLayoutStore).toBeDefined();
    expect(layoutStore.useSidebarState).toBeDefined();
    expect(layoutStore.useLayoutPreferences).toBeDefined();
    expect(layoutStore.useNavigationState).toBeDefined();
  });

  it("should import shadcn/ui components without errors", async () => {
    const { Sidebar } = await import("@/components/ui/sidebar");
    const { Breadcrumb } = await import("@/components/ui/breadcrumb");
    const { Avatar } = await import("@/components/ui/avatar");

    expect(Sidebar).toBeDefined();
    expect(Breadcrumb).toBeDefined();
    expect(Avatar).toBeDefined();
  });

  it("should import type definitions without errors", async () => {
    const types = await import("@/types/layout");

    expect(types).toBeDefined();
    // Types should be available at compile time
  });

  it("should import providers without errors", async () => {
    const { NoOpAuthProvider } = await import(
      "@/components/providers/auth-provider"
    );

    expect(NoOpAuthProvider).toBeDefined();
  });

  it("should import utilities without errors", async () => {
    const { cn } = await import("@/lib/utils");

    expect(cn).toBeDefined();
    expect(typeof cn).toBe("function");
  });
});
