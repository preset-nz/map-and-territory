// The webview's way to change the document: commands by id, in order, through POM's channel
// (node-api decision 46). Reads go through the mirror (`@preset.nz/pom`'s hooks).
import type { Channel } from '@preset.nz/pom';
import { createContext, createElement, type ReactNode, useCallback, useContext } from 'react';

const ChannelContext = createContext<Channel | null>(null);

export function ChannelProvider(props: { channel: Channel; children?: ReactNode }) {
  return createElement(ChannelContext.Provider, { value: props.channel }, props.children);
}

export function useChannel(): Channel {
  const channel = useContext(ChannelContext);
  if (!channel) throw new Error('useChannel needs a <ChannelProvider channel={…}> above it');
  return channel;
}

/** Runs a document command. A refusal is logged; the document is unchanged by it. */
export function useRun(): (id: string, payload?: unknown) => void {
  const channel = useChannel();
  return useCallback(
    (id: string, payload: unknown = {}) => {
      channel.run(id, payload).catch((error) => console.error(`[document] ${id} refused`, error));
    },
    [channel],
  );
}
