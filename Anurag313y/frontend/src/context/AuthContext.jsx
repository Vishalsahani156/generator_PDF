import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUserQuery } from '../hooks/useAuthQueries';
import { queryKeys } from '../constants/queryKeys';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const { data: meData, isLoading: isLoadingUser } = useCurrentUserQuery(Boolean(token));

  useEffect(() => {
    if (meData?.success && meData?.data?.user) {
      setUser(meData.data.user);
    }
  }, [meData]);

  const login = useCallback(
    (nextToken, nextUser = null) => {
      localStorage.setItem('token', nextToken);
      setToken(nextToken);
      if (nextUser) {
        setUser(nextUser);
        queryClient.setQueryData(queryKeys.auth.me, {
          success: true,
          data: { user: nextUser },
        });
      }
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    queryClient.removeQueries();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoadingUser,
      login,
      logout,
      setUser,
    }),
    [user, token, isLoadingUser, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
