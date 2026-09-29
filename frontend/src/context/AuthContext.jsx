import { useCallback, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../api/axiosClient';
import { tokenStorage } from '../api/tokenStorage';
import { AuthContext } from './auth-context';

const SESSION_EXPIRED_NOTICE = 'Your session has expired. Please sign in again.';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Why the last session ended involuntarily; shown on the login page. null after a normal login/logout.
  const [sessionNotice, setSessionNotice] = useState(null);

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
    setSessionNotice(null);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSessionNotice(null);
    setUser(null);
  }, []);

  /**
   * Ends the session because it is no longer valid. Dropping the user makes ProtectedRoute redirect to
   * /login, where the notice explains why. (Navigating from here as well would race with that redirect.)
   */
  const expireSession = useCallback((notice = SESSION_EXPIRED_NOTICE) => {
    tokenStorage.clear();
    setSessionNotice(notice);
    setUser(null);
  }, []);

  // Any 401 from a protected endpoint (expired/invalid token) ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => expireSession());
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading, sessionNotice, login, logout, expireSession }),
    [user, isLoading, sessionNotice, login, logout, expireSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
