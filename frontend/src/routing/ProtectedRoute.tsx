import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

// Gate for every authenticated route, mounted as a layout route via
// react-router's nested-route pattern (see App.tsx). Redirects to /login
// while preserving the originally-requested location so LoginPage can
// send the user back after a successful login.
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
