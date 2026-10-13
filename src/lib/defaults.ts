/**
 * Starter catalogue — zero stock/prices; seller fills prices after add.
 * Images: free picsum seed URLs (no API key) + solid color for apparel variants.
 */

export type DefaultProduct = {
  name: string;
  nameRw?: string;
  category: string;
  unit: string;
  emoji: string;
  /** Optional photo URL (loaded when online; emoji is offline fallback) */
  image?: string;
  /** Hex color for apparel colour variants */
  color?: string;
};

/** Deterministic free image — no API key, works when online. */
function img(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/240/240`;
}

/** Base shop products (every category must have items so pills are never empty). */
export const DEFAULT_PRODUCTS: DefaultProduct[] = [
  // Food
  { name: "Ibirayi (Potatoes)", nameRw: "Ibirayi", category: "Food", unit: "kg", emoji: "🥔", image: img("potatoes") },
  { name: "Akawunga (Maize flour)", nameRw: "Akawunga", category: "Food", unit: "kg", emoji: "🌽", image: img("maize-flour") },
  { name: "Isukari (Sugar)", nameRw: "Isukari", category: "Food", unit: "kg", emoji: "🍚", image: img("sugar") },
  { name: "Ibishyimbo (Beans)", nameRw: "Ibishyimbo", category: "Food", unit: "kg", emoji: "🫘", image: img("beans") },
  { name: "Imineke (Bananas)", nameRw: "Imineke", category: "Food", unit: "kg", emoji: "🍌", image: img("bananas") },
  { name: "Inyanya (Tomatoes)", nameRw: "Inyanya", category: "Food", unit: "kg", emoji: "🍅", image: img("tomatoes") },
  { name: "Tomato paste", nameRw: "Tomato paste", category: "Food", unit: "pcs", emoji: "🥫", image: img("tomato-paste") },
  { name: "Ubugari", nameRw: "Ubugari", category: "Food", unit: "kg", emoji: "🥣", image: img("ubugari") },
  { name: "Rice (Umuceri)", nameRw: "Umuceri", category: "Food", unit: "kg", emoji: "🍙", image: img("rice") },
  { name: "Eggs (dozen)", nameRw: "Amagi", category: "Food", unit: "pack", emoji: "🥚", image: img("eggs") },
  // Cooking
  { name: "Cooking oil", nameRw: "Amavuta yo guteka", category: "Cooking", unit: "litre", emoji: "🫒", image: img("cooking-oil") },
  { name: "Umunyu (Salt)", nameRw: "Umunyu", category: "Cooking", unit: "kg", emoji: "🧂", image: img("salt") },
  { name: "Onions", nameRw: "Ibunguru", category: "Cooking", unit: "kg", emoji: "🧅", image: img("onions") },
  { name: "Charcoal", nameRw: "Amakara", category: "Cooking", unit: "kg", emoji: "⬛", image: img("charcoal") },
  // Seasonings
  { name: "Onga", nameRw: "Onga", category: "Seasonings", unit: "pcs", emoji: "🧂", image: img("onga") },
  { name: "Maggi", nameRw: "Maggi", category: "Seasonings", unit: "pcs", emoji: "📦", image: img("maggi") },
  { name: "Akabanga", nameRw: "Akabanga", category: "Seasonings", unit: "pcs", emoji: "🌶️", image: img("akabanga") },
  { name: "Curry powder", nameRw: "Curry", category: "Seasonings", unit: "pcs", emoji: "🍛", image: img("curry") },
  // Daily use
  { name: "Colgate (Toothpaste)", nameRw: "Colgate", category: "Daily use", unit: "pcs", emoji: "🪥", image: img("toothpaste") },
  { name: "Jerry (Body oil)", nameRw: "Jerry", category: "Daily use", unit: "pcs", emoji: "🧴", image: img("body-oil") },
  { name: "Lotion", nameRw: "Lotion", category: "Daily use", unit: "pcs", emoji: "🧴", image: img("lotion") },
  { name: "Soap Bar", nameRw: "Isabune", category: "Daily use", unit: "pcs", emoji: "🧼", image: img("soap") },
  { name: "Tissue / Toilet paper", nameRw: "Papier", category: "Daily use", unit: "pack", emoji: "🧻", image: img("tissue") },
  // School
  { name: "Notebooks", nameRw: "Amakayi", category: "School", unit: "pcs", emoji: "📒", image: img("notebook") },
  { name: "Pens", nameRw: "Ibyandiko", category: "School", unit: "pcs", emoji: "✏️", image: img("pens") },
  { name: "Calculators", nameRw: "Calculators", category: "School", unit: "pcs", emoji: "🔢", image: img("calculator") },
  { name: "Mathematical set", nameRw: "Mathematical set", category: "School", unit: "pcs", emoji: "📐", image: img("math-set") },
  { name: "Rim of papers (Lame)", nameRw: "Lame", category: "School", unit: "pack", emoji: "📄", image: img("paper-rim") },
  // Beverages
  { name: "Inyange Milk 500ml", category: "Beverages", unit: "pcs", emoji: "🥛", image: img("milk") },
  { name: "Primus 72cl", category: "Beverages", unit: "bottle", emoji: "🍺", image: img("beer") },
  { name: "Inyange Water 1.5L", category: "Beverages", unit: "bottle", emoji: "💧", image: img("water") },
  { name: "Fanta / Soft drink", category: "Beverages", unit: "bottle", emoji: "🥤", image: img("soda") },
  { name: "Coffee", nameRw: "Ikawa", category: "Beverages", unit: "pack", emoji: "☕", image: img("coffee") },
  // Airtime
  { name: "MTN Airtime", category: "Airtime", unit: "pcs", emoji: "📱", image: img("mtn") },
  { name: "Airtel Airtime", category: "Airtime", unit: "pcs", emoji: "📶", image: img("airtel") },
  // Household
  { name: "Candles (pack)", nameRw: "Buji", category: "Household", unit: "pack", emoji: "🕯️", image: img("candles") },
  { name: "Matches", nameRw: "Amashashi", category: "Household", unit: "pack", emoji: "火柴", image: img("matches") },
  { name: "Batteries AA", nameRw: "Batteries", category: "Household", unit: "pack", emoji: "🔋", image: img("batteries") },
  // Clothes base (also expanded via variants)
  { name: "T-shirts", nameRw: "T-shirts", category: "Clothes", unit: "pcs", emoji: "👕", image: img("tshirt") },
  { name: "Sweaters", nameRw: "Sweters", category: "Clothes", unit: "pcs", emoji: "🧥", image: img("sweater") },
  { name: "Trousers", nameRw: "Trousers", category: "Clothes", unit: "pcs", emoji: "👖", image: img("trousers") },
  { name: "Jeans", nameRw: "Jeans", category: "Clothes", unit: "pcs", emoji: "👖", image: img("jeans") },
  { name: "Vest (Amasengeri)", nameRw: "Amasengeri", category: "Clothes", unit: "pcs", emoji: "🦺", image: img("vest") },
  { name: "Socks (Amasogisi)", nameRw: "Amasogisi", category: "Clothes", unit: "pcs", emoji: "🧦", image: img("socks") },
  { name: "Slippers", nameRw: "Slippers", category: "Clothes", unit: "pcs", emoji: "🩴", image: img("slippers") },
  // Shoes base
  { name: "Sneakers", nameRw: "Inkweto za siporo", category: "Shoes", unit: "pcs", emoji: "👟", image: img("sneakers") },
  { name: "Leather shoes", nameRw: "Inkweto z'uruhu", category: "Shoes", unit: "pcs", emoji: "👞", image: img("leather-shoes") },
  { name: "Sandals", nameRw: "Sandali", category: "Shoes", unit: "pcs", emoji: "🩴", image: img("sandals") },
];

/** Colour variants — distinct cards so look-alike items are not confused. */
const COLORS: { en: string; rw: string; hex: string }[] = [
  { en: "Black", rw: "Umukara", hex: "#1a1a1a" },
  { en: "White", rw: "Umweru", hex: "#f5f5f5" },
  { en: "Red", rw: "Umutuku", hex: "#dc2626" },
  { en: "Blue", rw: "Ubururu", hex: "#2563eb" },
  { en: "Green", rw: "Icyatsi", hex: "#16a34a" },
  { en: "Yellow", rw: "Umuhondo", hex: "#eab308" },
  { en: "Brown", rw: "Ikigina", hex: "#92400e" },
  { en: "Grey", rw: "Ikijuju", hex: "#6b7280" },
];

const CLOTH_SIZES = ["S", "M", "L", "XL"];
const SHOE_SIZES = ["38", "39", "40", "41", "42", "43"];

const APPAREL: { name: string; nameRw: string; cat: string; emoji: string; sizes: string[]; seed: string }[] = [
  { name: "T-shirt", nameRw: "Umupira", cat: "Clothes", emoji: "👕", sizes: CLOTH_SIZES, seed: "tshirt" },
  { name: "Shirt", nameRw: "Ishati", cat: "Clothes", emoji: "👔", sizes: CLOTH_SIZES, seed: "shirt" },
  { name: "Dress", nameRw: "Ikanzu", cat: "Clothes", emoji: "👗", sizes: CLOTH_SIZES, seed: "dress" },
  { name: "Jeans", nameRw: "Jeans", cat: "Clothes", emoji: "👖", sizes: CLOTH_SIZES, seed: "jeans-v" },
  { name: "Sweater", nameRw: "Swetere", cat: "Clothes", emoji: "🧥", sizes: CLOTH_SIZES, seed: "sweater-v" },
  { name: "Sneakers", nameRw: "Inkweto", cat: "Shoes", emoji: "👟", sizes: SHOE_SIZES, seed: "sneakers-v" },
  { name: "Leather shoes", nameRw: "Inkweto z'uruhu", cat: "Shoes", emoji: "👞", sizes: SHOE_SIZES, seed: "leather-v" },
  { name: "Sandals", nameRw: "Sandali", cat: "Shoes", emoji: "🩴", sizes: SHOE_SIZES, seed: "sandals-v" },
];

/** One card per colour×size so each stock line is unique. */
const VARIANTS: DefaultProduct[] = APPAREL.flatMap((a) =>
  COLORS.flatMap((c) =>
    a.sizes.map((s) => ({
      name: `${a.name} ${c.en} size ${s}`,
      nameRw: `${a.nameRw} ${c.rw} ${s}`,
      category: a.cat,
      unit: "pcs",
      emoji: a.emoji,
      color: c.hex,
      image: img(`${a.seed}-${c.en}-${s}`),
    })),
  ),
);

/** Full catalogue used by Defaults picker. */
export const CATALOG: DefaultProduct[] = [...DEFAULT_PRODUCTS, ...VARIANTS];

/** Stable category list for pills (All is added in UI). */
export const CATALOG_CATEGORIES = [
  "Food",
  "Cooking",
  "Seasonings",
  "Beverages",
  "Daily use",
  "School",
  "Household",
  "Airtime",
  "Clothes",
  "Shoes",
].filter((c) => CATALOG.some((p) => p.category === c));

export const DEFAULT_CATEGORIES = [...new Set(DEFAULT_PRODUCTS.map((p) => p.category))];
