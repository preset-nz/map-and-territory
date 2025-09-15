import "@testing-library/jest-dom";
import { beforeAll, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock Next.js router
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
});

// Clean up after each test
afterEach(() => {
  cleanup();
});
