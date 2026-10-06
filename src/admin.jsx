import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AdminConsoleView from './components/admin/AdminConsoleView';
import { ThemeProvider } from './context/ThemeContext';
import { PhotoPrivacyProvider } from './context/PhotoPrivacyContext';
import { fetchLiveProfiles } from './services/api';
import { INITIAL_PROFILES } from './data/mockProfiles';
import { MEMBERSHIP_PLANS } from './data/plansData';
import './index.css';

function AdminPortalApp() {
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);

  useEffect(() => {
    let isMounted = true;
    fetchLiveProfiles().then(liveData => {
      if (isMounted && liveData && liveData.length > 0) {
        setProfiles(liveData);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  return (
    <ThemeProvider>
      <PhotoPrivacyProvider>
        <AdminConsoleView
          profiles={profiles}
          setProfiles={setProfiles}
          membershipPlans={MEMBERSHIP_PLANS}
          onSwitchToWebsite={() => { window.location.href = '/'; }}
          onSwitchToApp={() => { window.location.href = '/app'; }}
          isProduction={true}
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
