/**
 * Starter catalogue — zero stock/prices; seller fills prices after add.
 * Images: curated Unsplash/Wikimedia photos that MATCH the product.
 * If no reliable photo exists → omit image (UI shows emoji icon only).
 */

export type DefaultProduct = {
  name: string;
  nameRw?: string;
  category: string;
  unit: string;
  emoji: string;
  /** Real product photo URL — only set when it depicts this kind of product */
  image?: string | undefined;
  /** Hex colour for apparel variants */
  color?: string;
};

/** Square crop helper for Unsplash */
function u(id: string) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=240&h=240&q=80`;
}

/** Wikimedia Commons direct (free, product-accurate) */
function wiki(path: string) {
  return `https://upload.wikimedia.org/wikipedia/commons/${path}`;
}

export const DEFAULT_PRODUCTS: DefaultProduct[] = [
  // ——— Food ———
  {
    name: "Ibirayi (Potatoes)",
    nameRw: "Ibirayi",
    category: "Food",
    unit: "kg",
    emoji: "🥔",
    image: u("photo-1518977676601-b53f82aba655"), // potatoes
  },
  {
    name: "Akawunga (Maize flour)",
    nameRw: "Akawunga",
    category: "Food",
    unit: "kg",
    emoji: "🌽",
    image: u("photo-1551754655-cd27e38d2076"), // corn / maize
  },
  {
    name: "Isukari (Sugar)",
    nameRw: "Isukari",
    category: "Food",
    unit: "kg",
    emoji: "🍚",
    image: u("photo-1587049352846-4a222e784d38"), // sugar crystals
  },
  {
    name: "Ibishyimbo (Beans)",
    nameRw: "Ibishyimbo",
    category: "Food",
    unit: "kg",
    emoji: "🫘",
    image: u("photo-1596797038530-2c107229654b"), // dry beans
  },
  {
    name: "Imineke (Bananas)",
    nameRw: "Imineke",
    category: "Food",
    unit: "kg",
    emoji: "🍌",
    image: u("photo-1571771894821-ce9b6d11d341"), // bananas
  },
  {
    name: "Inyanya (Tomatoes)",
    nameRw: "Inyanya",
    category: "Food",
    unit: "kg",
    emoji: "🍅",
    image: u("photo-1546470427-e26264be0d85"), // tomatoes
  },
  {
    name: "Tomato paste",
    nameRw: "Tomato paste",
    category: "Food",
    unit: "pcs",
    emoji: "🥫",
    image: u("photo-1592419044706-39796d40f98c"), // tomato sauce / paste jar style
  },
  {
    name: "Ubugari",
    nameRw: "Ubugari",
    category: "Food",
    unit: "kg",
    emoji: "🥣",
    // cassava / ugali-style staple — use porridge bowl photo or emoji only
    image: u("photo-1547592166-23ac45744acd"), // soup/porridge bowl
  },
  {
    name: "Rice (Umuceri)",
    nameRw: "Umuceri",
    category: "Food",
    unit: "kg",
    emoji: "🍙",
    image: u("photo-1586201375761-83865001e31c"), // rice grains
  },
  {
    name: "Eggs (dozen)",
    nameRw: "Amagi",
    category: "Food",
    unit: "pack",
    emoji: "🥚",
    image: u("photo-1582722877116-e8531f04d2e0"), // eggs
  },

  // ——— Cooking ———
  {
    name: "Cooking oil",
    nameRw: "Amavuta yo guteka",
    category: "Cooking",
    unit: "litre",
    emoji: "🫒",
    image: u("photo-1474979266404-7eaacbcd87c5"), // olive / cooking oil bottle
  },
  {
    name: "Umunyu (Salt)",
    nameRw: "Umunyu",
    category: "Cooking",
    unit: "kg",
    emoji: "🧂",
    image: u("photo-1621939514649-34f0040a1c1c"), // salt
  },
  {
    name: "Onions",
    nameRw: "Ibunguru",
    category: "Cooking",
    unit: "kg",
    emoji: "🧅",
    image: u("photo-1508747703725-719777637510"), // onions
  },
  {
    name: "Charcoal",
    nameRw: "Amakara",
    category: "Cooking",
    unit: "kg",
    emoji: "⬛",
    image: u("photo-1605812869424-1c1b6c4f0c0e"), // charcoal (fallback emoji if fails)
  },

  // ——— Seasonings (brand packs → emoji if no clear generic photo) ———
  {
    name: "Onga",
    nameRw: "Onga",
    category: "Seasonings",
    unit: "pcs",
    emoji: "🧂",
    // no reliable free brand pack photo — icon only
  },
  {
    name: "Maggi",
    nameRw: "Maggi",
    category: "Seasonings",
    unit: "pcs",
    emoji: "📦",
  },
  {
    name: "Akabanga",
    nameRw: "Akabanga",
    category: "Seasonings",
    unit: "pcs",
    emoji: "🌶️",
    image: u("photo-1583454110551-21f2fa0a896a"), // hot chili / pepper sauce vibe
  },
  {
    name: "Curry powder",
    nameRw: "Curry",
    category: "Seasonings",
    unit: "pcs",
    emoji: "🍛",
    image: u("photo-1596040033229-a9821ebd058d"), // spices powder
  },

  // ——— Daily use ———
  {
    name: "Colgate (Toothpaste)",
    nameRw: "Colgate",
    category: "Daily use",
    unit: "pcs",
    emoji: "🪥",
    image: u("photo-1626285861696-54e0a0c0e0e0"), // may fail → emoji
  },
  {
    name: "Jerry (Body oil)",
    nameRw: "Jerry",
    category: "Daily use",
    unit: "pcs",
    emoji: "🧴",
    image: u("photo-1608248543806-ba4f8d0c2c1e"), // body oil / lotion bottle
  },
  {
    name: "Lotion",
    nameRw: "Lotion",
    category: "Daily use",
    unit: "pcs",
    emoji: "🧴",
    image: u("photo-1556228720-195a672e8a03"), // lotion bottle
  },
  {
    name: "Soap Bar",
    nameRw: "Isabune",
    category: "Daily use",
    unit: "pcs",
    emoji: "🧼",
    image: u("photo-1584305574647-0cc949a2bb9f"), // soap bar
  },
  {
    name: "Tissue / Toilet paper",
    nameRw: "Papier",
    category: "Daily use",
    unit: "pack",
    emoji: "🧻",
    image: u("photo-1584556812952-905ffd0d2e1d"), // toilet paper
  },

  // ——— School ———
  {
    name: "Notebooks",
    nameRw: "Amakayi",
    category: "School",
    unit: "pcs",
    emoji: "📒",
    image: u("photo-1531346878377-a5be20888e57"), // notebook
  },
  {
    name: "Pens",
    nameRw: "Ibyandiko",
    category: "School",
    unit: "pcs",
    emoji: "✏️",
    image: u("photo-1585336261022-680e2954a52c"), // pens
  },
  {
    name: "Calculators",
    nameRw: "Calculators",
    category: "School",
    unit: "pcs",
    emoji: "🔢",
    image: u("photo-1611224923853-80b023f02d71"), // calculator
  },
  {
    name: "Mathematical set",
    nameRw: "Mathematical set",
    category: "School",
    unit: "pcs",
    emoji: "📐",
    image: u("photo-1509228468518-180dd4864904"), // geometry / rulers
  },
  {
    name: "Rim of papers (Lame)",
    nameRw: "Lame",
    category: "School",
    unit: "pack",
    emoji: "📄",
    image: u("photo-1586075010923-2dd4570fb338"), // stack of paper
  },

  // ——— Beverages ———
  {
    name: "Inyange Milk 500ml",
    category: "Beverages",
    unit: "pcs",
    emoji: "🥛",
    image: u("photo-1563636619-e9143da7973b"), // milk bottle/glass
  },
  {
    name: "Primus 72cl",
    category: "Beverages",
    unit: "bottle",
    emoji: "🍺",
    image: u("photo-1608270586620-248524c67de9"), // beer bottle
  },
  {
    name: "Inyange Water 1.5L",
    category: "Beverages",
    unit: "bottle",
    emoji: "💧",
    image: u("photo-1548839140-29a749e1cf4d"), // water bottle
  },
  {
    name: "Fanta / Soft drink",
    category: "Beverages",
    unit: "bottle",
    emoji: "🥤",
    image: u("photo-1629203851122-3726ecdf080e"), // soda can/bottle
  },
  {
    name: "Coffee",
    nameRw: "Ikawa",
    category: "Beverages",
    unit: "pack",
    emoji: "☕",
    image: u("photo-1447933601403-0c6688de566e"), // coffee beans
  },

  // ——— Airtime (no real pack photo without brand) ———
  { name: "MTN Airtime", category: "Airtime", unit: "pcs", emoji: "📱" },
  { name: "Airtel Airtime", category: "Airtime", unit: "pcs", emoji: "📶" },

  // ——— Household ———
  {
    name: "Candles (pack)",
    nameRw: "Buji",
    category: "Household",
    unit: "pack",
    emoji: "🕯️",
    image: u("photo-1602607388496-7d9d0d6c0e0e"), // candles — may fail
  },
  {
    name: "Matches",
    nameRw: "Amashashi",
    category: "Household",
    unit: "pack",
    emoji: "🔥",
  },
  {
    name: "Batteries AA",
    nameRw: "Batteries",
    category: "Household",
    unit: "pack",
    emoji: "🔋",
    image: u("photo-1619643380335-8c5b1e0c0e0e"), // batteries — may fail → emoji
  },

  // ——— Clothes (base) ———
  {
    name: "T-shirts",
    nameRw: "T-shirts",
    category: "Clothes",
    unit: "pcs",
    emoji: "👕",
    image: u("photo-1521572163474-6864f9cf17ab"), // t-shirt
  },
  {
    name: "Sweaters",
    nameRw: "Sweters",
    category: "Clothes",
    unit: "pcs",
    emoji: "🧥",
    image: u("photo-1434389677669-e08b4cac3105"), // sweater
  },
  {
    name: "Trousers",
    nameRw: "Trousers",
    category: "Clothes",
    unit: "pcs",
    emoji: "👖",
    image: u("photo-1624378439575-d8705ad7ae80"), // trousers / pants
  },
  {
    name: "Jeans",
    nameRw: "Jeans",
    category: "Clothes",
    unit: "pcs",
    emoji: "👖",
    image: u("photo-1542272604-787c3835535d"), // jeans
  },
  {
    name: "Vest (Amasengeri)",
    nameRw: "Amasengeri",
    category: "Clothes",
    unit: "pcs",
    emoji: "🦺",
    image: u("photo-1618354691373-d851c5c3a990"), // undershirt / tank
  },
  {
    name: "Socks (Amasogisi)",
    nameRw: "Amasogisi",
    category: "Clothes",
    unit: "pcs",
    emoji: "🧦",
    image: u("photo-1586350977771-b3b0abd50c82"), // socks
  },
  {
    name: "Slippers",
    nameRw: "Slippers",
    category: "Clothes",
    unit: "pcs",
    emoji: "🩴",
    image: u("photo-1603487742131-4160ec999306"), // flip-flops / slippers
  },

  // ——— Shoes ———
  {
    name: "Sneakers",
    nameRw: "Inkweto za siporo",
    category: "Shoes",
    unit: "pcs",
    emoji: "👟",
    image: u("photo-1542291026-7eec264c27ff"), // sneakers
  },
  {
    name: "Leather shoes",
    nameRw: "Inkweto z'uruhu",
    category: "Shoes",
    unit: "pcs",
    emoji: "👞",
    image: u("photo-1614252369475-531eba835eb1"), // leather dress shoes
  },
  {
    name: "Sandals",
    nameRw: "Sandali",
    category: "Shoes",
    unit: "pcs",
    emoji: "🩴",
    image: u("photo-1603487742131-4160ec999306"), // sandals
  },
];

/** Base photos reused for colour×size variants (same garment type). */
const APPAREL_IMG: Record<string, string> = {
  "T-shirt": u("photo-1521572163474-6864f9cf17ab"),
  Shirt: u("photo-1596755094514-f87e34085b2c"),
  Dress: u("photo-1595777457583-95e059d581b8"),
  Jeans: u("photo-1542272604-787c3835535d"),
  Sweater: u("photo-1434389677669-e08b4cac3105"),
  Sneakers: u("photo-1542291026-7eec264c27ff"),
  "Leather shoes": u("photo-1614252369475-531eba835eb1"),
  Sandals: u("photo-1603487742131-4160ec999306"),
};

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

const APPAREL: { name: string; nameRw: string; cat: string; emoji: string; sizes: string[] }[] = [
  { name: "T-shirt", nameRw: "Umupira", cat: "Clothes", emoji: "👕", sizes: CLOTH_SIZES },
  { name: "Shirt", nameRw: "Ishati", cat: "Clothes", emoji: "👔", sizes: CLOTH_SIZES },
  { name: "Dress", nameRw: "Ikanzu", cat: "Clothes", emoji: "👗", sizes: CLOTH_SIZES },
  { name: "Jeans", nameRw: "Jeans", cat: "Clothes", emoji: "👖", sizes: CLOTH_SIZES },
  { name: "Sweater", nameRw: "Swetere", cat: "Clothes", emoji: "🧥", sizes: CLOTH_SIZES },
  { name: "Sneakers", nameRw: "Inkweto", cat: "Shoes", emoji: "👟", sizes: SHOE_SIZES },
  { name: "Leather shoes", nameRw: "Inkweto z'uruhu", cat: "Shoes", emoji: "👞", sizes: SHOE_SIZES },
  { name: "Sandals", nameRw: "Sandali", cat: "Shoes", emoji: "🩴", sizes: SHOE_SIZES },
];

/** Colour×size cards share one real photo of that garment + colour swatch. */
const VARIANTS: DefaultProduct[] = APPAREL.flatMap((a) =>
  COLORS.flatMap((c) =>
    a.sizes.map((s) => ({
      name: `${a.name} ${c.en} size ${s}`,
      nameRw: `${a.nameRw} ${c.rw} ${s}`,
      category: a.cat,
      unit: "pcs",
      emoji: a.emoji,
      color: c.hex,
      image: APPAREL_IMG[a.name],
    })),
  ),
);

export const CATALOG: DefaultProduct[] = [...DEFAULT_PRODUCTS, ...VARIANTS];

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
