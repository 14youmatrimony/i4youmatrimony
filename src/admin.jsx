import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import SuperAdminConsoleView from './components/admin/SuperAdminConsoleView';
import { ThemeProvider } from './context/ThemeContext';
import { PhotoPrivacyProvider } from './context/PhotoPrivacyContext';
import './index.css';

function AdminPortalApp() {
  return (
    <ThemeProvider>
      <PhotoPrivacyProvider>
        <SuperAdminConsoleView
          onSwitchToWebsite={() => { window.location.href = '/'; }}
          onSwitchToApp={() => { window.location.href = '/app'; }}
          onSwitchToAdmin={() => { window.location.href = '/admin'; }}
        />
      </PhotoPrivacyProvider>
    </ThemeProvider>
  );
}

const rootElement = document.getElementById('admin-root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <AdminPortalApp />
    </React.StrictMode>
  );
}
