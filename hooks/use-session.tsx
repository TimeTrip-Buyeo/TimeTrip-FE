import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import * as authApi from '@/lib/api/auth';
import { setUnauthorizedListener } from '@/lib/api/client';
import { clearRemoteAlbumPhotoCache } from '@/lib/remote-album-cache';
import { clearTokens, getTokens, saveTokens } from '@/lib/token-storage';

type SessionContextValue = {
  isLoggedIn: boolean;
  /** False until the stored-token check on launch finishes. Gates the initial navigator render (see app/_layout.tsx). */
  isSessionReady: boolean;
  /** Set by login(email)'s optional argument. Stays null for a real Kakao/Google session. */
  currentEmail: string | null;
  login: (email?: string) => void;
  logout: () => Promise<void>;
  /**
   * Calls DELETE /users then clears local session state the same way logout() does.
   * Only clears on success — a failed call leaves the session intact so the caller
   * can show an error instead of silently logging the user out. Throws
   * SessionExpiredError instead of the raw error if the session was already torn
   * down by the unauthorizedListener (e.g. an expired refresh token) before the
   * delete could complete — the account was NOT deleted in that case.
   */
  withdraw: () => Promise<void>;
  /** Exchanges a provider (Kakao) accessToken for our own tokens and stores them. Does NOT flip isLoggedIn — the caller still routes through onboarding-guide's login() first. */
  loginWithKakao: (providerAccessToken: string) => Promise<void>;
  /** Exchanges a Google idToken for our own tokens and stores them. */
  loginWithGoogle: (providerIdToken: string) => Promise<void>;
};

/** Thrown by withdraw() when the session was already cleared (expired tokens) before the delete request could go through — the account was NOT deleted. */
export class SessionExpiredError extends Error {}

const SessionContext = createContext<SessionContextValue | null>(null);

// isLoggedIn is backed by expo-secure-store: real Kakao/Google sessions
// survive an app restart (see the bootstrap effect below).
export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const tokens = await getTokens();
      if (tokens) setIsLoggedIn(true);
      setIsSessionReady(true);
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedListener(() => {
      clearRemoteAlbumPhotoCache();
      setIsLoggedIn(false);
      setCurrentEmail(null);
    });
    return () => setUnauthorizedListener(null);
  }, []);

  const login = useCallback((email?: string) => {
    setIsLoggedIn(true);
    setCurrentEmail(email ?? null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort: still clear local state even if the network call fails.
    }
    await clearTokens();
    clearRemoteAlbumPhotoCache();
    setIsLoggedIn(false);
    setCurrentEmail(null);
  }, []);

  const withdraw = useCallback(async () => {
    try {
      await authApi.deleteAccount();
    } catch (error) {
      // If the unauthorizedListener already fired (expired/invalid tokens),
      // getTokens() comes back empty — the session is gone but the account
      // was never actually deleted.
      if (!(await getTokens())) throw new SessionExpiredError();
      throw error;
    }
    await clearTokens();
    clearRemoteAlbumPhotoCache();
    setIsLoggedIn(false);
    setCurrentEmail(null);
  }, []);

  const loginWithKakao = useCallback(async (providerAccessToken: string) => {
    const tokens = await authApi.loginWithKakao(providerAccessToken);
    await saveTokens(tokens);
  }, []);

  const loginWithGoogle = useCallback(async (providerIdToken: string) => {
    const tokens = await authApi.loginWithGoogle(providerIdToken);
    await saveTokens(tokens);
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
      isSessionReady,
      currentEmail,
      login,
      logout,
      withdraw,
      loginWithKakao,
      loginWithGoogle,
    }),
    [isLoggedIn, isSessionReady, currentEmail, login, logout, withdraw, loginWithKakao, loginWithGoogle],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return value;
}
