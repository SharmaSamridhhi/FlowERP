import type { Role } from "@flowerp/shared";
import { Outlet } from "react-router-dom";
import ForbiddenPage from "../pages/ForbiddenPage";
import { useAuth } from "../lib/auth-context";

export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { user } = useAuth();
  const allowed = user !== null && roles.includes(user.role);

  if (!allowed) {
    return <ForbiddenPage allowedRoles={roles} />;
  }

  return <Outlet />;
}
