import type {
  Customer,
  CustomerFollowUp,
  CustomerWithFollowUps,
  CreateCustomerInput,
  CreateFollowUpInput,
  ListCustomersQuery,
  SuccessEnvelope,
  UpdateCustomerInput,
} from "@flowerp/shared";
import { apiRequest } from "../lib/api-client";

export function listCustomers(query: ListCustomersQuery): Promise<SuccessEnvelope<Customer[]>> {
  return apiRequest<Customer[]>("/customers", { query });
}

export function getCustomer(id: string): Promise<SuccessEnvelope<CustomerWithFollowUps>> {
  return apiRequest<CustomerWithFollowUps>(`/customers/${id}`);
}

export function createCustomer(data: CreateCustomerInput): Promise<SuccessEnvelope<Customer>> {
  return apiRequest<Customer>("/customers", { method: "POST", body: data });
}

export function updateCustomer(
  id: string,
  data: UpdateCustomerInput,
): Promise<SuccessEnvelope<Customer>> {
  return apiRequest<Customer>(`/customers/${id}`, { method: "PATCH", body: data });
}

export function addFollowUp(
  customerId: string,
  data: CreateFollowUpInput,
): Promise<SuccessEnvelope<CustomerFollowUp>> {
  return apiRequest<CustomerFollowUp>(`/customers/${customerId}/follow-ups`, {
    method: "POST",
    body: data,
  });
}
