import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { can, Action, Resource } from '../utils/permissions';

export const useCan = () => {
  const { user } = useAuth();
  return useCallback(
    (action: Action, resource: Resource) => can(user?.role, action, resource),
    [user]
  );
};
