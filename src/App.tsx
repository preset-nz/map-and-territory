import { useCommands } from '@preset.nz/app-kit/core';

export default function App() {
  // The command table arrives from Rust; this app binds none of its own yet.
  // The hook still follows the history and routes Cmd+Z inside text fields.
  useCommands({});

  return <main className="h-screen bg-background text-foreground" />;
}
