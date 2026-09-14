import { prisma } from "@/lib/db/prisma";
import { newId } from "@/lib/db/store";
import type { NotificationType } from "@prisma/client";

type OrderForNotification = {
  id: string;
  totalLabel: string | null;
  items?: { sku: string; qty: number }[];
  couponId?: string | null;
};

export type { OrderForNotification };

const NOTIFICATION_MESSAGE_PREFIX = "#";

export const ORDER_NOTIFICATION_TYPE: NotificationType = "NEW_ORDER";
export const REFUND_SUCCEEDED_TYPE: NotificationType = "REFUND_SUCCEEDED";
export const REFUND_FAILED_TYPE: NotificationType = "REFUND_FAILED";

export function buildOrderNotificationFields(order: OrderForNotification) {
  const type: NotificationType = ORDER_NOTIFICATION_TYPE;
  const title = "New Order";
  const message = `${NOTIFICATION_MESSAGE_PREFIX}${order.id} · ${order.totalLabel ?? ""}`;
  return { type, title, message };
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function resolveListLimit(requested: number | null): number {
  if (requested === null || Number.isNaN(requested)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT);
}

export async function createOrderNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, totalLabel: true },
    });
    if (!order) {
      console.error(`[DANDY notif] new-order notification skipped: order not found (${orderId})`);
      return;
    }

    const { type, title, message } = buildOrderNotificationFields(order);

    await prisma.notification.upsert({
      where: { orderId_type: { orderId: order.id, type } },
      update: { title, message },
      create: {
        id: newId("not"),
        type,
        orderId: order.id,
        title,
        message,
      },
    });
  } catch (e) {
    console.error("[DANDY notif] failed to create order notification", {
      orderId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function listRecentNotifications(limit = 50) {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      orderId: true,
      title: true,
      message: true,
      read: true,
      createdAt: true,
    },
  });
}

export function safeResolveListLimit(raw: string | null): number {
  return resolveListLimit(raw ? parseInt(raw, 10) : null);
}

export async function countUnreadNotifications() {
  return prisma.notification.count({ where: { read: false } });
}

export async function markNotificationRead(id: string) {
  if (!id) return { count: 0 };
  return prisma.notification.updateMany({ where: { id }, data: { read: true } });
}

export async function markAllNotificationsRead() {
  return prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
}

export async function createRefundSucceededNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, totalLabel: true },
    });
    if (!order) {
      console.error(`[DANDY notif] refund-succeeded notification skipped: order not found (${orderId})`);
      return;
    }
    await prisma.notification.upsert({
      where: { orderId_type: { orderId: order.id, type: REFUND_SUCCEEDED_TYPE } },
      update: {
        title: "Refund Processed",
        message: `#${order.id} · ${order.totalLabel ?? ""}`,
      },
      create: {
        id: newId("not"),
        type: REFUND_SUCCEEDED_TYPE,
        orderId: order.id,
        title: "Refund Processed",
        message: `#${order.id} · ${order.totalLabel ?? ""}`,
      },
    });
  } catch (e) {
    console.error("[DANDY notif] failed to create refund-succeeded notification", {
      orderId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function createRefundFailedNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, totalLabel: true },
    });
    if (!order) {
      console.error(`[DANDY notif] refund-failed notification skipped: order not found (${orderId})`);
      return;
    }
    await prisma.notification.upsert({
      where: { orderId_type: { orderId: order.id, type: REFUND_FAILED_TYPE } },
      update: {
        title: "Refund Failed",
        message: `#${order.id} · ${order.totalLabel ?? ""}`,
      },
      create: {
        id: newId("not"),
        type: REFUND_FAILED_TYPE,
        orderId: order.id,
        title: "Refund Failed",
        message: `#${order.id} · ${order.totalLabel ?? ""}`,
      },
    });
  } catch (e) {
    console.error("[DANDY notif] failed to create refund-failed notification", {
      orderId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
