// One-off production "make it look alive" seed — realistic demo customers,
// products, purchase orders, and sales challans, built entirely through the
// real service layer so stock ledgers, document numbering, and status
// transitions stay exactly as consistent as if a real user had clicked
// through the UI. Not part of the normal deploy path; run manually once.
//
// Confirmed challans' createdAt is backdated afterward (raw SQL) purely for
// a more realistic-looking dashboard sales trend — this does not change any
// quantity or stock value, only the "when" for display purposes.

import { prisma } from "../src/lib/prisma.js";
import { createProduct } from "../src/services/product.service.js";
import { createCustomer, addFollowUp } from "../src/services/customer.service.js";
import {
  createPurchaseOrder,
  receivePurchaseOrder,
} from "../src/services/purchase-order.service.js";
import {
  createChallan,
  confirmChallan,
  cancelChallan,
} from "../src/services/sales-challan.service.js";

async function main(): Promise<void> {
  const warehouse = await prisma.user.findUniqueOrThrow({
    where: { email: "warehouse@flowerp.test" },
  });
  const sales = await prisma.user.findUniqueOrThrow({ where: { email: "sales@flowerp.test" } });

  console.log("Seeding products...");
  const productDefs = [
    {
      name: "Copper Fittings XL-40",
      sku: "IND-4022",
      category: "Hardware",
      unitPrice: 42.5,
      minStockAlertQuantity: 50,
    },
    {
      name: "Poly-Storage Bin 20L",
      sku: "WH-BIN-20",
      category: "Packaging",
      unitPrice: 8.75,
      minStockAlertQuantity: 100,
    },
    {
      name: "Steel Fastener Set",
      sku: "MT-FAST-9",
      category: "Hardware",
      unitPrice: 5.2,
      minStockAlertQuantity: 200,
    },
    {
      name: "PVC Conduit Pipe 2m",
      sku: "ELE-PVC-2M",
      category: "Electrical",
      unitPrice: 12.0,
      minStockAlertQuantity: 80,
    },
    {
      name: "Industrial Cable Ties (500pk)",
      sku: "ELE-CT-500",
      category: "Electrical",
      unitPrice: 15.4,
      minStockAlertQuantity: 40,
    },
    {
      name: "Corrugated Shipping Box M",
      sku: "PKG-BOX-M",
      category: "Packaging",
      unitPrice: 1.8,
      minStockAlertQuantity: 300,
    },
    {
      name: "Brass Ball Valve 1in",
      sku: "PLM-VALVE-1",
      category: "Plumbing",
      unitPrice: 22.3,
      minStockAlertQuantity: 30,
    },
    {
      name: "PTFE Thread Tape",
      sku: "PLM-TAPE-12",
      category: "Plumbing",
      unitPrice: 2.1,
      minStockAlertQuantity: 150,
    },
    {
      name: "Galvanized Angle Bracket",
      sku: "HRD-BRKT-3",
      category: "Hardware",
      unitPrice: 3.6,
      minStockAlertQuantity: 120,
    },
    {
      name: "LED Strip Light 5m",
      sku: "ELE-LED-5M",
      category: "Electrical",
      unitPrice: 18.9,
      minStockAlertQuantity: 25,
    },
  ];
  const products = [];
  for (const def of productDefs) {
    products.push(await createProduct(def));
  }

  console.log("Seeding purchase orders (received, to establish stock)...");
  const suppliers = [
    "Metro Wholesale Supply Co.",
    "BuildRight Distributors",
    "Apex Industrial Traders",
  ];
  const poBatches = [
    {
      supplier: suppliers[0],
      items: [0, 1, 2, 5].map((i) => ({
        productId: products[i].id,
        unitCost: products[i].unitPrice * 0.6,
        quantity: 400,
      })),
    },
    {
      supplier: suppliers[1],
      items: [3, 4, 8].map((i) => ({
        productId: products[i].id,
        unitCost: products[i].unitPrice * 0.6,
        quantity: 150,
      })),
    },
    {
      supplier: suppliers[2],
      items: [6, 7, 9].map((i) => ({
        productId: products[i].id,
        unitCost: products[i].unitPrice * 0.6,
        quantity: 60,
      })),
    },
  ];
  for (const batch of poBatches) {
    const po = await createPurchaseOrder(
      { supplierName: batch.supplier, items: batch.items },
      warehouse.id,
    );
    await receivePurchaseOrder(po.id, warehouse.id);
  }
  // One extra draft PO left un-received, so Purchase Orders isn't 100% RECEIVED.
  await createPurchaseOrder(
    {
      supplierName: "Metro Wholesale Supply Co.",
      items: [{ productId: products[9].id, unitCost: products[9].unitPrice * 0.6, quantity: 40 }],
    },
    warehouse.id,
  );

  console.log("Seeding customers...");
  const customerDefs = [
    {
      name: "Rajesh Traders",
      mobile: "9820011223",
      businessName: "Rajesh Traders Pvt Ltd",
      type: "WHOLESALE" as const,
      status: "ACTIVE" as const,
      email: "rajesh.traders@example.com",
      address: "12 Market Rd, Pune",
    },
    {
      name: "Priya Enterprises",
      mobile: "9820033445",
      businessName: "Priya Enterprises",
      type: "DISTRIBUTOR" as const,
      status: "ACTIVE" as const,
      email: "priya.ent@example.com",
      address: "45 Industrial Estate, Nashik",
    },
    {
      name: "Kumar Hardware Store",
      mobile: "9820055667",
      businessName: "Kumar Hardware",
      type: "RETAIL" as const,
      status: "ACTIVE" as const,
      address: "Shop 4, Station Road, Thane",
    },
    {
      name: "Sunrise Distributors",
      mobile: "9820077889",
      businessName: "Sunrise Distributors LLP",
      type: "DISTRIBUTOR" as const,
      status: "ACTIVE" as const,
      email: "accounts@sunrise-dist.example.com",
    },
    {
      name: "Anita Verma",
      mobile: "9820099001",
      type: "RETAIL" as const,
      status: "LEAD" as const,
      notes: "Walk-in inquiry about bulk pricing on fasteners.",
    },
    {
      name: "Metro Builders Supply",
      mobile: "9820011002",
      businessName: "Metro Builders Supply Co.",
      type: "WHOLESALE" as const,
      status: "LEAD" as const,
      notes: "Referred by Rajesh Traders, awaiting first order.",
    },
    {
      name: "Deshpande & Sons",
      mobile: "9820022003",
      businessName: "Deshpande & Sons Trading",
      type: "WHOLESALE" as const,
      status: "INACTIVE" as const,
      notes: "No orders in 6 months.",
    },
    {
      name: "Vikram Electricals",
      mobile: "9820033004",
      businessName: "Vikram Electricals",
      type: "RETAIL" as const,
      status: "ACTIVE" as const,
      email: "vikram.elec@example.com",
    },
  ];
  const customers = [];
  for (const def of customerDefs) {
    customers.push(await createCustomer(def, sales.id));
  }

  // Follow-ups: one overdue (past date) on a LEAD, one upcoming on another.
  const past = new Date();
  past.setDate(past.getDate() - 4);
  const future = new Date();
  future.setDate(future.getDate() + 3);
  await addFollowUp(
    customers[4].id,
    {
      note: "Called to discuss bulk fastener pricing; requested a quote by end of week.",
      followUpDate: past,
    },
    sales.id,
  );
  await addFollowUp(
    customers[5].id,
    { note: "Scheduled a site visit to finalize first order quantities.", followUpDate: future },
    sales.id,
  );

  console.log("Seeding sales challans...");
  const challanPlans: {
    customerIdx: number;
    items: { productIdx: number; qty: number }[];
    action: "confirm" | "draft" | "cancel";
  }[] = [
    {
      customerIdx: 0,
      items: [
        { productIdx: 0, qty: 40 },
        { productIdx: 2, qty: 100 },
      ],
      action: "confirm",
    },
    { customerIdx: 1, items: [{ productIdx: 1, qty: 80 }], action: "confirm" },
    {
      customerIdx: 2,
      items: [
        { productIdx: 5, qty: 120 },
        { productIdx: 8, qty: 30 },
      ],
      action: "confirm",
    },
    {
      customerIdx: 3,
      items: [
        { productIdx: 3, qty: 25 },
        { productIdx: 4, qty: 15 },
      ],
      action: "confirm",
    },
    { customerIdx: 0, items: [{ productIdx: 2, qty: 60 }], action: "confirm" },
    { customerIdx: 7, items: [{ productIdx: 9, qty: 12 }], action: "confirm" },
    { customerIdx: 1, items: [{ productIdx: 6, qty: 10 }], action: "confirm" },
    { customerIdx: 2, items: [{ productIdx: 7, qty: 40 }], action: "confirm" },
    { customerIdx: 3, items: [{ productIdx: 0, qty: 20 }], action: "draft" },
    { customerIdx: 0, items: [{ productIdx: 8, qty: 15 }], action: "cancel" },
  ];

  const createdChallanIds: string[] = [];
  for (const plan of challanPlans) {
    const customer = customers[plan.customerIdx];
    const items = plan.items.map((it) => ({
      productId: products[it.productIdx].id,
      quantity: it.qty,
    }));
    const challan = await createChallan({ customerId: customer.id, items }, sales.id);
    if (plan.action === "confirm") {
      await confirmChallan(challan.id, sales.id);
      createdChallanIds.push(challan.id);
    } else if (plan.action === "cancel") {
      await confirmChallan(challan.id, sales.id);
      await cancelChallan(challan.id, sales.id);
    }
    // "draft" plans are left as-is.
  }

  console.log(
    "Backdating confirmed challans across the last 21 days for a realistic sales trend...",
  );
  for (let i = 0; i < createdChallanIds.length; i += 1) {
    const daysAgo = Math.floor((i / createdChallanIds.length) * 20) + 1;
    const backdated = new Date();
    backdated.setDate(backdated.getDate() - daysAgo);
    backdated.setHours(9 + (i % 8), 15, 0, 0);
    await prisma.$executeRaw`UPDATE sales_challans SET "createdAt" = ${backdated}, "updatedAt" = ${backdated} WHERE id = ${createdChallanIds[i]}`;
    await prisma.$executeRaw`UPDATE stock_movements SET "createdAt" = ${backdated} WHERE "sourceType" = 'CHALLAN' AND "sourceId" = ${createdChallanIds[i]}`;
  }

  console.log("Demo data seeded successfully.");
  console.log(`  Products: ${products.length}`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Purchase orders: ${poBatches.length + 1}`);
  console.log(`  Sales challans: ${challanPlans.length} (${createdChallanIds.length} confirmed)`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
