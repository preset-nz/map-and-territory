import { useCommands } from '@preset.nz/app-kit/core';
import { useMirror } from '@preset.nz/pom';
import { useEffect } from 'react';
import { CanvasHost } from './app/canvas-host';

export default function App() {
  // The command table arrives from Rust; this app binds none of its own yet.
  // The hook still follows the history and routes Cmd+Z inside text fields.
  useCommands({});

  // Connect, listen, then read the document. Starting twice is a no-op.
  const mirror = useMirror();
  useEffect(() => {
    mirror.start().catch((error) => console.error('[document] could not connect', error));
  }, [mirror]);

  return (
    <main className="h-screen bg-background text-foreground">
      <CanvasHost />
    </main>
  );
}
