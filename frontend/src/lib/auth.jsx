import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearSession, getToken, getUser, login as apiLogin } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? getUser() : null));

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('asakai:logout', onLogout);
    return () => window.removeEventListener('asakai:logout', onLogout);
  }, []);

  const value = {
    user,
    login: async (u, p) => {
      const usr = await apiLogin(u, p);
      setUser(usr);
      return usr;
    },
    logout: () => {
      clearSession();
      setUser(null);
    },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/" replace state={{ from: loc.pathname, login: true }} />;
  return children;
}
