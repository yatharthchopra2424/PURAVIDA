import { Category } from "@/types";

export const categories: Category[] = [
  {
    id: "herbal-extracts",
    name: "Herbal Extracts",
    slug: "herbal-extracts",
    label: "Premium Extracts",
    description:
      "High-potency standardized extracts from premium botanicals, manufactured under strict GMP conditions to ensure consistent active compound levels.",
    image: "/images/Product%20Card%20Backgrounds.png",
    subcategories: [
      "Root Extracts",
      "Leaf Extracts",
      "Bark Extracts",
      "Fruit Extracts",
      "Flower Extracts",
    ],
    exampleProducts: ["Curcumin 95%", "Piperine 95%", "Ashwagandha Root"],
    productCount: 67,
  },
  {
    id: "essential-oils",
    name: "Essential Oils",
    slug: "essential-oils",
    label: "Therapeutic Grade",
    description:
      "Pure, therapeutic-grade essential oils sourced from the finest botanicals across India. Steam distilled and cold-pressed for maximum potency.",
    image: "/images/Product%20Card%20Backgrounds.png",
    subcategories: [
      "Floral Oils",
      "Herbal Oils",
      "Spice Oils",
      "Wood Oils",
      "Citrus Oils",
    ],
    exampleProducts: ["Clove Leaf Oil", "Eucalyptus Oil", "Peppermint Oil"],
    productCount: 30,
  },
  {
    id: "oleoresins",
    name: "Oleoresins",
    slug: "oleoresins",
    label: "High Potency",
    description:
      "Concentrated oleoresins capturing the complete flavor and bioactive profile of spices and herbs through advanced solvent extraction.",
    image: "/images/Product%20Card%20Backgrounds.png",
    subcategories: [
      "Spice Oleoresins",
      "Herb Oleoresins",
      "Capsicum Oleoresins",
    ],
    exampleProducts: [
      "Turmeric Oleoresin",
      "Paprika Oleoresin",
      "Black Pepper Oleoresin",
    ],
    productCount: 18,
  },
  {
    id: "nutraceuticals",
    name: "Nutraceuticals",
    slug: "nutraceuticals",
    label: "Health & Wellness",
    description:
      "Comprehensive range of nutraceutical ingredients for dietary supplements, functional foods, and wellness products. Backed by clinical research.",
    image: "/images/Product%20Card%20Backgrounds.png",
    subcategories: [
      "Vitamins & Minerals",
      "Probiotics",
      "Omega Fatty Acids",
      "Plant Proteins",
      "Dietary Fibers",
    ],
    exampleProducts: ["L-Glutamine", "Omega-3 Fish Oil", "Collagen Peptides"],
    productCount: 37,
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
