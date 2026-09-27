import { useCallback, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../api/axiosClient';
import { tokenStorage } from '../api/tokenStorage';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore the session saved by a previous visit (expired tokens are discarded by tokenStorage).
  // localStorage is an external system, so syncing from it on mount is a legitimate effect; until it
  // runs, isLoading lets route guards show a loader instead of wrongly redirecting to /login.
  useEffect(() => {
    const session = tokenStorage.load();
    // oxlint-disable-next-line react/set-state-in-effect
    setUser(session?.user ?? null);
    setIsLoading(false);
  }, []);

  const login = useCallback((token, loggedInUser) => {
    tokenStorage.save(token, loggedInUser);
    setSessionExpired(false);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSessionExpired(false);
    setUser(null);
  }, []);

  // When an API call comes back 401 (expired/invalid token) the axios interceptor has already cleared
  // storage; dropping the in-memory user makes ProtectedRoute redirect to /login, where sessionExpired
  // explains why. (Navigating from here as well would race with that redirect.)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionExpired(true);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading, sessionExpired, login, logout }),
    [user, isLoading, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
