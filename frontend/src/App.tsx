import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router";
import { AuthScreen } from "./components/AuthScreen";
import { LogScreen } from "./components/LogScreen";
import { ProgressScreen } from "./components/ProgressScreen";
import { WeeklySummaryScreen } from "./components/WeeklySummaryScreen";
import { clearToken, getToken } from "./api/client";
import { getMe, type User } from "./api/auth";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded px-3 py-1.5 text-sm transition-colors",
    isActive
      ? "bg-neutral-800 text-neutral-100"
      : "text-neutral-400 hover:text-neutral-100",
  ].join(" ");

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
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 border-b border-neutral-800">
        <h1 className="text-lg font-semibold">Gym Tracker</h1>

        <nav className="flex gap-1">
          <NavLink to="/" end className={tabClass}>Log</NavLink>
          <NavLink to="/progress" className={tabClass}>Progress</NavLink>
          <NavLink to="/summary" className={tabClass}>Summary</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-neutral-500">{user.email}</span>
          <button
            onClick={() => { clearToken(); setUser(null); }}
            className="text-neutral-400 hover:text-neutral-100"
          >
            Log out
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<LogScreen user={user} />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/summary" element={<WeeklySummaryScreen user={user} />} />
      </Routes>
    </div>
  );
}

export default App;