export const CONFIRMATION_TRIGGER_ACTION = "marked_paid" as const;

export function shouldSendConfirmation(action: string): boolean {
  return action === CONFIRMATION_TRIGGER_ACTION;
}

export type ConfirmationOrder = {
  id: string;
  totalLabel: string;
  paymentStatus: string;
  shipFullName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  user: { email: string | null } | null;
  items: { name: string; qty: number }[];
};

export type OrderConfirmationInput = {
  to: string;
  orderId: string;
  paymentStatus: string;
  totalLabel: string;
  items: { name: string; qty: number }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  trackingUrl?: string;
};

export function mapOrderToConfirmationInput(order: ConfirmationOrder): OrderConfirmationInput {
  return {
    to: order.user!.email!,
    orderId: order.id,
    paymentStatus: order.paymentStatus,
    totalLabel: order.totalLabel,
    items: order.items.map((i) => ({ name: i.name, qty: i.qty })),
    shippingAddress: {
      fullName: order.shipFullName,
      phone: order.shipPhone,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      state: order.shipState,
      pincode: order.shipPincode,
    },
  };
}
