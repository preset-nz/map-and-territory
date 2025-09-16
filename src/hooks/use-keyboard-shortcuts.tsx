"use client";

/**
 * Keyboard shortcuts hook for creative tool shortcuts
 * Handles F1/F2 for panels and 1-9 for tools
 */

import { useEffect } from "react";
import { useLayoutStore, useToolActions } from "@/stores/layout";
import { executeCommand } from "@/lib/commands";

const TOOL_SHORTCUTS: Record<string, string> = {
  "1": "select",
  "2": "paint",
  "3": "fill",
  "4": "erase",
  "5": "text",
};

export const useKeyboardShortcuts = () => {
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
  const { setActiveTool, togglePropertiesPanel } = useToolActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Panel toggles
      if (event.key === "F1") {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        togglePropertiesPanel();
        return;
      }

      // New Campaign: Mod+Shift+N
      const isMac =
        typeof navigator !== "undefined" &&
        navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod && event.shiftKey && (event.key === "N" || event.key === "n")) {
        event.preventDefault();
        executeCommand("campaign.new").catch(console.error);
        return;
      }

      // Tool shortcuts (1-5)
      const tool = TOOL_SHORTCUTS[event.key];
      if (tool) {
        event.preventDefault();
        setActiveTool(tool);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleSidebar, togglePropertiesPanel, setActiveTool]);
};

export default useKeyboardShortcuts;
