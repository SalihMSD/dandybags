import { jsonError, originOk } from "@/lib/auth/helpers";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminProduct, updateAdminProduct } from "@/lib/db/admin-products";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = "product-images";

const SLOT_TO_DB_FIELD: Record<string, string> = {
  master: "imageFront",
  "view-1": "imageBack",
  "view-2": "imageLeft",
  "view-3": "imageRight",
  "view-4": "imageTop",
};

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

export async function POST(request: Request) {
  if (!originOk(request)) return jsonError("Invalid request.", 403);

  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("Access denied.", 403);
  }

  if (!admin.email) {
    return jsonError("Access denied.", 403);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid form data.", 400);
  }

  const productId = String(formData.get("productId") || "").trim();
  const slot = String(formData.get("slot") || "").trim();
  const file = formData.get("file") as File | null;

  if (!productId || !slot || !file) {
    return jsonError("productId, slot, and file are required.", 400);
  }

  const dbField = SLOT_TO_DB_FIELD[slot];
  if (!dbField) {
    return jsonError("Invalid image slot. Use master, view-1, view-2, view-3, or view-4.", 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return jsonError("Unsupported file type. Use JPEG, PNG, or WebP.", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError("File is too large. Maximum size is 5 MB.", 400);
  }

  const product = await getAdminProduct(productId);
  if (!product) {
    return jsonError("Product not found.", 404);
  }

  const sku = String(product.sku || product.id).replace(/[^a-zA-Z0-9-]/g, "-");
  const extension = getExtension(file.type);
  const storagePath = `products/${sku}/${slot}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin().storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("Supabase upload failed:", uploadError);
    return jsonError("Image upload failed. Please try again.", 500);
  }

  const { data: publicUrlData } = supabaseAdmin().storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData?.publicUrl;
  if (!publicUrl) {
    return jsonError("Failed to get public URL for uploaded image.", 500);
  }

  const updated = await updateAdminProduct(productId, {
    [dbField]: publicUrl,
  } as Record<string, unknown>);

  if (!updated) {
    return jsonError("Failed to update product image.", 500);
  }

  return Response.json({ url: publicUrl, slot, dbField });
}
