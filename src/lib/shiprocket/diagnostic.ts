import { originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { fetchShipmentByIdWithDiagnostics } from "@/lib/shiprocket/client";
import type { ShipmentDiagnostics } from "@/lib/shiprocket/client";
import type { ShiprocketShipmentDetail } from "@/lib/shiprocket/types";
import {
  ShiprocketError,
  ShiprocketNotFoundError,
  normalizeShiprocketError,
} from "@/lib/shiprocket/errors";

export interface LookupResponse {
  shipment_id: string;
  shiprocket_order_id: string | null;
  channel_order_id: string | null;
  status: string | null;
  awb_code: string | null;
  courier_name: string | null;
  _diagnostics?: ShipmentDiagnostics;
}

export function buildLookupResponse(data: ShiprocketShipmentDetail): LookupResponse {
  const rawShipmentId = data?.id ?? data?.shipment_id ?? null;
  const shipmentId =
    typeof rawShipmentId === "number" ? String(rawShipmentId) : rawShipmentId ?? null;
  return {
    shipment_id: shipmentId ?? "",
    shiprocket_order_id: data?.order_id ? String(data.order_id) : null,
    channel_order_id: data?.channel_order_id ?? null,
    status: data?.status ?? null,
    awb_code: data?.awb ?? data?.awb_code ?? null,
    courier_name: data?.courier ?? data?.courier_name ?? data?.courier_company ?? null,
  };
}

export interface LookupDeps {
  requireAdmin: () => Promise<unknown>;
  originOk: (request: Request) => boolean;
  fetchShipmentByIdWithDiagnostics: (
    shipmentId: string,
  ) => Promise<{ data: ShiprocketShipmentDetail; diagnostics: ShipmentDiagnostics }>;
}

export const defaultLookupDeps: LookupDeps = {
  requireAdmin,
  originOk,
  fetchShipmentByIdWithDiagnostics,
};

export interface LookupResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface FetchResult {
  data: ShiprocketShipmentDetail;
  diagnostics: ShipmentDiagnostics;
}

export async function handleShipmentLookup(
  request: Request,
  shipmentId: string,
  deps: LookupDeps = defaultLookupDeps,
): Promise<LookupResult> {
  if (!deps.originOk(request)) {
    return { status: 403, body: { error: "Invalid origin." }, headers: {} };
  }

  try {
    await deps.requireAdmin();
  } catch {
    return { status: 403, body: { error: "Access denied." }, headers: {} };
  }

  try {
    const { data, diagnostics } = await deps.fetchShipmentByIdWithDiagnostics(shipmentId);
    const response = buildLookupResponse(data);

    return {
      status: 200,
      body: { ...response, _diagnostics: diagnostics },
      headers: { "Cache-Control": "no-store, max-age=0" },
    };
  } catch (err) {
    if (err instanceof ShiprocketNotFoundError) {
      return { status: 404, body: { error: "Shiprocket shipment not found." }, headers: {} };
    }
    if (err instanceof ShiprocketError) {
      const status = err.statusCode ?? 502;
      return {
        status: status >= 500 ? 502 : status,
        body: { error: "Shiprocket API error." },
        headers: {},
      };
    }
    const message =
      err instanceof Error ? normalizeShiprocketError(err.message) : "Something went wrong.";
    return { status: 502, body: { error: message }, headers: {} };
  }
}
