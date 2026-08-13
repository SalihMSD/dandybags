export function asset(src: string) {
  if (!src.startsWith("/") || src.startsWith("//")) return src;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${base}${src}`;
}
