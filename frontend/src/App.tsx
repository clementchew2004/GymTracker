import { useEffect, useState } from "react";
import { Route, Routes } from "react-router";
import { AuthScreen } from "./components/AuthScreen";
import { BottomNav, HeaderNav } from "./components/Nav";
import { LogScreen } from "./components/LogScreen";
import { ProgressScreen } from "./components/ProgressScreen";
import { WeeklySummaryScreen } from "./components/WeeklySummaryScreen";
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
      {/* No flex-wrap: on mobile the nav has moved to the bottom bar, so the
          title, email and log-out button fit one row without crowding. */}
      <header className="flex items-center gap-x-4 border-b border-neutral-800 px-4 py-3 sm:gap-x-6 sm:px-6 sm:py-4">
        <h1 className="shrink-0 text-base font-semibold sm:text-lg">Gym Tracker</h1>

        <HeaderNav />

        {/* min-w-0 lets a long email truncate instead of pushing Log out off-screen. */}
        <div className="ml-auto flex min-w-0 items-center gap-3 text-sm sm:gap-4">
          <span className="truncate text-neutral-500">{user.email}</span>
          <button
            onClick={() => { clearToken(); setUser(null); }}
            className="shrink-0 text-neutral-400 hover:text-neutral-100"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Clears the fixed bottom bar so the last row of content stays reachable. */}
      <div style={{ paddingBottom: "var(--bottom-nav-h)" }}>
        <Routes>
          <Route path="/" element={<LogScreen user={user} />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/summary" element={<WeeklySummaryScreen user={user} />} />
        </Routes>
      </div>

      <BottomNav />
    </div>
  );
}

export default App;
