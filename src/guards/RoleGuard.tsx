import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { UserRole } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, roles }) => {
  const { user } = useAppSelector((state) => state.auth);

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
