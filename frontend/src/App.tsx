import { useEffect, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { LogScreen } from "./components/LogScreen";
import { clearToken, getToken } from "./api/client";
import { getMe, type User } from "./api/auth";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-500">
        Loading…
      </div>
    );
  }

  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <h1 className="text-lg font-semibold">Gym Tracker</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">{user.email}</span>
          <button
            onClick={() => { clearToken(); setUser(null); }}
            className="text-neutral-400 hover:text-neutral-100"
          >
            Log out
          </button>
        </div>
      </header>
      <LogScreen user={user} />
    </div>
  );
}

export default App;