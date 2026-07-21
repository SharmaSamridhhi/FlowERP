import { useCallback, useMemo, useState } from "react";

export interface LineItemProduct {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
}

export interface LineItem {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: number;
  quantity: number;
}

export interface UseLineItemsResult {
  items: LineItem[];
  addItem: (product: LineItemProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  reset: (items: LineItem[]) => void;
  totalQuantity: number;
  totalValue: number;
}

// Pure, self-contained line-item state — no data fetching, no form
// library — so its add/remove/quantity/total logic is unit-testable
// without mocking the network. See
// specs/FLO-016-sales-challan-frontend.md's Implementation Notes.
export function useLineItems(initialItems: LineItem[] = []): UseLineItemsResult {
  const [items, setItems] = useState<LineItem[]>(initialItems);

  // Adding a product already on the challan merges into its existing row
  // (summing quantity) rather than creating a duplicate row or blocking
  // the add — the acceptance criterion's chosen, documented behavior.
  const addItem = useCallback((product: LineItemProduct, quantity = 1) => {
    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.productId === product.id);
      if (existingIndex === -1) {
        return [
          ...current,
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            unitPrice: product.unitPrice,
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

  // Non-positive or non-integer quantities are silently ignored rather
  // than stored — the input's own validation surfaces the message; this
  // hook just never lets bad state through.
  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return;
    }
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
  }, []);

  const reset = useCallback((nextItems: LineItem[]) => {
    setItems(nextItems);
  }, []);

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  return { items, addItem, removeItem, setQuantity, reset, totalQuantity, totalValue };
}
