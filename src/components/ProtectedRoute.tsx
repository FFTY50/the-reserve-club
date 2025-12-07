import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'customer' | 'staff' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userRole, isApproved, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin can access staff routes too
  if (requiredRole && userRole !== requiredRole) {
    // Allow admins to access staff routes
    if (requiredRole === 'staff' && userRole === 'admin') {
      // Allow access
    } else {
      const redirectPath = userRole === 'admin' ? '/admin/dashboard' : userRole === 'staff' ? '/staff/dashboard' : '/dashboard';
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check if staff/admin user is approved
  if ((requiredRole === 'staff' || requiredRole === 'admin') && (userRole === 'staff' || userRole === 'admin') && !isApproved) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-4">Account Pending Approval</h2>
          <p className="text-muted-foreground">
            Your account is awaiting admin approval. You'll be able to access the portal once your account has been approved.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
