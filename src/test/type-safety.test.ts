import type {
  SidebarSection,
  BreadcrumbItem,
  Theme,
  // FontSize,
  // Density,
  User,
} from "@/types/layout";

describe("TypeScript Type Safety", () => {
  it("should enforce correct SidebarSection values", () => {
    const validSections: SidebarSection[] = ["navigation", "tools", "layers"];

    expect(validSections).toHaveLength(3);
    expect(validSections).toContain("navigation");
    expect(validSections).toContain("tools");
  });

  it("should validate BreadcrumbItem structure", () => {
    const breadcrumb: BreadcrumbItem = {
      label: "Home",
      href: "/",
    };

    expect(breadcrumb.label).toBe("Home");
    expect(breadcrumb.href).toBe("/");
  });

  it("should enforce Theme type constraints", () => {
    const themes: Theme[] = ["light", "dark", "system"];

    expect(themes).toHaveLength(3);
    expect(themes).toContain("system");
  });

  it("should validate User interface", () => {
    const user: User = {
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      avatar: "https://example.com/avatar.jpg",
    };

    expect(user.id).toBe("123");
    expect(user.name).toBe("John Doe");
    expect(user.email).toBe("john@example.com");

    // Avatar should be optional
    const userWithoutAvatar: User = {
      id: "456",
      name: "Jane Doe",
      email: "jane@example.com",
    };

    expect(userWithoutAvatar.avatar).toBeUndefined();
  });

  it("should handle nested type composition", () => {
    const complexBreadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Campaigns", href: "/campaigns" },
      { label: "Campaign 1", href: "/campaigns/1" },
    ];

    expect(complexBreadcrumbs).toHaveLength(3);
    expect(complexBreadcrumbs[2].label).toBe("Campaign 1");
  });
});
