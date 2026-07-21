import { CreateCustomerSchema } from "@flowerp/shared";
import type { CreateCustomerInput } from "@flowerp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, updateCustomer } from "../../api/customers";
import { Button, Input, Select, Textarea } from "../../components/atoms";
import { FormField } from "../../components/molecules";
import { ApiError } from "../../lib/api-client";
import { useToast } from "../../lib/toast-context";

const TYPE_OPTIONS = [
  { value: "RETAIL", label: "Retail" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "DISTRIBUTOR", label: "Distributor" },
];

const STATUS_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

// Dates round-trip through <input type="date"> as "YYYY-MM-DD" strings,
// which CreateCustomerSchema's z.coerce.date() accepts directly.
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const existingCustomerQuery = useQuery({
    queryKey: ["customers", id],
    queryFn: () => getCustomer(id!),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      businessName: "",
      gstNumber: "",
      type: "RETAIL" as const,
      address: "",
      status: "LEAD" as const,
      followUpDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    const customer = existingCustomerQuery.data?.data;
    if (!customer) {
      return;
    }
    reset({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email ?? "",
      businessName: customer.businessName ?? "",
      gstNumber: customer.gstNumber ?? "",
      type: customer.type,
      address: customer.address ?? "",
      status: customer.status,
      followUpDate: toDateInputValue(customer.followUpDate),
      notes: customer.notes ?? "",
    });
  }, [existingCustomerQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateCustomerInput) =>
      isEditing ? updateCustomer(id!, data) : createCustomer(data),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      showToast(
        "success",
        isEditing ? "Customer updated successfully." : "Customer created successfully.",
      );
      navigate(`/customers/${response.data.id}`);
    },
    onError: (err) => {
      setServerError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    mutation.mutate(data);
  });

  if (isEditing && existingCustomerQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading customer...</p>;
  }

  return (
    <div className="max-w-2xl rounded-md bg-white p-6 shadow">
      <h1 className="mb-6 text-lg font-semibold text-slate-900">
        {isEditing ? "Edit Customer" : "Add Customer"}
      </h1>

      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>

        <FormField label="Mobile" htmlFor="mobile" required error={errors.mobile?.message}>
          <Input {...register("mobile")} />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </FormField>

        <FormField label="Business name" htmlFor="businessName">
          <Input {...register("businessName")} />
        </FormField>

        <FormField label="GST number" htmlFor="gstNumber" hint="Optional">
          <Input {...register("gstNumber")} />
        </FormField>

        <FormField label="Type" htmlFor="type" required error={errors.type?.message}>
          <Select options={TYPE_OPTIONS} {...register("type")} />
        </FormField>

        <FormField label="Address" htmlFor="address">
          <Textarea {...register("address")} />
        </FormField>

        <FormField label="Status" htmlFor="status" error={errors.status?.message}>
          <Select options={STATUS_OPTIONS} {...register("status")} />
        </FormField>

        <FormField
          label="Follow-up date"
          htmlFor="followUpDate"
          error={errors.followUpDate?.message}
        >
          <Input type="date" {...register("followUpDate")} />
        </FormField>

        <FormField label="Notes" htmlFor="notes">
          <Textarea {...register("notes")} />
        </FormField>

        {serverError && (
          <p role="alert" className="text-sm text-red-600">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting || mutation.isPending}>
            {isEditing ? "Save changes" : "Create customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CustomerFormPage;
