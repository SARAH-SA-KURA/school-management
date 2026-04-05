import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout as logoutAction, fetchCurrentUser } from '../features/auth/authSlice';
import { UserRole } from '../types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, loading } = useAppSelector((state) => state.auth);

  const logoutUser = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  const refreshUser = useCallback(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user) return false;
      if (Array.isArray(role)) return role.includes(user.role);
      return user.role === role;
    },
    [user]
  );

  return {
    user,
    token,
    isAuthenticated,
    loading,
    logout: logoutUser,
    refreshUser,
    hasRole,
  };
};
