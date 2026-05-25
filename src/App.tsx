import { useState } from 'react';
import { SetupSupabase } from './pages/SetupSupabase';
import { SetupCertificate } from './pages/SetupCertificate';
import { Dashboard } from './pages/Dashboard';

function App() {
  const [isDbConfigured, setIsDbConfigured] = useState(false);
  const [isCertConfigured, setIsCertConfigured] = useState(false);

  if (!isDbConfigured) {
    return <SetupSupabase onComplete={() => setIsDbConfigured(true)} />;
  }

  if (!isCertConfigured) {
    return <SetupCertificate onComplete={() => setIsCertConfigured(true)} />;
  }

  return <Dashboard />;
}

export default App;
