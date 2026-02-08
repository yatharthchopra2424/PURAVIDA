import { Category } from "@/types";

export const categories: Category[] = [
  {
    id: "herbal-extracts",
    name: "Standardized Herbal Extracts",
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
    exampleProducts: ["Curcumin 95%", "Ashwagandha Root", "Green Tea Extract"],
    productCount: 45,
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
    id: "fruit-juice-powders",
    name: "Fruit Juice Powders",
    slug: "fruit-juice-powders",
    label: "Natural Concentrates",
    description:
      "Spray-dried fruit juice powders retaining the natural color, flavor, and nutritional profile of fresh fruits. Ideal for food & beverage applications.",
    image: "/images/Product%20Card%20Backgrounds.png",
    subcategories: [
      "Tropical Fruit Powders",
      "Berry Powders",
      "Citrus Powders",
    ],
    exampleProducts: ["Amla Powder", "Pomegranate Powder", "Mango Powder"],
    productCount: 15,
  },
  {
    id: "phytochemicals",
    name: "Phytochemicals",
    slug: "phytochemicals",
    label: "Research Grade",
    description:
      "High-purity phytochemical isolates for pharmaceutical, nutraceutical, and research applications. HPLC-verified for potency and purity.",
    image: "/images/Product%20Card%20Backgrounds.png",
    subcategories: [
      "Flavonoids",
      "Alkaloids",
      "Polyphenols",
      "Terpenoids",
      "Glycosides",
    ],
    exampleProducts: ["Curcuminoids", "Piperine 95%", "Quercetin"],
    productCount: 22,
  },
  {
    id: "amino-acids",
    name: "Amino Acids",
    slug: "amino-acids",
    label: "Essential Nutrients",
    description:
      "Pharmaceutical and food-grade amino acids manufactured to the highest purity standards. Available in both L-form and DL-form configurations.",
    image: "/images/Product%20Card%20Backgrounds.png",
    subcategories: [
      "Essential Amino Acids",
      "Non-Essential Amino Acids",
      "Branched-Chain Amino Acids",
    ],
    exampleProducts: ["L-Glutamine", "L-Arginine", "L-Lysine"],
    productCount: 12,
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
    exampleProducts: [
      "Omega-3 Fish Oil",
      "Collagen Peptides",
      "Glucosamine",
    ],
    productCount: 25,
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
