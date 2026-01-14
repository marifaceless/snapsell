
import React, { useState, useEffect } from 'react';
import { KeyOnboarding } from './components/KeyOnboarding';
import { Studio } from './components/Studio';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('snap_sell_pk');
    if (savedKey) {
      setApiKey(savedKey);
    }
    setIsLoaded(true);
  }, []);

  const handleKeySaved = (key: string) => {
    setApiKey(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('snap_sell_pk');
    setApiKey(null);
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen">
      {!apiKey ? (
        <KeyOnboarding onKeySaved={handleKeySaved} />
      ) : (
        <Studio apiKey={apiKey} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
