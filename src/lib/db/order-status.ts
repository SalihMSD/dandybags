import { type OrderStatus } from "@prisma/client";

export const ORDER_STATUSES = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function allowedNextStatuses(current: OrderStatus): OrderStatus[] {
  switch (current) {
    case "PLACED":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["SHIPPED"];
    case "SHIPPED":
      return ["DELIVERED"];
    default:
      return [];
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return allowedNextStatuses(from).includes(to);
}

export function parseDeliveryField(value: unknown, max: number) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length > max) return null;
  return text;
}
