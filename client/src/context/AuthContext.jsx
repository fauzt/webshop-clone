import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAccessToken, setOnAuthFailure } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // isLoading covers the brief window on first page load where we're
  // attempting a silent refresh to find out if there's already a valid
  // session (via the httpOnly cookie) before we know whether to show
  // logged-in or logged-out UI.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If a refresh fails anywhere in the app (interceptor in client.js),
    // treat it the same as an explicit logout on the frontend.
    setOnAuthFailure(() => setUser(null));

    // Stay logged in after a page refresh.
    // On first load, the access token is gone,
    // but the refresh cookie may still be valid.
    async function restoreSession() {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        // No valid refresh cookie. Logout.
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function register(email, password) {
    const { data } = await api.post('/auth/register', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook so components do `const { user } = useAuth()` instead of
// importing useContext + AuthContext separately everywhere.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
