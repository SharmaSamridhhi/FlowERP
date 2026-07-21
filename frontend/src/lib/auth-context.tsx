/* eslint-disable react-refresh/only-export-components -- context value +
   provider + hook are cohesive and small; splitting into three files
   purely for Fast Refresh's benefit isn't worth the fragmentation. */
import type { AuthUser, LoginResponse } from "@flowerp/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiRequest, configureAuthTokenGetter } from "./api-client";

export interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Token lives in memory only (a ref, not state — it doesn't need to
// trigger re-renders) rather than localStorage, to avoid a
// persistent, XSS-exfiltrable token. Tradeoff: a hard refresh loses the
// session. See specs/FLO-011-auth-rbac.md's Implementation Notes.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    configureAuthTokenGetter(() => tokenRef.current);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenRef.current = response.data.token;
    setUser(response.data.user);
  }, []);

  const logout = useCallback(() => {
    tokenRef.current = null;
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
