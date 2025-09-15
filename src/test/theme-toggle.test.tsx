import { describe, it, beforeEach, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SimpleThemeToggle } from "@/components/layout/theme-toggle";
import { useLayoutStore } from "@/stores/layout";

describe("SimpleThemeToggle", () => {
  beforeEach(() => {
    // reset store theme to light for deterministic test
    useLayoutStore.setState({ theme: "light" });
    // clear classes
    document.documentElement.classList.remove("light", "dark");
  });

  it("applies theme class to document on toggle", async () => {
    render(<SimpleThemeToggle />);

    // wait for mount effect to apply initial theme
    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    fireEvent.click(btn);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });
});
