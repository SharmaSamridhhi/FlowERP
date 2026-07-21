import { z } from "zod";
import { PaginationQuery } from "../http/pagination.js";

// Mirrors the Prisma `CustomerType`/`CustomerStatus` enums
// (backend/prisma/schema/customer.prisma). Kept in sync manually.
export const CustomerTypeSchema = z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]);
export type CustomerType = z.infer<typeof CustomerTypeSchema>;

export const CustomerStatusSchema = z.enum(["LEAD", "ACTIVE", "INACTIVE"]);
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;

// HTML inputs submit "" for an empty optional field, never `undefined` —
// treat "" as absent so it becomes NULL in Postgres, not a stored empty
// string, whether the request comes from the real form or a raw API call.
function optionalString(schema: z.ZodString = z.string()) {
  return z.preprocess((val) => (val === "" ? undefined : val), schema.optional());
}

const customerFields = {
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(1, "Mobile number is required"),
  email: optionalString(z.string().email("Enter a valid email")),
  businessName: optionalString(),
  gstNumber: optionalString(),
  type: CustomerTypeSchema,
  address: optionalString(),
  status: CustomerStatusSchema.default("LEAD"),
  followUpDate: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  notes: optionalString(),
};

export const CreateCustomerSchema = z.object(customerFields);
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z.object(customerFields).partial();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const ListCustomersQuerySchema = z.object({
  ...PaginationQuery.shape,
  search: z.string().optional(),
  type: CustomerTypeSchema.optional(),
  status: CustomerStatusSchema.optional(),
});
export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>;

export const CreateFollowUpSchema = z.object({
  note: z.string().min(1, "Note is required"),
  followUpDate: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
});
export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;

// --- Response shapes ---

export const CustomerFollowUpSchema = z.object({
  id: z.string(),
  note: z.string(),
  createdAt: z.string(),
  authorId: z.string(),
  authorName: z.string(),
});
export type CustomerFollowUp = z.infer<typeof CustomerFollowUpSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  mobile: z.string(),
  email: z.string().nullable(),
  businessName: z.string().nullable(),
  gstNumber: z.string().nullable(),
  type: CustomerTypeSchema,
  address: z.string().nullable(),
  status: CustomerStatusSchema,
  followUpDate: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const CustomerWithFollowUpsSchema = CustomerSchema.extend({
  followUps: z.array(CustomerFollowUpSchema),
});
export type CustomerWithFollowUps = z.infer<typeof CustomerWithFollowUpsSchema>;
