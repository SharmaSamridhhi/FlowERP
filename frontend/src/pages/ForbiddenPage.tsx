import type { Role } from "@flowerp/shared";
import { Link } from "react-router-dom";
import { describeRoles } from "../lib/permissions";

function ForbiddenPage({ allowedRoles }: { allowedRoles?: readonly Role[] }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md bg-white p-8 shadow">
      <h1 className="text-lg font-semibold text-slate-900">You don't have access to this page</h1>
      <p role="alert" className="text-sm text-slate-500">
        {allowedRoles && allowedRoles.length > 0
          ? `Only ${describeRoles(allowedRoles)} can do this.`
          : "Your role doesn't have permission to view this page."}
      </p>
      <Link to="/" className="text-brand-700 text-sm font-medium hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}

export default ForbiddenPage;
