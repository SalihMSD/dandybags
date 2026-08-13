export type CategorySlug =
  | "school-bags"
  | "college-bags"
  | "backpacks"
  | "travel-bags"
  | "sling-bags"
  | "handbags"
  | "ladies-purses";

export type Category = {
  slug: CategorySlug;
  name: string;
  short: string;
  description: string;
  image: string;
};

export const categories: Category[] = [
  {
    slug: "school-bags",
    name: "School Bags",
    short: "Designed for everyday school journeys.",
    description:
      "School bags made for daily use — books, bottles and the route from home to class.",
    image: "/categories/school-bags.svg",
  },
  {
    slug: "college-bags",
    name: "College Bags",
    short: "Functional styles for campus life.",
    description:
      "College bags shaped for campus days — laptop space, commute, and class to café.",
    image: "/categories/college-bags.svg",
  },
  {
    slug: "backpacks",
    name: "Backpacks",
    short: "Everyday comfort with practical design.",
    description:
      "Backpacks for everyday carry — balanced, practical, and easy to live with.",
    image: "/categories/backpacks.svg",
  },
  {
    slug: "travel-bags",
    name: "Travel Bags",
    short: "Made for journeys big and small.",
    description:
      "Travel bags for weekends and longer journeys — organised, durable, ready to go.",
    image: "/categories/travel-bags.svg",
  },
  {
    slug: "sling-bags",
    name: "Sling Bags",
    short: "Compact, convenient and effortless.",
    description:
      "Sling bags for light days — compact, hands-free, and easy to wear.",
    image: "/categories/sling-bags.svg",
  },
  {
    slug: "handbags",
    name: "Handbags",
    short: "Everyday style with practical space.",
    description:
      "Handbags for work and outings — considered style with usable space.",
    image: "/categories/handbags.svg",
  },
  {
    slug: "ladies-purses",
    name: "Ladies Purses",
    short: "Elegant essentials for every occasion.",
    description:
      "Ladies purses as everyday essentials — compact, considered, and easy to carry.",
    image: "/categories/ladies-purses.svg",
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
