import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const { activeRole, roles, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Check if active role or any verified role is permitted
  const hasAccess = (activeRole && allowedRoles.includes(activeRole)) ||
    roles.some((r) => allowedRoles.includes(r));

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};
