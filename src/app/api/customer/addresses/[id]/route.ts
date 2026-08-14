import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireCustomer } from "@/lib/auth/session";
import { isValidPhone, isValidPincode, normalizePhone } from "@/lib/auth/validate";
import { updateStore } from "@/lib/db/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const user = await requireCustomer();
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = String(body.fullName || "").trim();
    const phone = normalizePhone(String(body.phone || body.mobileNumber || ""));
    const line1 = String(body.line1 || body.addressLine1 || "").trim();
    const line2 = String(body.line2 || body.addressLine2 || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim();
    const pincode = String(body.pincode || "").trim();
    const landmark = String(body.landmark || "").trim();
    const isDefault = Boolean(body.isDefault);
    if (fullName.length < 2) return jsonError("Please enter the full name.", 400);
    if (!isValidPhone(phone)) return jsonError("Please enter a valid mobile number.", 400);
    if (line1.length < 4) return jsonError("Please enter address line 1.", 400);
    if (!city || !state) return jsonError("Please enter city and state.", 400);
    if (!isValidPincode(pincode)) return jsonError("Please enter a valid 6-digit pincode.", 400);

    const result = await updateStore((s) => {
      const row = s.addresses.find((a) => a.id === id && a.userId === user.id);
      if (!row) return { error: "Address not found." };
      Object.assign(row, { fullName, phone, line1, line2, city, state, pincode, landmark });
      if (isDefault) {
        for (const a of s.addresses.filter((x) => x.userId === user.id)) a.isDefault = a.id === id;
      }
      return { addresses: s.addresses.filter((a) => a.userId === user.id) };
    });
    if ("error" in result && result.error) return jsonError(result.error, 404);
    return Response.json(result);
  } catch {
    return jsonError("Please log in.", 401);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);
  try {
    const user = await requireCustomer();
    const { id } = await ctx.params;
    const addresses = await updateStore((s) => {
      s.addresses = s.addresses.filter((a) => !(a.id === id && a.userId === user.id));
      const mine = s.addresses.filter((a) => a.userId === user.id);
      if (mine.length && !mine.some((a) => a.isDefault)) mine[0].isDefault = true;
      return mine;
    });
    return Response.json({ addresses });
  } catch {
    return jsonError("Please log in.", 401);
  }
}
