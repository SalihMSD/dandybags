import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/ProductActions";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductReviews } from "@/components/ProductReviews";
import { getCategory } from "@/lib/categories";
import { getPublicProductBySlug, listProductsByCategory } from "@/lib/db/products";
import { discountPercent, formatInr } from "@/lib/format";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) return {};
  const url = `/shop/${product.slug}`;
  return {
    title: product.seoTitle,
    description: product.seoDescription,
    alternates: { canonical: url },
    openGraph: {
      title: product.seoTitle,
      description: product.seoDescription,
      url,
      siteName: "DANDY",
      images: [product.images.master],
    },
    twitter: {
      card: "summary_large_image",
      title: product.seoTitle,
      description: product.seoDescription,
      images: [product.images.master],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) notFound();
  const cat = getCategory(product.category);
  const off = discountPercent(product.mrp, product.sellingPrice);
  const related = await listProductsByCategory(product.category);
  const relatedFiltered = related.filter((p) => p.sku !== product.sku).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: site.name },
    description: product.description,
    image: product.images.master,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery product={product} />
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase">{cat?.name}</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl md:text-5xl">{product.name}</h1>
          <p className="mt-2 text-sm text-ink-soft">SKU {product.sku}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl">{formatInr(product.sellingPrice)}</span>
            {product.mrp != null && product.sellingPrice != null && product.mrp > product.sellingPrice && (
              <>
                <span className="text-ink-soft line-through">{formatInr(product.mrp)}</span>
                {off != null && (
                  <span className="text-sm font-semibold text-camel-dark">{off}% off</span>
                )}
              </>
            )}
          </div>
          <p className="mt-2 text-sm">
            {product.b2cAvailable ? "Available for enquiry" : "Currently unavailable"}
          </p>
          <p className="mt-1 text-sm">Colour: {product.colour}</p>
          <p className="mt-6 leading-relaxed text-ink-soft">{product.description}</p>
          <ProductActions product={product} />
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
        <ProductReviews productSku={product.sku} />
      </div>
      {relatedFiltered.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl">More in this collection</h2>
          <div className="mt-6 grid grid-cols-2 items-stretch gap-2.5 sm:gap-4 lg:grid-cols-4">
            {relatedFiltered.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
