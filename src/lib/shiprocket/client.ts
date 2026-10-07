import {
  ShiprocketAuthError,
  ShiprocketRateLimitError,
  ShiprocketNotFoundError,
  ShiprocketError,
  ShiprocketTimeoutError,
  normalizeShiprocketError,
} from "./errors";
import type {
  ShiprocketCreateOrderPayload,
  ShiprocketCreateOrderResponse,
  ShiprocketAssignAwbResponse,
  ShiprocketPickupResponse,
  ShiprocketLabelResponse,
  ShiprocketTrackResponse,
  ShiprocketServiceabilityResponse,
  ShiprocketOrderLookupResult,
  ShiprocketOrderListResponse,
  ShiprocketShipmentDetail,
  ShiprocketShipmentDetailResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://apiv2.shiprocket.in";
const TOKEN_TTL_MS = 10 * 24 * 60 * 60 * 1000;
const TOKEN_SAFETY_MARGIN_MS = 5 * 60 * 1000;
const SHIPROCKET_TIMEOUT_MS = 30000;

export { TOKEN_TTL_MS, TOKEN_SAFETY_MARGIN_MS, SHIPROCKET_TIMEOUT_MS };

function apiBaseUrl(): string {
  return (process.env.SHIPROCKET_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function getEmail(): string {
  const v = (process.env.SHIPROCKET_EMAIL || "").trim();
  if (!v) throw new ShiprocketAuthError("SHIPROCKET_EMAIL is not configured");
  return v;
}

function getPassword(): string {
  const v = (process.env.SHIPROCKET_PASSWORD || "").trim();
  if (!v) throw new ShiprocketAuthError("SHIPROCKET_PASSWORD is not configured");
  return v;
}

function getChannelId(): string | undefined {
  const v = (process.env.SHIPROCKET_CHANNEL_ID || "").trim();
  return v ? v : undefined;
}

function getPickupLocation(): string {
  const v = (process.env.SHIPROCKET_PICKUP_LOCATION || "").trim();
  if (!v) throw new ShiprocketError("SHIPROCKET_PICKUP_LOCATION is not configured");
  return v;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

export function getCachedToken(): { token: string; expiresAt: number } | null {
  if (!tokenCache) return null;
  const now = Date.now();
  if (now >= tokenCache.expiresAt - TOKEN_SAFETY_MARGIN_MS) {
    return null;
  }
  return tokenCache;
}

export function clearTokenCache(): void {
  tokenCache = null;
}

export function configureToken(token: string, expiresAt: number): void {
  tokenCache = { token, expiresAt };
}

export async function authenticate(): Promise<string> {
  const cached = getCachedToken();
  if (cached) return cached.token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHIPROCKET_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/v1/external/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: getEmail(), password: getPassword() }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ShiprocketTimeoutError("Shiprocket authentication timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new ShiprocketAuthError(
      `Shiprocket authentication failed: ${res.status}`,
    );
  }

  const data: { token?: string } = await res.json().catch(() => ({}));
  if (!data.token) {
    throw new ShiprocketAuthError("Shiprocket authentication returned no token");
  }

  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokenCache = { token: data.token, expiresAt };
  return data.token;
}

export async function getToken(): Promise<string> {
  const cached = getCachedToken();
  if (cached) return cached.token;
  return authenticate();
}

export function isShiprocketConfigured(): boolean {
  return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD && process.env.SHIPROCKET_PICKUP_LOCATION);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHIPROCKET_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ShiprocketTimeoutError(`Request timed out: ${new URL(url).pathname}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function api<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetchWithTimeout(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearTokenCache();
    throw new ShiprocketAuthError("Shiprocket authentication error");
  }
  if (res.status === 429) {
    throw new ShiprocketRateLimitError("Shiprocket rate limit exceeded");
  }
  if (res.status === 404) {
    throw new ShiprocketNotFoundError("Shiprocket resource not found");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ShiprocketError(
      normalizeShiprocketError(`Shiprocket API error: ${res.status} ${body}`),
      res.status,
    );
  }

  if (res.status === 204) return null as T;
  return res.json().catch(() => null) as T;
}

export async function checkServiceability(params: {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  cod: number;
  declaredValue: number;
}): Promise<ShiprocketServiceabilityResponse> {
  const url = new URL(`${apiBaseUrl()}/v1/external/courier/serviceability/`);
  url.searchParams.set("pickup_postcode", params.pickupPincode);
  url.searchParams.set("delivery_postcode", params.deliveryPincode);
  url.searchParams.set("weight", String(params.weight));
  url.searchParams.set("cod", String(params.cod));
  url.searchParams.set("declared_value", String(params.declaredValue));

  return api<ShiprocketServiceabilityResponse>(url.toString().replace(apiBaseUrl(), ""), {
    method: "GET",
  });
}

export async function createOrder(
  payload: ShiprocketCreateOrderPayload,
): Promise<ShiprocketCreateOrderResponse> {
  return api<ShiprocketCreateOrderResponse>("/v1/external/orders/create/adhoc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function assignAWB(shipmentId: string): Promise<ShiprocketAssignAwbResponse> {
  return api<ShiprocketAssignAwbResponse>("/v1/external/courier/assign/awb", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipment_id: shipmentId }),
  });
}

export async function schedulePickup(shipmentIds: string[]): Promise<ShiprocketPickupResponse> {
  return api<ShiprocketPickupResponse>("/v1/external/courier/generate/pickup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pickup_location: getPickupLocation(),
      order_ids: shipmentIds,
      ...(getChannelId() ? { channel_id: getChannelId() } : {}),
    }),
  });
}

export async function generateLabel(shipmentId: string): Promise<ShiprocketLabelResponse> {
  return api<ShiprocketLabelResponse>("/v1/external/orders/print/ids/" + shipmentId, {
    method: "GET",
  });
}


export async function findOrderByMerchantId(merchantOrderId: string): Promise<ShiprocketOrderLookupResult | null> {
  const url = new URL(`${apiBaseUrl()}/v1/external/orders`);
  url.searchParams.set("filter_by", "channel_order_id");
  url.searchParams.set("filter", merchantOrderId);

  const data = await api<ShiprocketOrderListResponse>(
    url.pathname + url.search,
    { method: "GET" },
  );

   if (data?.data?.length > 0) {
    const order = data.data[0];
    const shipmentId = order.shipment_id ?? order.shipment?.id;
    if (shipmentId) {
      const providerOrderId = String(shipmentId);
      return {
        providerOrderId,
        providerShipmentId: providerOrderId,
        orderId: order.order_id ? String(order.order_id) : null,
        awb: order.awb_code ?? order.shipment?.awb ?? null,
        courierName: order.courier_name ?? order.shipment?.courier ?? null,
        status: order.status ?? null,
      };
    }
  }
  return null;
}

export async function fetchShipmentById(shipmentId: string): Promise<ShiprocketShipmentDetail> {
  const response = await api<ShiprocketShipmentDetailResponse>(
    `/v1/external/shipments/${encodeURIComponent(shipmentId)}`,
    { method: "GET" },
  );
  return response?.data ?? ({} as ShiprocketShipmentDetail);
}

export interface ShipmentDiagnostics {
  upstream_status: number;
  top_level_keys: string[];
  data_present: boolean;
  data_type: "object" | "array" | "string" | "number" | "boolean" | "null" | null;
  data_keys: string[] | null;
  message: string | null;
}

export async function fetchShipmentByIdWithDiagnostics(
  shipmentId: string,
): Promise<{ data: ShiprocketShipmentDetail; diagnostics: ShipmentDiagnostics }> {
  const token = await getToken();
  const url = `${apiBaseUrl()}/v1/external/shipments/${encodeURIComponent(shipmentId)}`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearTokenCache();
    throw new ShiprocketAuthError("Shiprocket authentication error");
  }
  if (res.status === 429) {
    throw new ShiprocketRateLimitError("Shiprocket rate limit exceeded");
  }
  if (res.status === 404) {
    throw new ShiprocketNotFoundError("Shiprocket resource not found");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ShiprocketError(
      normalizeShiprocketError(`Shiprocket API error: ${res.status} ${body}`),
      res.status,
    );
  }

  if (res.status === 204) {
    return {
      data: {} as ShiprocketShipmentDetail,
      diagnostics: {
        upstream_status: 204,
        top_level_keys: [],
        data_present: false,
        data_type: null,
        data_keys: null,
        message: null,
      },
    };
  }

  const json: unknown = await res.json().catch(() => null);
  const obj = json && typeof json === "object" && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : null;

  const dataVal = obj?.data ?? null;
  const dataPresent = dataVal != null;
  let dataType: ShipmentDiagnostics["data_type"] = null;
  if (dataPresent) {
    if (Array.isArray(dataVal)) {
      dataType = "array";
    } else if (typeof dataVal === "string") {
      dataType = "string";
    } else if (typeof dataVal === "number") {
      dataType = "number";
    } else if (typeof dataVal === "boolean") {
      dataType = "boolean";
    } else {
      dataType = "object";
    }
  }
  const dataKeys = dataPresent && typeof dataVal === "object" && !Array.isArray(dataVal)
    ? Object.keys(dataVal as Record<string, unknown>)
    : null;

  let message: string | null = null;
  if (typeof obj?.message === "string") {
    message = normalizeShiprocketError(obj.message);
  }

  return {
    data: (dataVal as ShiprocketShipmentDetail) ?? ({} as ShiprocketShipmentDetail),
    diagnostics: {
      upstream_status: res.status,
      top_level_keys: obj ? Object.keys(obj) : [],
      data_present: dataPresent,
      data_type: dataType,
      data_keys: dataKeys,
      message,
    },
  };
}

export interface EndpointProbeResult {
  endpoint: string;
  upstream_status: number | null;
  content_type: string | null;
  body_length: number | null;
  is_empty_object: boolean;
  top_level_keys: string[];
  message: string | null;
  error: string | null;
}

export async function probeShiprocketEndpoints(
  shipmentId: string,
): Promise<EndpointProbeResult[]> {
  const token = await getToken();
  const endpoints = [
    `/v1/external/shipments/${encodeURIComponent(shipmentId)}`,
    `/v1/external/orders/show/${encodeURIComponent(shipmentId)}`,
  ];

  const probes: EndpointProbeResult[] = [];
  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithTimeout(`${apiBaseUrl()}${endpoint}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = await res.text().catch(() => "");

      let parsed: unknown = null;
      let parseError: string | null = null;
      if (raw.length > 0) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parseError = "response body is not valid JSON";
        }
      }

      const obj =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;

      let message: string | null = null;
      if (obj && typeof obj.message === "string") {
        message = normalizeShiprocketError(obj.message);
      }

      probes.push({
        endpoint,
        upstream_status: res.status,
        content_type: res.headers.get("content-type"),
        body_length: raw.length,
        is_empty_object: obj !== null && Object.keys(obj).length === 0,
        top_level_keys: obj ? Object.keys(obj) : [],
        message,
        error: parseError,
      });
    } catch (err) {
      probes.push({
        endpoint,
        upstream_status: null,
        content_type: null,
        body_length: null,
        is_empty_object: false,
        top_level_keys: [],
        message: null,
        error:
          err instanceof Error
            ? normalizeShiprocketError(err.message)
            : "unknown probe error",
      });
    }
  }
  return probes;
}

export interface OrderProbeResult {
  upstream_status: number | null;
  content_type: string | null;
  body_length: number | null;
  top_level_keys: string[];
  data_length: number | null;
  records: Array<{
    order_id: number | string | null;
    shipment_id: string | number | null;
    channel_order_id: string | null;
    status: string | null;
    awb: string | null;
  }>;
  error: string | null;
}

export async function probeOrderLookup(
  merchantOrderId: string,
): Promise<OrderProbeResult> {
  const token = await getToken();
  const url = new URL(`${apiBaseUrl()}/v1/external/orders`);
  url.searchParams.set("filter_by", "channel_order_id");
  url.searchParams.set("filter", merchantOrderId);

  try {
    const res = await fetchWithTimeout(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const raw = await res.text().catch(() => "");

    let parsed: unknown = null;
    let parseError: string | null = null;
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parseError = "response body is not valid JSON";
      }
    }

    const obj =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;

    const dataArray =
      obj && Array.isArray(obj.data)
        ? (obj.data as Array<Record<string, unknown>>)
        : null;
    const records = dataArray
      ? dataArray.slice(0, 10).map((item) => {
          const shipment =
            item.shipment && typeof item.shipment === "object"
              ? (item.shipment as Record<string, unknown>)
              : null;
          return {
            order_id: (item.order_id ?? null) as string | number | null,
            shipment_id: (item.shipment_id ?? shipment?.id ?? null) as
              | string
              | number
              | null,
            channel_order_id: (item.channel_order_id ?? null) as string | null,
            status: (item.status ?? null) as string | null,
            awb: (item.awb_code ?? shipment?.awb ?? null) as string | null,
          };
        })
      : [];

    let message: string | null = null;
    if (obj && typeof obj.message === "string") {
      message = normalizeShiprocketError(obj.message);
    }

    return {
      upstream_status: res.status,
      content_type: res.headers.get("content-type"),
      body_length: raw.length,
      top_level_keys: obj ? Object.keys(obj) : [],
      data_length: dataArray ? dataArray.length : null,
      records,
      error: parseError ?? message,
    };
  } catch (err) {
    return {
      upstream_status: null,
      content_type: null,
      body_length: null,
      top_level_keys: [],
      data_length: null,
      records: [],
      error:
        err instanceof Error
          ? normalizeShiprocketError(err.message)
          : "unknown probe error",
    };
  }
}
