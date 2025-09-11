"use client";

import React, { useMemo } from "react";

type Props = { children: React.ReactNode };

export const WorkerSupportGate: React.FC<Props> = ({ children }) => {
  // Avoid hydration mismatch: assume supported until mounted, then check.
  const [mounted, setMounted] = React.useState(false);
  const supported = useMemo(() => {
    if (!mounted) return true; // assume true on first paint to match SSR
    try {
      const hasTCTOS =
        typeof HTMLCanvasElement !== "undefined" &&
        typeof (
          HTMLCanvasElement.prototype as unknown as Record<string, unknown>
        )["transferControlToOffscreen"] === "function";
      const hasOffscreen =
        typeof (window as typeof window & { OffscreenCanvas?: unknown })
          .OffscreenCanvas !== "undefined";
      return hasTCTOS && hasOffscreen;
    } catch {
      return false;
    }
  }, [mounted]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!supported) {
    return (
      <div className="h-full w-full grid place-items-center p-8">
        <div className="max-w-md text-center space-y-3">
          <h2 className="text-base font-semibold">Unsupported Browser</h2>
          <p className="text-sm text-muted-foreground">
            This app requires OffscreenCanvas and transferControlToOffscreen for
            worker-based rendering. Please use a recent Chromium-based browser
            (Chrome, Edge, Arc) and ensure these features are enabled.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

export default WorkerSupportGate;
