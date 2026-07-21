import { useCallback, useMemo, useState } from "react";

export interface POLineItemProduct {
  id: string;
  name: string;
  sku: string;
}

export interface POLineItem {
  productId: string;
  productName: string;
  productSku: string;
  unitCost: number;
  quantity: number;
}

export interface UsePurchaseOrderLineItemsResult {
  items: POLineItem[];
  addItem: (product: POLineItemProduct, quantity?: number, unitCost?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setUnitCost: (productId: string, unitCost: number) => void;
  reset: (items: POLineItem[]) => void;
  totalQuantity: number;
  totalCost: number;
}

// Close sibling of challans/useLineItems.ts rather than a shared
// abstraction — a PO line item's per-unit figure is a purchase cost
// (entered by the user per line, not looked up from the product), not a
// sale price snapshot, so the two hooks' shapes genuinely differ (this one
// also needs setUnitCost). See specs/FLO-017-purchase-order.md's
// Technical Tasks: "a close sibling implementation is acceptable rather
// than forcing a premature abstraction."
export function usePurchaseOrderLineItems(
  initialItems: POLineItem[] = [],
): UsePurchaseOrderLineItemsResult {
  const [items, setItems] = useState<POLineItem[]>(initialItems);

  // Adding a product already on the PO merges into its existing row
  // (summing quantity) rather than creating a duplicate row or blocking
  // the add — same policy as the challan builder's line-item table.
  const addItem = useCallback((product: POLineItemProduct, quantity = 1, unitCost = 0) => {
    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.productId === product.id);
      if (existingIndex === -1) {
        return [
          ...current,
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            unitCost,
            quantity,
          },
        ];
      }
      return current.map((item, index) =>
        index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return;
    }
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
  }, []);

  const setUnitCost = useCallback((productId: string, unitCost: number) => {
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      return;
    }
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, unitCost } : item)),
    );
  }, []);

  const reset = useCallback((nextItems: POLineItem[]) => {
    setItems(nextItems);
  }, []);

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalCost = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    [items],
  );

  return { items, addItem, removeItem, setQuantity, setUnitCost, reset, totalQuantity, totalCost };
}
