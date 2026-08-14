import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/ProductActions";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { getCategory } from "@/lib/categories";
import { getProduct, products, publicProduct } from "@/lib/products";
import { formatInr } from "@/lib/format";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  return {
    title: p.seoTitle,
    description: p.seoDescription,
    openGraph: { title: p.seoTitle, description: p.seoDescription },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const raw = getProduct(slug);
  if (!raw) notFound();
  const product = publicProduct(raw);
  const cat = getCategory(product.category);
  const related = products
    .filter((p) => p.category === product.category && p.sku !== product.sku)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: site.name },
    description: product.description,
    image: product.images.front,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery product={raw} />
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase">{cat?.name}</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl md:text-5xl">{product.name}</h1>
          <p className="mt-2 text-sm text-ink-soft">SKU {product.sku}</p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-xl">{formatInr(product.sellingPrice)}</span>
            {product.mrp != null && (
              <span className="text-ink-soft line-through">{formatInr(product.mrp)}</span>
            )}
          </div>
          <p className="mt-2 text-sm">
            {product.b2cAvailable ? "Available for enquiry" : "Currently unavailable"}
          </p>
          <p className="mt-1 text-sm">Colour: {product.colour}</p>
          <p className="mt-6 leading-relaxed text-ink-soft">{product.description}</p>
          <ProductActions product={raw} />
          <div className="mt-10 border-t border-ink/10 pt-8">
            <h2 className="font-serif text-2xl">Product details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-ink-soft">Weight</dt>
                <dd>{product.weight}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Dimensions</dt>
                <dd>
                  {product.length} × {product.width} × {product.height}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Material</dt>
                <dd>{product.material}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Capacity</dt>
                <dd>{product.capacity}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Compartments</dt>
                <dd>{product.compartments}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Features</dt>
                <dd>{product.features.join(", ")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl">More in this collection</h2>
          <div className="mt-6 grid grid-cols-2 items-stretch gap-2.5 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
