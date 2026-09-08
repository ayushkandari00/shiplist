import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

const Auth = createContext(null);
const userFrom = (data) => data?.user || data;
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const refreshUser = useCallback(async () => { try { const current = userFrom(await authApi.me()); setUser(current); return current; } catch { setUser(null); return null; } finally { setLoading(false); } }, []);
  useEffect(() => { refreshUser(); }, [refreshUser]);
  return <Auth.Provider value={{ user, loading, refreshUser, login: async (payload) => { const current = userFrom(await authApi.login(payload)); setUser(current); return current; }, signup: async (payload) => authApi.signup(payload), logout: async () => { try { await authApi.logout(); } finally { setUser(null); } } }}>{children}</Auth.Provider>;
}
export const useAuth = () => useContext(Auth);
