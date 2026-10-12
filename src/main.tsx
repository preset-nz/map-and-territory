import { createMirror, PomProvider, tauriBackend } from '@preset.nz/pom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// The document lives in Rust; this is the webview's read-only copy of it, made once at launch
// and outside React, so StrictMode's double mount can't make a second one. App starts it.
const mirror = createMirror(tauriBackend, {
  onError: (error) => console.error('[document] re-read failed', error),
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PomProvider mirror={mirror}>
      <App />
    </PomProvider>
  </React.StrictMode>,
);
