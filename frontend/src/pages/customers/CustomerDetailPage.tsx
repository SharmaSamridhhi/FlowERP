import { CreateFollowUpSchema } from "@flowerp/shared";
import type { CreateFollowUpInput, CustomerStatus } from "@flowerp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addFollowUp, getCustomer } from "../../api/customers";
import { listChallans } from "../../api/sales-challans";
import { Badge, Button, Input, Textarea } from "../../components/atoms";
import { ArrowLeftIcon, ClockIcon, DocumentIcon } from "../../components/atoms/icons";
import { FormField, StatCard } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";
import { useToast } from "../../lib/toast-context";

const STATUS_BADGE_VARIANT: Record<CustomerStatus, "neutral" | "success" | "danger"> = {
  LEAD: "neutral",
  ACTIVE: "success",
  INACTIVE: "danger",
};

const CHALLAN_STATUS_VARIANT = {
  DRAFT: "neutral",
  CONFIRMED: "success",
  CANCELLED: "danger",
} as const;

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = canWrite(user?.role, "customers");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const customerQuery = useQuery({
    queryKey: ["customers", id],
    queryFn: () => getCustomer(id!),
  });

  // Total Sales / Open Orders tiles below reuse the challans list endpoint
  // (customerId + status filters, and the derived totalAmount field) rather
  // than a dedicated aggregate endpoint — fine at this data volume.
  const confirmedChallansQuery = useQuery({
    queryKey: ["challans", { customerId: id, status: "CONFIRMED", forTotals: true }],
    queryFn: () => listChallans({ page: 1, limit: 100, customerId: id!, status: "CONFIRMED" }),
    enabled: Boolean(id),
  });
  const openOrdersQuery = useQuery({
    queryKey: ["challans", { customerId: id, status: "DRAFT", forCount: true }],
    queryFn: () => listChallans({ page: 1, limit: 1, customerId: id!, status: "DRAFT" }),
    enabled: Boolean(id),
  });
  const recentChallansQuery = useQuery({
    queryKey: ["challans", { customerId: id, recent: true }],
    queryFn: () => listChallans({ page: 1, limit: 5, customerId: id! }),
    enabled: Boolean(id),
  });

  const totalSales =
    confirmedChallansQuery.data?.data.reduce((sum, challan) => sum + challan.totalAmount, 0) ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(CreateFollowUpSchema),
    defaultValues: { note: "", followUpDate: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateFollowUpInput) => addFollowUp(id!, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers", id] });
      showToast("success", "Follow-up added.");
      reset({ note: "", followUpDate: "" });
    },
    onError: (err) => {
      showToast("error", err instanceof ApiError ? err.message : "Could not add follow-up.");
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  if (customerQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading customer...</p>;
  }

  if (customerQuery.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {customerQuery.error instanceof ApiError
          ? customerQuery.error.message
          : "Could not load customer."}
      </p>
    );
  }

  const customer = customerQuery.data.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/customers")}
            aria-label="Back to customers"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900">
                {customer.businessName ?? customer.name}
              </h1>
              <Badge variant={STATUS_BADGE_VARIANT[customer.status]}>{customer.status}</Badge>
              <Badge variant="info">{customer.type}</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Customer ID: {customer.id} • Joined{" "}
              {new Date(customer.createdAt).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
            disabled={!canEdit}
            title={canEdit ? undefined : writeDeniedTitle("customers")}
          >
            Edit
          </Button>
          <Button onClick={() => navigate("/challans/new")}>Create Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-1 gap-6 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
            <DetailField label="Primary contact" value={customer.name} />
            <DetailField label="Mobile" value={customer.mobile} />
            <DetailField label="Email" value={customer.email} />
            <DetailField label="GST number" value={customer.gstNumber} />
            <DetailField label="Address" value={customer.address} />
            <DetailField
              label="Follow-up date"
              value={
                customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : null
              }
            />
            <DetailField label="Notes" value={customer.notes} />
          </dl>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Total Sales"
              value={
                confirmedChallansQuery.isPending
                  ? "—"
                  : `$${totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              }
            />
            <StatCard
              label="Open Orders"
              value={openOrdersQuery.data?.meta?.pagination?.total ?? "—"}
            />
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ClockIcon className="h-4 w-4 text-slate-400" />
              Follow-Up Timeline
            </h2>
          </div>

          <form onSubmit={(event) => void onSubmit(event)} className="mb-6 flex flex-col gap-3">
            <FormField label="Add a follow-up note" htmlFor="note" error={errors.note?.message}>
              <Textarea {...register("note")} placeholder="What happened?" />
            </FormField>
            <FormField
              label="Next follow-up date"
              htmlFor="followUpDate"
              hint="Optional — updates the customer's follow-up date above"
              error={errors.followUpDate?.message}
            >
              <Input type="date" {...register("followUpDate")} />
            </FormField>
            <div>
              <Button
                type="submit"
                isLoading={isSubmitting || mutation.isPending}
                disabled={!canEdit}
                title={canEdit ? undefined : writeDeniedTitle("customers")}
              >
                Add follow-up
              </Button>
            </div>
          </form>

          {customer.followUps.length === 0 ? (
            <p className="text-sm text-slate-500">No follow-ups recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {customer.followUps.map((followUp) => (
                <li key={followUp.id} className="border-brand-200 border-l-2 pl-3">
                  <p className="text-sm text-slate-700">{followUp.note}</p>
                  <p className="text-xs text-slate-400">
                    {followUp.authorName} · {new Date(followUp.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <DocumentIcon className="h-4 w-4 text-slate-400" />
            Sales Challans History
          </h2>
          <Link
            to={`/challans?customerId=${customer.id}`}
            className="text-brand-700 text-sm font-medium hover:underline"
          >
            View All Records
          </Link>
        </div>

        {recentChallansQuery.data?.data.length ? (
          <ul className="mb-4 divide-y divide-slate-100">
            {recentChallansQuery.data.data.map((challan) => (
              <li key={challan.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link
                  to={`/challans/${challan.id}`}
                  className="text-brand-700 font-medium hover:underline"
                >
                  {challan.challanNumber}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    ${challan.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <Badge variant={CHALLAN_STATUS_VARIANT[challan.status]}>{challan.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 rounded-md border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
            No sales challans recorded for this customer yet.
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-sm">
          <div>
            <p className="font-medium text-amber-600">Draft</p>
            <p className="text-xs text-slate-500">Created, not yet confirmed.</p>
          </div>
          <div>
            <p className="font-medium text-green-600">Confirmed</p>
            <p className="text-xs text-slate-500">Stock deducted and shipped.</p>
          </div>
          <div>
            <p className="font-medium text-red-600">Cancelled</p>
            <p className="text-xs text-slate-500">Order was cancelled.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CustomerDetailPage;
