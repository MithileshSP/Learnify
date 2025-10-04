import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { clearAuthToken, setAuthToken } from "../api";

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = "learnonline.authToken";

const readStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.warn("Unable to access localStorage", err);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      clearAuthToken();
      setUser(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      setLoading(false);
      return;
    }

    setAuthToken(token);

    if (user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const profile = await api.getMe();
        if (!cancelled) {
          setUser(profile);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to bootstrap session", err);
          setError(err);
          setUser(null);
          setToken(null);
          clearAuthToken();
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const payload = await api.login(email, password);
      const { token: nextToken, user: authenticatedUser } = payload;

      setAuthToken(nextToken);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      }
      setToken(nextToken);
      setUser(authenticatedUser);
      setError(null);

      return authenticatedUser;
    } catch (err) {
      clearAuthToken();
      setToken(null);
      setUser(null);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setToken(null);
    setUser(null);
    setError(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, error, login, logout, setUser }),
    [token, user, loading, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
