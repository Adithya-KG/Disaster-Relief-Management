import { useMemo, useState } from 'react';
import Shell from './components/Shell.jsx';
import Login from './screens/Login.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Camps from './screens/Camps.jsx';
import Inventory from './screens/Inventory.jsx';
import Volunteers from './screens/Volunteers.jsx';
import Requests from './screens/Requests.jsx';

const SESSION_KEY = 'reliefops-session';

function getInitialSession() {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(getInitialSession);
  const [activeScreen, setActiveScreen] = useState('dashboard');

  const user = session?.user;

  const screen = useMemo(() => {
    if (!user) {
      return null;
    }

    if (activeScreen === 'volunteers' && user.role !== 'dispatcher') {
      return <Dashboard user={user} />;
    }

    const screens = {
      dashboard: <Dashboard user={user} />,
      camps: <Camps user={user} />,
      inventory: <Inventory user={user} />,
      volunteers: <Volunteers />,
      requests: <Requests user={user} />,
    };

    return screens[activeScreen] || screens.dashboard;
  }, [activeScreen, user]);

  function handleLogin(nextSession) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setActiveScreen('dashboard');
  }

  function handleLogout() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setActiveScreen('dashboard');
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Shell
      user={user}
      activeScreen={activeScreen}
      onNavigate={setActiveScreen}
      onLogout={handleLogout}
    >
      {screen}
    </Shell>
  );
}
