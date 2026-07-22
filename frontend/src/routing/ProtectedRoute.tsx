import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "../components/atoms";
import { useAuth } from "../lib/auth-context";

export function ProtectedRoute() {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" label="Restoring session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
