"use client";

import { useEffect } from "react";
import bootstrapPlugins from "@/plugin/bootstrap";

export default function PluginProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cancelled = false;
    bootstrapPlugins().catch((e) => {
      if (!cancelled) console.error("[plugin] bootstrap failed:", e);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return <>{children}</>;
}
