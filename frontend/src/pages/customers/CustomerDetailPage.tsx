import { CreateFollowUpSchema } from "@flowerp/shared";
import type { CreateFollowUpInput, CustomerStatus } from "@flowerp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { addFollowUp, getCustomer } from "../../api/customers";
import { Badge, Button, Input, Textarea } from "../../components/atoms";
import { FormField } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { canWrite, writeDeniedTitle } from "../../lib/permissions";
import { useToast } from "../../lib/toast-context";

const STATUS_BADGE_VARIANT: Record<CustomerStatus, "neutral" | "success" | "danger"> = {
  LEAD: "neutral",
  ACTIVE: "success",
  INACTIVE: "danger",
};

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
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{customer.name}</h1>
          {customer.businessName && (
            <p className="text-sm text-slate-500">{customer.businessName}</p>
          )}
        </div>
        <Button
          onClick={() => navigate(`/customers/${customer.id}/edit`)}
          disabled={!canEdit}
          title={canEdit ? undefined : writeDeniedTitle("customers")}
        >
          Edit
        </Button>
      </div>

      <dl className="grid grid-cols-1 gap-6 rounded-md bg-white p-6 shadow sm:grid-cols-2">
        <DetailField label="Mobile" value={customer.mobile} />
        <DetailField label="Email" value={customer.email} />
        <DetailField label="GST number" value={customer.gstNumber} />
        <DetailField label="Address" value={customer.address} />
        <DetailField label="Type" value={<Badge variant="info">{customer.type}</Badge>} />
        <DetailField
          label="Status"
          value={<Badge variant={STATUS_BADGE_VARIANT[customer.status]}>{customer.status}</Badge>}
        />
        <DetailField
          label="Follow-up date"
          value={
            customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : null
          }
        />
        <DetailField label="Notes" value={customer.notes} />
      </dl>

      <section className="rounded-md bg-white p-6 shadow">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Follow-up history</h2>

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
          <p className="text-sm text-slate-500">No follow-ups yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {customer.followUps.map((followUp) => (
              <li key={followUp.id} className="border-l-2 border-slate-200 pl-3">
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
  );
}

export default CustomerDetailPage;
