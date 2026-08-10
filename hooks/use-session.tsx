import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

type Account = { email: string; password: string };

export type SignUpResult = { ok: true } | { ok: false; error: 'invalid-email' | 'weak-password' | 'duplicate' };
export type LogInResult = { ok: true } | { ok: false; error: 'not-found' | 'wrong-password' };

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

type SessionContextValue = {
  isLoggedIn: boolean;
  /** Set by logIn()/signup's later login(email) call. Stays null for the Kakao/Google mock buttons, which never pass one. */
  currentEmail: string | null;
  login: (email?: string) => void;
  logout: () => void;
  signUp: (email: string, password: string) => SignUpResult;
  logIn: (email: string, password: string) => LogInResult;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// In-memory only, same as use-intro.tsx / use-captured-photos.tsx — this
// project has no persistent storage module wired up yet, so registered
// accounts live for the current app session and reset on a full restart.
export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const login = useCallback((email?: string) => {
    setIsLoggedIn(true);
    setCurrentEmail(email ?? null);
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentEmail(null);
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
    () => ({ isLoggedIn, currentEmail, login, logout, signUp, logIn }),
    [isLoggedIn, currentEmail, login, logout, signUp, logIn],
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
