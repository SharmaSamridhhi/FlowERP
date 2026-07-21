import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "../../lib/api-client";

interface HealthStatus {
  status: string;
}

interface DemoItem {
  id: number;
  name: string;
}

// Dev-only reference implementation of the API client + TanStack Query +
// envelope loop, for Phase 3 list screens to model themselves on. Not
// reachable in a production build — see App.tsx's route registration.
// See specs/FLO-008-shared-contracts.md.
function ApiDemoPage() {
  const [search, setSearch] = useState("");

  const health = useQuery({
    queryKey: ["demo", "health"],
    queryFn: () => apiRequest<HealthStatus>("/health"),
  });

  const list = useQuery({
    queryKey: ["demo", "paginated-list", search],
    queryFn: () =>
      apiRequest<DemoItem[]>("/internal/validation-demo/paginated", {
        query: { limit: 5, search: search || undefined },
      }),
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">API client demo (dev only)</h1>

      <section className="mb-6 rounded-md bg-white p-4 shadow">
        <h2 className="mb-2 font-medium text-slate-700">Health check</h2>
        {health.isPending && <p>Loading...</p>}
        {health.isError && <p className="text-red-600">{health.error.message}</p>}
        {health.data && <p data-testid="health-status">Status: {health.data.data.status}</p>}
      </section>

      <section className="rounded-md bg-white p-4 shadow">
        <h2 className="mb-2 font-medium text-slate-700">Paginated demo list</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="mb-3 rounded border border-slate-300 px-2 py-1"
        />
        {list.isPending && <p>Loading...</p>}
        {list.isError && <p className="text-red-600">{list.error.message}</p>}
        {list.data && (
          <>
            <ul data-testid="demo-list">
              {list.data.data.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-slate-500">
              Page {list.data.meta?.pagination?.page} of {list.data.meta?.pagination?.totalPages} (
              {list.data.meta?.pagination?.total} total)
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default ApiDemoPage;
