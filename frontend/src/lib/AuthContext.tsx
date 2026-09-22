import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAccessToken as setApiAccessToken } from './api';
import * as authApi from './auth';

const ACCESS_TOKEN_KEY = 'gain_access_token';
const REFRESH_TOKEN_KEY = 'gain_refresh_token';

interface AuthContextValue {
  isAuthenticated: boolean;
  /** true while hydrating a stored token from localStorage on first load. */
  isLoading: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  setApiAccessToken(null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    setApiAccessToken(stored);
    setAccessTokenState(stored);
    authApi
      .getMe()
      .then((me) => setEmail(me.email))
      .catch(() => {
        // Stored token is expired/invalid — drop it silently, ProtectedRoute
        // will redirect to /login once isLoading flips to false.
        clearStoredSession();
        setAccessTokenState(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(loginEmail: string, password: string) {
    const res = await authApi.login(loginEmail, password);
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    setApiAccessToken(res.accessToken);
    setAccessTokenState(res.accessToken);
    const me = await authApi.getMe();
    setEmail(me.email);
  }

  function logout() {
    clearStoredSession();
    setAccessTokenState(null);
    setEmail(null);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!accessToken, isLoading, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
