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

function dummy(frontFile: string, lifestyleFile?: string): ProductImages {
  return {
    front: `/products/dummy/${frontFile}`,
    lifestyle: `/products/dummy/${lifestyleFile ?? "hero.jpg"}`,
  };
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
    images: partial.images ?? dummy("hero.jpg"),
    ...partial,
    seoTitle: partial.seoTitle || `${partial.name} | DANDY Bags`,
    seoDescription:
      partial.seoDescription ||
      `${partial.name} from DANDY, Karur — ${cat.short} Bags for every journey.`,
  };
}

const catalog: Array<{
  sku: string;
  slug: string;
  name: string;
  category: CategorySlug;
  subcategory: string;
  featured?: boolean;
  front: string;
  lifestyle: string;
  description: string;
}> = [
  {
    sku: "DND-SCH-001",
    slug: "school-bag-classic",
    name: "School Bag Classic",
    category: "school-bags",
    subcategory: "Daily school",
    featured: true,
    front: "school-classic.jpg",
    lifestyle: "school-everyday.jpg",
    description:
      "A school bag for everyday journeys. Full specifications and photography will be added after the product shoot.",
  },
  {
    sku: "DND-SCH-002",
    slug: "school-bag-everyday",
    name: "School Bag Everyday",
    category: "school-bags",
    subcategory: "Daily school",
    front: "school-everyday.jpg",
    lifestyle: "school-classic.jpg",
    description: "A practical school bag for daily use. Specification to be added.",
  },
  {
    sku: "DND-SCH-003",
    slug: "school-bag-junior",
    name: "School Bag Junior",
    category: "school-bags",
    subcategory: "Junior",
    front: "school-junior.jpg",
    lifestyle: "school-lite.jpg",
    description: "A school bag variety for younger everyday carry. Specification to be added.",
  },
  {
    sku: "DND-SCH-004",
    slug: "school-bag-trek",
    name: "School Bag Trek",
    category: "school-bags",
    subcategory: "Trek",
    front: "school-trek.jpg",
    lifestyle: "school-junior.jpg",
    description: "A school bag variety for active daily use. Specification to be added.",
  },
  {
    sku: "DND-SCH-005",
    slug: "school-bag-lite",
    name: "School Bag Lite",
    category: "school-bags",
    subcategory: "Lite",
    front: "school-lite.jpg",
    lifestyle: "school-trek.jpg",
    description: "A lighter school bag variety. Specification to be added.",
  },
  {
    sku: "DND-COL-001",
    slug: "college-bag-campus",
    name: "College Bag Campus",
    category: "college-bags",
    subcategory: "Campus",
    featured: true,
    front: "college-campus.jpg",
    lifestyle: "college-commute.jpg",
    description:
      "A college bag for campus life. Laptop fit and full specifications to be added after measurement.",
  },
  {
    sku: "DND-COL-002",
    slug: "college-bag-commute",
    name: "College Bag Commute",
    category: "college-bags",
    subcategory: "Commute",
    front: "college-commute.jpg",
    lifestyle: "college-campus.jpg",
    description: "A college bag for daily commute. Specification to be added.",
  },
  {
    sku: "DND-COL-003",
    slug: "college-bag-laptop",
    name: "College Bag Laptop",
    category: "college-bags",
    subcategory: "Laptop",
    front: "college-laptop.jpg",
    lifestyle: "college-studio.jpg",
    description: "A college bag variety for campus and laptop carry. Specification to be added.",
  },
  {
    sku: "DND-COL-004",
    slug: "college-bag-studio",
    name: "College Bag Studio",
    category: "college-bags",
    subcategory: "Studio",
    front: "college-studio.jpg",
    lifestyle: "college-daypack.jpg",
    description: "A college bag variety for studio and class days. Specification to be added.",
  },
  {
    sku: "DND-COL-005",
    slug: "college-bag-daypack",
    name: "College Bag Daypack",
    category: "college-bags",
    subcategory: "Daypack",
    front: "college-daypack.jpg",
    lifestyle: "college-laptop.jpg",
    description: "A daypack-style college bag. Specification to be added.",
  },
  {
    sku: "DND-BPK-001",
    slug: "everyday-backpack",
    name: "Everyday Backpack",
    category: "backpacks",
    subcategory: "Everyday",
    featured: true,
    front: "everyday-backpack.jpg",
    lifestyle: "utility-backpack.jpg",
    description: "An everyday backpack with practical design. Specification to be added.",
  },
  {
    sku: "DND-BPK-002",
    slug: "utility-backpack",
    name: "Utility Backpack",
    category: "backpacks",
    subcategory: "Utility",
    front: "utility-backpack.jpg",
    lifestyle: "everyday-backpack.jpg",
    description: "A utility backpack for daily carry. Specification to be added.",
  },
  {
    sku: "DND-BPK-003",
    slug: "city-backpack",
    name: "City Backpack",
    category: "backpacks",
    subcategory: "City",
    front: "backpack-city.jpg",
    lifestyle: "backpack-compact.jpg",
    description: "A backpack variety for city days. Specification to be added.",
  },
  {
    sku: "DND-BPK-004",
    slug: "trail-backpack",
    name: "Trail Backpack",
    category: "backpacks",
    subcategory: "Trail",
    front: "backpack-trail.jpg",
    lifestyle: "backpack-city.jpg",
    description: "A backpack variety for outdoor days. Specification to be added.",
  },
  {
    sku: "DND-BPK-005",
    slug: "compact-backpack",
    name: "Compact Backpack",
    category: "backpacks",
    subcategory: "Compact",
    front: "backpack-compact.jpg",
    lifestyle: "backpack-trail.jpg",
    description: "A compact backpack variety. Specification to be added.",
  },
  {
    sku: "DND-TRV-001",
    slug: "weekender-travel-bag",
    name: "Weekender Travel Bag",
    category: "travel-bags",
    subcategory: "Weekender",
    featured: true,
    front: "weekender.jpg",
    lifestyle: "duffle.jpg",
    description: "A travel bag for journeys big and small. Specification to be added.",
  },
  {
    sku: "DND-TRV-002",
    slug: "journey-duffle",
    name: "Journey Duffle",
    category: "travel-bags",
    subcategory: "Duffle",
    front: "duffle.jpg",
    lifestyle: "weekender.jpg",
    description: "A duffle-style travel bag. Specification to be added.",
  },
  {
    sku: "DND-TRV-003",
    slug: "cabin-travel-bag",
    name: "Cabin Travel Bag",
    category: "travel-bags",
    subcategory: "Cabin",
    front: "travel-cabin.jpg",
    lifestyle: "travel-overnight.jpg",
    description: "A travel bag variety for shorter trips. Specification to be added.",
  },
  {
    sku: "DND-TRV-004",
    slug: "overnight-travel-bag",
    name: "Overnight Travel Bag",
    category: "travel-bags",
    subcategory: "Overnight",
    front: "travel-overnight.jpg",
    lifestyle: "travel-tour.jpg",
    description: "A travel bag variety for overnight journeys. Specification to be added.",
  },
  {
    sku: "DND-TRV-005",
    slug: "tour-travel-bag",
    name: "Tour Travel Bag",
    category: "travel-bags",
    subcategory: "Tour",
    front: "travel-tour.jpg",
    lifestyle: "travel-cabin.jpg",
    description: "A travel bag variety for longer tours. Specification to be added.",
  },
  {
    sku: "DND-SLG-001",
    slug: "everyday-sling",
    name: "Everyday Sling",
    category: "sling-bags",
    subcategory: "Everyday",
    featured: true,
    front: "everyday-sling.jpg",
    lifestyle: "compact-sling.jpg",
    description: "A compact sling bag for effortless everyday carry. Specification to be added.",
  },
  {
    sku: "DND-SLG-002",
    slug: "compact-sling",
    name: "Compact Sling",
    category: "sling-bags",
    subcategory: "Compact",
    front: "compact-sling.jpg",
    lifestyle: "everyday-sling.jpg",
    description: "A compact sling bag. Specification to be added.",
  },
  {
    sku: "DND-SLG-003",
    slug: "crossbody-sling",
    name: "Crossbody Sling",
    category: "sling-bags",
    subcategory: "Crossbody",
    front: "sling-crossbody.jpg",
    lifestyle: "sling-mini.jpg",
    description: "A crossbody sling bag variety. Specification to be added.",
  },
  {
    sku: "DND-SLG-004",
    slug: "mini-sling",
    name: "Mini Sling",
    category: "sling-bags",
    subcategory: "Mini",
    front: "sling-mini.jpg",
    lifestyle: "sling-utility.jpg",
    description: "A mini sling bag variety. Specification to be added.",
  },
  {
    sku: "DND-SLG-005",
    slug: "utility-sling",
    name: "Utility Sling",
    category: "sling-bags",
    subcategory: "Utility",
    front: "sling-utility.jpg",
    lifestyle: "sling-crossbody.jpg",
    description: "A utility sling bag variety. Specification to be added.",
  },
  {
    sku: "DND-HND-001",
    slug: "everyday-handbag",
    name: "Everyday Handbag",
    category: "handbags",
    subcategory: "Everyday",
    featured: true,
    front: "everyday-handbag.jpg",
    lifestyle: "structured-handbag.jpg",
    description: "A handbag for everyday style with practical space. Specification to be added.",
  },
  {
    sku: "DND-HND-002",
    slug: "structured-handbag",
    name: "Structured Handbag",
    category: "handbags",
    subcategory: "Structured",
    front: "structured-handbag.jpg",
    lifestyle: "everyday-handbag.jpg",
    description: "A structured handbag. Specification to be added.",
  },
  {
    sku: "DND-HND-003",
    slug: "tote-handbag",
    name: "Tote Handbag",
    category: "handbags",
    subcategory: "Tote",
    front: "handbag-tote.jpg",
    lifestyle: "handbag-work.jpg",
    description: "A tote-style handbag variety. Specification to be added.",
  },
  {
    sku: "DND-HND-004",
    slug: "work-handbag",
    name: "Work Handbag",
    category: "handbags",
    subcategory: "Work",
    front: "handbag-work.jpg",
    lifestyle: "handbag-soft.jpg",
    description: "A work handbag variety. Specification to be added.",
  },
  {
    sku: "DND-HND-005",
    slug: "soft-handbag",
    name: "Soft Handbag",
    category: "handbags",
    subcategory: "Soft",
    front: "handbag-soft.jpg",
    lifestyle: "handbag-tote.jpg",
    description: "A soft handbag variety. Specification to be added.",
  },
  {
    sku: "DND-PRS-001",
    slug: "classic-purse",
    name: "Classic Purse",
    category: "ladies-purses",
    subcategory: "Classic",
    featured: true,
    front: "classic-purse.jpg",
    lifestyle: "occasion-purse.jpg",
    description: "A ladies purse for everyday occasions. Specification to be added.",
  },
  {
    sku: "DND-PRS-002",
    slug: "evening-purse",
    name: "Occasion Purse",
    category: "ladies-purses",
    subcategory: "Occasion",
    front: "occasion-purse.jpg",
    lifestyle: "classic-purse.jpg",
    description: "A ladies purse for occasions. Specification to be added.",
  },
  {
    sku: "DND-PRS-003",
    slug: "mini-purse",
    name: "Mini Purse",
    category: "ladies-purses",
    subcategory: "Mini",
    front: "purse-mini.jpg",
    lifestyle: "purse-clutch.jpg",
    description: "A mini ladies purse variety. Specification to be added.",
  },
  {
    sku: "DND-PRS-004",
    slug: "clutch-purse",
    name: "Clutch Purse",
    category: "ladies-purses",
    subcategory: "Clutch",
    front: "purse-clutch.jpg",
    lifestyle: "purse-zip.jpg",
    description: "A clutch-style ladies purse. Specification to be added.",
  },
  {
    sku: "DND-PRS-005",
    slug: "zip-purse",
    name: "Zip Purse",
    category: "ladies-purses",
    subcategory: "Zip",
    front: "purse-zip.jpg",
    lifestyle: "purse-mini.jpg",
    description: "A zip-close ladies purse variety. Specification to be added.",
  },
];

export const products: Product[] = catalog.map((row) =>
  item({
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    colour: "To be updated",
    b2cAvailable: true,
    b2bAvailable: true,
    featured: Boolean(row.featured),
    images: dummy(row.front, row.lifestyle),
    description: row.description,
  }),
);

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
