import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { ROLES } from '../utils/constants';

interface GuestGuardProps {
  children: React.ReactNode;
}

const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (isAuthenticated && user) {
    const dashboardRoutes: Record<string, string> = {
      [ROLES.DIRECTEUR]: '/admin/dashboard',
      [ROLES.FORMATEUR]: '/formateur/dashboard',
      [ROLES.STAGIAIRE]: '/stagiaire/dashboard',
      [ROLES.SURVEILLANT]: '/surveillant/examens',
    };
    return <Navigate to={dashboardRoutes[user.role] || '/admin/dashboard'} replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
