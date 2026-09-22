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
      return {
        providerOrderId: String(shipmentId),
        awb: order.awb_code ?? order.shipment?.awb ?? null,
        courierName: order.courier_name ?? order.shipment?.courier ?? null,
        status: order.status ?? null,
      };
    }
  }
  return null;
}
