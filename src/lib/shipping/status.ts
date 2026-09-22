export const SHIPMENT_STATUSES = [
  "PENDING",
  "CREATED",
  "AWB_ASSIGNED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "NDR",
  "RTO",
  "CANCELLED",
  "FAILED",
  "RECONCILIATION_REQUIRED",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export function isShipmentStatus(value: string): value is ShipmentStatus {
  return SHIPMENT_STATUSES.includes(value as ShipmentStatus);
}

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: "Pending",
  CREATED: "Created",
  AWB_ASSIGNED: "AWB Assigned",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  NDR: "NDR",
  RTO: "Return to Origin",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
  RECONCILIATION_REQUIRED: "Reconciliation Required",
};

export function shipmentStatusLabel(status: ShipmentStatus): string {
  return SHIPMENT_STATUS_LABELS[status] ?? status;
}

export const SHIPMENT_FINAL_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  "DELIVERED",
  "RTO",
  "CANCELLED",
  "FAILED",
]);

export function isShipmentFinal(status: ShipmentStatus): boolean {
  return SHIPMENT_FINAL_STATUSES.has(status);
}

export const SHIPMENT_ACTIVE_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  "CREATED",
  "AWB_ASSIGNED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "NDR",
]);

export function isShipmentActive(status: ShipmentStatus): boolean {
  return SHIPMENT_ACTIVE_STATUSES.has(status);
}

export const SHIPMENT_CANCELABLE_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  "PENDING",
  "CREATED",
  "AWB_ASSIGNED",
  "PICKUP_SCHEDULED",
]);

export function isShipmentCancelable(status: ShipmentStatus): boolean {
  return SHIPMENT_CANCELABLE_STATUSES.has(status);
}

export const SHIPMENT_TRANSITIONS: ReadonlySet<string> = new Set([
  "PENDING->CREATED",
  "PENDING->AWB_ASSIGNED",
  "PENDING->PICKED_UP",
  "PENDING->CANCELLED",
  "PENDING->FAILED",
  "CREATED->AWB_ASSIGNED",
  "CREATED->CANCELLED",
  "CREATED->PICKED_UP",
  "AWB_ASSIGNED->PICKUP_SCHEDULED",
  "AWB_ASSIGNED->PICKED_UP",
  "AWB_ASSIGNED->CANCELLED",
  "AWB_ASSIGNED->FAILED",
  "PICKUP_SCHEDULED->PICKED_UP",
  "PICKUP_SCHEDULED->CANCELLED",
  "PICKUP_SCHEDULED->FAILED",
  "PICKED_UP->IN_TRANSIT",
  "PICKED_UP->CANCELLED",
  "PICKED_UP->FAILED",
  "IN_TRANSIT->OUT_FOR_DELIVERY",
  "IN_TRANSIT->DELIVERED",
  "IN_TRANSIT->RTO",
  "IN_TRANSIT->NDR",
  "IN_TRANSIT->CANCELLED",
  "IN_TRANSIT->FAILED",
  "OUT_FOR_DELIVERY->DELIVERED",
  "OUT_FOR_DELIVERY->RTO",
  "OUT_FOR_DELIVERY->NDR",
  "OUT_FOR_DELIVERY->FAILED",
  "NDR->IN_TRANSIT",
  "NDR->RTO",
  "NDR->FAILED",
  "RTO->DELIVERED",
  "RTO->CANCELLED",
  "RTO->FAILED",
]);

export function canTransitionShipmentStatus(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return false;
  return SHIPMENT_TRANSITIONS.has(`${from}->${to}`);
}

export function assertShipmentStatus(value: string): ShipmentStatus {
  if (isShipmentStatus(value)) {
    return value;
  }
  throw new Error(`Invalid shipment status: ${value}`);
}
