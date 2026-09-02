import { jsonError } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminOrders, listAdminOrdersFiltered } from "@/lib/db/admin-orders";
import { parseTotalLabel } from "@/lib/db/analytics";
import { formatInr } from "@/lib/format";

export const runtime = "nodejs";

const CSV_HEADERS = ["Order ID", "Date", "Customer Name", "Email", "Phone", "Items", "Subtotal", "Total", "Payment Status", "Order Status", "Shipping Provider", "Tracking Number"];

function escapeCsv(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  const { searchParams } = new URL(request.url);

  const format = searchParams.get("format");
  if (format === "csv") {
    const search = searchParams.get("search") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const orderStatus = searchParams.get("orderStatus") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const params = { search, paymentStatus, orderStatus, startDate, endDate, page: 1, pageSize: 5000 };
    const result = await listAdminOrdersFiltered(params);

    const lines = [CSV_HEADERS.join(",")];
    for (const o of result.orders) {
      const itemCount = o.items.reduce((sum, i) => sum + i.qty, 0);
      const subtotal = o.items.reduce((sum, i) => sum + Number(i.unitPrice ?? 0) * i.qty, 0);
      const line = [
        o.id,
        new Date(o.createdAt).toLocaleString("en-IN"),
        o.customer.fullName,
        o.customer.email,
        o.customer.phone,
        String(itemCount),
        formatInr(subtotal),
        o.totalLabel,
        o.paymentStatus,
        o.orderStatus,
        o.shippingProvider || "",
        o.trackingNumber || "",
      ];
      lines.push(line.map(escapeCsv).join(","));
    }

    const csv = lines.join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  const hasFilters = searchParams.has("search") || searchParams.has("paymentStatus") || searchParams.has("orderStatus") || searchParams.has("startDate") || searchParams.has("endDate") || searchParams.has("page");

  if (!hasFilters) {
    const orders = await listAdminOrders();
    return Response.json({ orders, total: orders.length });
  }

  try {
    const result = await listAdminOrdersFiltered({
      search: searchParams.get("search") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
      orderStatus: searchParams.get("orderStatus") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: Number(searchParams.get("page") || "1"),
      pageSize: Number(searchParams.get("pageSize") || "20"),
    });
    return Response.json(result);
  } catch {
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
