import type {
  Customer,
  CustomerFollowUp,
  CustomerWithFollowUps,
  CreateCustomerInput,
  CreateFollowUpInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "@flowerp/shared";
import type { Prisma, Customer as PrismaCustomer } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../utils/errors.js";

// Explicit allow-list, not a spread: `customer` also carries createdById,
// which isn't part of the public Customer contract (same reasoning as
// never spreading a User row — see FLO-011). JSON transports dates as ISO
// strings, not Date instances, so those are serialized explicitly here
// too rather than trusting res.json()'s implicit stringification to
// happen to line up with the declared type.
function toCustomerResponse(customer: PrismaCustomer): Customer {
  return {
    id: customer.id,
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email,
    businessName: customer.businessName,
    gstNumber: customer.gstNumber,
    type: customer.type,
    address: customer.address,
    status: customer.status,
    followUpDate: customer.followUpDate?.toISOString() ?? null,
    notes: customer.notes,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export async function createCustomer(
  data: CreateCustomerInput,
  createdById: string,
): Promise<Customer> {
  const customer = await prisma.customer.create({ data: { ...data, createdById } });
  return toCustomerResponse(customer);
}

export async function listCustomers(
  query: ListCustomersQuery,
): Promise<{ items: Customer[]; total: number }> {
  const { page, limit, search, type, status, overdue } = query;

  const where: Prisma.CustomerWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { businessName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(overdue ? { followUpDate: { lt: new Date() } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return { items: items.map(toCustomerResponse), total };
}

export async function findCustomerById(id: string): Promise<CustomerWithFollowUps> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const { followUps, ...customerFields } = customer;

  return {
    ...toCustomerResponse(customerFields),
    followUps: followUps.map((followUp) => ({
      id: followUp.id,
      note: followUp.note,
      createdAt: followUp.createdAt.toISOString(),
      authorId: followUp.authorId,
      authorName: followUp.author.name,
    })),
  };
}

export async function updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer> {
  await ensureCustomerExists(id);
  const customer = await prisma.customer.update({ where: { id }, data });
  return toCustomerResponse(customer);
}

export async function addFollowUp(
  customerId: string,
  data: CreateFollowUpInput,
  authorId: string,
): Promise<CustomerFollowUp> {
  await ensureCustomerExists(customerId);

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.customerFollowUp.create({
      data: { note: data.note, customerId, authorId },
      include: { author: { select: { name: true } } },
    });

    if (data.followUpDate) {
      await tx.customer.update({
        where: { id: customerId },
        data: { followUpDate: data.followUpDate },
      });
    }

    return {
      id: followUp.id,
      note: followUp.note,
      createdAt: followUp.createdAt.toISOString(),
      authorId: followUp.authorId,
      authorName: followUp.author.name,
    };
  });
}

async function ensureCustomerExists(id: string): Promise<void> {
  const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    throw new NotFoundError("Customer not found");
  }
}
