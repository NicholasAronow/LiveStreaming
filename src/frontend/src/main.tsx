import React from 'react';
import ReactDOM from 'react-dom/client';
import { MentraAuthProvider } from '@mentra/react';
import App from './App';

/**
 * Application entry point that provides MentraOS authentication context
 * to the entire React component tree
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MentraAuthProvider>
      <App />
    </MentraAuthProvider>
  </React.StrictMode>
);
