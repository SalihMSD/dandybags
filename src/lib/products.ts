import { categories, type CategorySlug } from "./categories";
import { SPEC_PLACEHOLDER } from "./site";

export type ProductImages = {
  front: string;
  back?: string;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  inside?: string;
  zipper?: string;
  strap?: string;
  lifestyle?: string;
};

export type Product = {
  sku: string;
  slug: string;
  name: string;
  category: CategorySlug;
  subcategory: string;
  images: ProductImages;
  colour: string;
  material: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  capacity: string;
  compartments: string;
  features: string[];
  mrp: number | null;
  sellingPrice: number | null;
  /** Never send this field to public product APIs. */
  b2bPrice: number | null;
  stock: number | null;
  b2cAvailable: boolean;
  b2bAvailable: boolean;
  featured: boolean;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

function placeholder(category: CategorySlug): ProductImages {
  const src = `/categories/${category}.svg`;
  return { front: src };
}

function item(
  partial: Omit<
    Product,
    | "material"
    | "weight"
    | "length"
    | "width"
    | "height"
    | "capacity"
    | "compartments"
    | "features"
    | "mrp"
    | "sellingPrice"
    | "b2bPrice"
    | "stock"
    | "images"
    | "seoTitle"
    | "seoDescription"
  > & {
    images?: ProductImages;
    seoTitle?: string;
    seoDescription?: string;
  },
): Product {
  const cat = categories.find((c) => c.slug === partial.category)!;
  return {
    material: SPEC_PLACEHOLDER,
    weight: SPEC_PLACEHOLDER,
    length: SPEC_PLACEHOLDER,
    width: SPEC_PLACEHOLDER,
    height: SPEC_PLACEHOLDER,
    capacity: SPEC_PLACEHOLDER,
    compartments: SPEC_PLACEHOLDER,
    features: [SPEC_PLACEHOLDER],
    mrp: null,
    sellingPrice: null,
    b2bPrice: null,
    stock: null,
    images: partial.images ?? placeholder(partial.category),
    ...partial,
    seoTitle: partial.seoTitle || `${partial.name} | DANDY Bags`,
    seoDescription:
      partial.seoDescription ||
      `${partial.name} from DANDY, Karur — ${cat.short} Bags for every journey.`,
  };
}

export const products: Product[] = [
  item({
    sku: "DND-SCH-001",
    slug: "school-bag-classic",
    name: "School Bag Classic",
    category: "school-bags",
    subcategory: "Daily school",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: true,
    description:
      "A school bag for everyday journeys. Full specifications and photography will be added after the product shoot.",
  }),
  item({
    sku: "DND-SCH-002",
    slug: "school-bag-everyday",
    name: "School Bag Everyday",
    category: "school-bags",
    subcategory: "Daily school",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: false,
    description:
      "A practical school bag for daily use. Specification to be added.",
  }),
  item({
    sku: "DND-COL-001",
    slug: "college-bag-campus",
    name: "College Bag Campus",
    category: "college-bags",
    subcategory: "Campus",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: true,
    description:
      "A college bag for campus life. Laptop fit and full specifications to be added after measurement.",
  }),
  item({
    sku: "DND-COL-002",
    slug: "college-bag-commute",
    name: "College Bag Commute",
    category: "college-bags",
    subcategory: "Commute",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: false,
    description: "A college bag for daily commute. Specification to be added.",
  }),
  item({
    sku: "DND-BPK-001",
    slug: "everyday-backpack",
    name: "Everyday Backpack",
    category: "backpacks",
    subcategory: "Everyday",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: true,
    description:
      "An everyday backpack with practical design. Specification to be added.",
  }),
  item({
    sku: "DND-BPK-002",
    slug: "utility-backpack",
    name: "Utility Backpack",
    category: "backpacks",
    subcategory: "Utility",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: false,
    description: "A utility backpack for daily carry. Specification to be added.",
  }),
  item({
    sku: "DND-TRV-001",
    slug: "weekender-travel-bag",
    name: "Weekender Travel Bag",
    category: "travel-bags",
    subcategory: "Weekender",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: true,
    description:
      "A travel bag for journeys big and small. Specification to be added.",
  }),
  item({
    sku: "DND-TRV-002",
    slug: "journey-duffle",
    name: "Journey Duffle",
    category: "travel-bags",
    subcategory: "Duffle",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: false,
    description: "A duffle-style travel bag. Specification to be added.",
  }),
  item({
    sku: "DND-SLG-001",
    slug: "everyday-sling",
    name: "Everyday Sling",
    category: "sling-bags",
    subcategory: "Everyday",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: true,
    description:
      "A compact sling bag for effortless everyday carry. Specification to be added.",
  }),
  item({
    sku: "DND-SLG-002",
    slug: "compact-sling",
    name: "Compact Sling",
    category: "sling-bags",
    subcategory: "Compact",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: false,
    description: "A compact sling bag. Specification to be added.",
  }),
  item({
    sku: "DND-HND-001",
    slug: "everyday-handbag",
    name: "Everyday Handbag",
    category: "handbags",
    subcategory: "Everyday",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: true,
    description:
      "A handbag for everyday style with practical space. Specification to be added.",
  }),
  item({
    sku: "DND-HND-002",
    slug: "structured-handbag",
    name: "Structured Handbag",
    category: "handbags",
    subcategory: "Structured",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: false,
    description: "A structured handbag. Specification to be added.",
  }),
  item({
    sku: "DND-PRS-001",
    slug: "classic-purse",
    name: "Classic Purse",
    category: "ladies-purses",
    subcategory: "Classic",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: true,
    description:
      "A ladies purse for everyday occasions. Specification to be added.",
  }),
  item({
    sku: "DND-PRS-002",
    slug: "evening-purse",
    name: "Occasion Purse",
    category: "ladies-purses",
    subcategory: "Occasion",
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: false,
    description: "A ladies purse for occasions. Specification to be added.",
  }),
];

export const dealers: {
  name: string;
  city: string;
  district: string;
  state: string;
  products: string;
  associationPeriod: string;
  logo?: string;
}[] = [];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getProductBySku(sku: string) {
  return products.find((p) => p.sku === sku);
}

export function productsByCategory(slug: CategorySlug) {
  return products.filter((p) => p.category === slug);
}

export function featuredProducts() {
  return products.filter((p) => p.featured);
}

export function publicProduct(product: Product) {
  const { b2bPrice: _hidden, ...rest } = product;
  void _hidden;
  return rest;
}

export function galleryImages(product: Product) {
  return Object.entries(product.images)
    .filter(([, src]) => Boolean(src))
    .map(([key, src]) => ({ key, src: src as string }));
}
