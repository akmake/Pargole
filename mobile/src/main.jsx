import React from 'react';
import ReactDOM from 'react-dom/client';
// HashRouter (not BrowserRouter): inside the Capacitor native WebView there is no
// web server to resolve deep paths like /project/123, so hash-based routing
// (/#/project/123) is required for navigation and reloads to work reliably.
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';
import { initNativeApp } from './native/appNative.js';

// Native shell setup (status bar, back button, keyboard, splash) — no-op on web.
initNativeApp();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
      <Toaster position="top-center" />
    </HashRouter>
  </React.StrictMode>,
);
