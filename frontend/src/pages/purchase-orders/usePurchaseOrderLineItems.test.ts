import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePurchaseOrderLineItems } from "./usePurchaseOrderLineItems";
import type { POLineItemProduct } from "./usePurchaseOrderLineItems";

const WIDGET: POLineItemProduct = { id: "prod-1", name: "Widget", sku: "WID-001" };
const GADGET: POLineItemProduct = { id: "prod-2", name: "Gadget", sku: "GAD-001" };

describe("usePurchaseOrderLineItems", () => {
  it("starts empty with zero totals", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    expect(result.current.items).toEqual([]);
    expect(result.current.totalQuantity).toBe(0);
    expect(result.current.totalCost).toBe(0);
  });

  it("adds a new product as a row with the given quantity and unit cost", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 3, 10));

    expect(result.current.items).toEqual([
      {
        productId: "prod-1",
        productName: "Widget",
        productSku: "WID-001",
        unitCost: 10,
        quantity: 3,
      },
    ]);
    expect(result.current.totalQuantity).toBe(3);
    expect(result.current.totalCost).toBe(30);
  });

  it("merges quantity into the existing row when the same product is added again", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() => result.current.addItem(WIDGET, 5, 10));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(7);
    expect(result.current.totalQuantity).toBe(7);
  });

  it("computes totals across multiple distinct products", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() => result.current.addItem(GADGET, 1, 25));

    expect(result.current.totalQuantity).toBe(3);
    expect(result.current.totalCost).toBe(2 * 10 + 1 * 25);
  });

  it("removes a row by productId", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() => result.current.addItem(GADGET, 1, 25));
    act(() => result.current.removeItem(WIDGET.id));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(GADGET.id);
  });

  it("updates a row's quantity", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() => result.current.setQuantity(WIDGET.id, 9));

    expect(result.current.items[0].quantity).toBe(9);
  });

  it("ignores a non-positive or non-integer quantity update", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() => result.current.setQuantity(WIDGET.id, 0));
    act(() => result.current.setQuantity(WIDGET.id, 1.5));

    expect(result.current.items[0].quantity).toBe(2);
  });

  it("updates a row's unit cost", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() => result.current.setUnitCost(WIDGET.id, 12.5));

    expect(result.current.items[0].unitCost).toBe(12.5);
    expect(result.current.totalCost).toBe(25);
  });

  it("ignores a negative unit cost update", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() => result.current.setUnitCost(WIDGET.id, -1));

    expect(result.current.items[0].unitCost).toBe(10);
  });

  it("reset replaces the entire item list (used to load an existing draft)", () => {
    const { result } = renderHook(() => usePurchaseOrderLineItems());

    act(() => result.current.addItem(WIDGET, 2, 10));
    act(() =>
      result.current.reset([
        {
          productId: GADGET.id,
          productName: "Gadget",
          productSku: "GAD-001",
          unitCost: 25,
          quantity: 4,
        },
      ]),
    );

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(GADGET.id);
    expect(result.current.totalQuantity).toBe(4);
  });
});
