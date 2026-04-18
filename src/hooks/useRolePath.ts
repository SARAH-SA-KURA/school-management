import { useAuth } from './useAuth';

export const useRolePath = (): string => {
  const { user } = useAuth();
  if (user?.role === 'surveillant') return '/surveillant';
  if (user?.role === 'formateur') return '/formateur';
  if (user?.role === 'stagiaire') return '/stagiaire';
  return '/admin';
};
