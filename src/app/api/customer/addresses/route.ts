import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { isValidPhone, isValidPincode, normalizePhone } from "@/lib/auth/validate";
import { newId, readStore, updateStore, type AddressRecord } from "@/lib/db/store";

export const runtime = "nodejs";

function parseAddress(body: Record<string, unknown>, userId: string, id: string, isDefault: boolean): AddressRecord | string {
  const fullName = String(body.fullName || "").trim();
  const phone = normalizePhone(String(body.phone || body.mobileNumber || ""));
  const line1 = String(body.line1 || body.addressLine1 || "").trim();
  const line2 = String(body.line2 || body.addressLine2 || "").trim();
  const city = String(body.city || "").trim();
  const state = String(body.state || "").trim();
  const pincode = String(body.pincode || "").trim();
  const landmark = String(body.landmark || "").trim();
  if (fullName.length < 2) return "Please enter the full name.";
  if (!isValidPhone(phone)) return "Please enter a valid mobile number.";
  if (line1.length < 4) return "Please enter address line 1.";
  if (!city || !state) return "Please enter city and state.";
  if (!isValidPincode(pincode)) return "Please enter a valid 6-digit pincode.";
  return { id, userId, fullName, phone, line1, line2, city, state, pincode, landmark, isDefault };
}

export async function GET() {
  try {
    const user = await requireCustomer();
    const addresses = readStore().addresses.filter((a) => a.userId === user.id);
    return Response.json({ addresses });
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const user = await requireCustomer();
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseAddress(body, user.id, newId("adr"), Boolean(body.isDefault));
    if (typeof parsed === "string") return jsonError(parsed, 400);
    const addresses = await updateStore((s) => {
      const mine = s.addresses.filter((a) => a.userId === user.id);
      if (parsed.isDefault || mine.length === 0) {
        for (const a of mine) a.isDefault = false;
        parsed.isDefault = true;
      }
      s.addresses.push(parsed);
      return s.addresses.filter((a) => a.userId === user.id);
    });
    return Response.json({ addresses });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
