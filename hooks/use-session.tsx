import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import * as authApi from '@/lib/api/auth';
import { setUnauthorizedListener } from '@/lib/api/client';
import { clearTokens, getTokens, saveTokens } from '@/lib/token-storage';

type Account = { email: string; password: string };

export type SignUpResult = { ok: true } | { ok: false; error: 'invalid-email' | 'weak-password' | 'duplicate' };
export type LogInResult = { ok: true } | { ok: false; error: 'not-found' | 'wrong-password' };

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

type SessionContextValue = {
  isLoggedIn: boolean;
  /** False until the stored-token check on launch finishes. Gates the initial navigator render (see app/_layout.tsx). */
  isSessionReady: boolean;
  /** Set by logIn()/signup's later login(email) call. Stays null for a real Kakao/Google session. */
  currentEmail: string | null;
  login: (email?: string) => void;
  logout: () => Promise<void>;
  /** Exchanges a provider (Kakao) accessToken for our own tokens and stores them. Does NOT flip isLoggedIn — the caller still routes through onboarding-guide's login() first, same as the email/signup flow. */
  loginWithKakao: (providerAccessToken: string) => Promise<void>;
  /** Same as loginWithKakao but for Google. */
  loginWithGoogle: (providerAccessToken: string) => Promise<void>;
  signUp: (email: string, password: string) => SignUpResult;
  logIn: (email: string, password: string) => LogInResult;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// Registered mock accounts (signUp/logIn) are in-memory only, same as
// use-intro.tsx / use-captured-photos.tsx, and reset on a full restart.
// isLoggedIn itself is now backed by expo-secure-store: real Kakao/Google
// sessions survive an app restart (see the bootstrap effect below).
export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    (async () => {
      const tokens = await getTokens();
      if (tokens) setIsLoggedIn(true);
      setIsSessionReady(true);
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedListener(() => {
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
    setIsLoggedIn(false);
    setCurrentEmail(null);
  }, []);

  const loginWithKakao = useCallback(async (providerAccessToken: string) => {
    const tokens = await authApi.loginWithKakao(providerAccessToken);
    await saveTokens(tokens);
  }, []);

  const loginWithGoogle = useCallback(async (providerAccessToken: string) => {
    const tokens = await authApi.loginWithGoogle(providerAccessToken);
    await saveTokens(tokens);
  }, []);

  const signUp = useCallback(
    (email: string, password: string): SignUpResult => {
      if (!EMAIL_PATTERN.test(email)) return { ok: false, error: 'invalid-email' };
      if (password.length < 6) return { ok: false, error: 'weak-password' };
      if (accounts.some((account) => account.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, error: 'duplicate' };
      }
      setAccounts((prev) => [...prev, { email, password }]);
      return { ok: true };
    },
    [accounts],
  );

  const logIn = useCallback(
    (email: string, password: string): LogInResult => {
      const account = accounts.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
      if (!account) return { ok: false, error: 'not-found' };
      if (account.password !== password) return { ok: false, error: 'wrong-password' };
      login(account.email);
      return { ok: true };
    },
    [accounts, login],
  );

  const value = useMemo(
    () => ({
      isLoggedIn,
      isSessionReady,
      currentEmail,
      login,
      logout,
      loginWithKakao,
      loginWithGoogle,
      signUp,
      logIn,
    }),
    [isLoggedIn, isSessionReady, currentEmail, login, logout, loginWithKakao, loginWithGoogle, signUp, logIn],
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
