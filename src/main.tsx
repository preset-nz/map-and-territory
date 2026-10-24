import { createChannel, createMirror, PomProvider, tauriBackend } from '@preset.nz/pom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ChannelProvider } from './app/document';
import { installFileFields } from './app/files';
import './index.css';

installFileFields();

// The document lives in Rust; this is the webview's read-only copy of it, made once at launch
// and outside React, so StrictMode's double mount can't make a second one. App starts it.
const mirror = createMirror(tauriBackend, {
  onError: (error) => console.error('[document] re-read failed', error),
});
// Commands reach Rust in the order they were made.
const channel = createChannel(tauriBackend);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PomProvider mirror={mirror}>
      <ChannelProvider channel={channel}>
        <App />
      </ChannelProvider>
    </PomProvider>
  </React.StrictMode>,
);
