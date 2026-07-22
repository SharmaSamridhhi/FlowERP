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
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = "flowerp_token";
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(
    () => sessionStorage.getItem(TOKEN_STORAGE_KEY) !== null,
  );
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    configureAuthTokenGetter(() => tokenRef.current);
  }, []);

  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      return;
    }

    tokenRef.current = storedToken;
    apiRequest<AuthUser>("/auth/me")
      .then((response) => {
        setUser(response.data);
      })
      .catch(() => {
        tokenRef.current = null;
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenRef.current = response.data.token;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(() => {
    tokenRef.current = null;
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isInitializing, login, logout }),
    [user, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
