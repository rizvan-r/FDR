import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gov-bg">
        <div className="text-center p-8 bg-white border border-gov-border rounded shadow-gov max-w-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gov-navy mx-auto mb-4"></div>
          <p className="text-sm font-medium text-gov-navy">Verifying Institutional Credentials...</p>
          <p className="text-xs text-gov-muted mt-1">Establishing secure session handshake</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
