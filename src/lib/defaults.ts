/** Optional starter catalogue — zero stock/prices; seller fills prices after add. */
export type DefaultProduct = {
  name: string;
  nameRw?: string;
  category: string;
  unit: string;
  emoji: string;
};

export const DEFAULT_PRODUCTS: DefaultProduct[] = [
  { name: "Ibirayi (Potatoes)", nameRw: "Ibirayi", category: "Food", unit: "kg", emoji: "🥔" },
  { name: "Akawunga (Maize flour)", nameRw: "Akawunga", category: "Food", unit: "kg", emoji: "🌽" },
  { name: "Isukari (Sugar)", nameRw: "Isukari", category: "Food", unit: "kg", emoji: "🍚" },
  { name: "Ibishyimbo (Beans)", nameRw: "Ibishyimbo", category: "Food", unit: "kg", emoji: "🫘" },
  { name: "Imineke (Bananas)", nameRw: "Imineke", category: "Food", unit: "kg", emoji: "🍌" },
  { name: "Inyanya (Tomatoes)", nameRw: "Inyanya", category: "Food", unit: "kg", emoji: "🍅" },
  { name: "Tomato paste", nameRw: "Tomato paste", category: "Food", unit: "pcs", emoji: "🥫" },
  { name: "Ubugari", nameRw: "Ubugari", category: "Food", unit: "kg", emoji: "🥣" },
  { name: "Cooking oil", nameRw: "Amavuta yo guteka", category: "Cooking", unit: "litre", emoji: "🫒" },
  { name: "Umunyu (Salt)", nameRw: "Umunyu", category: "Cooking", unit: "kg", emoji: "🧂" },
  { name: "Onga", nameRw: "Onga", category: "Seasonings", unit: "pcs", emoji: "🧂" },
  { name: "Maggi", nameRw: "Maggi", category: "Seasonings", unit: "pcs", emoji: "📦" },
  { name: "Colgate (Toothpaste)", nameRw: "Colgate", category: "Daily use", unit: "pcs", emoji: "🪥" },
  { name: "Jerry (Body oil)", nameRw: "Jerry / Amavuta yo kwisiga", category: "Daily use", unit: "pcs", emoji: "🧴" },
  { name: "Lotion", nameRw: "Lotion", category: "Daily use", unit: "pcs", emoji: "🧴" },
  { name: "Soap Bar", nameRw: "Isabune", category: "Daily use", unit: "pcs", emoji: "🧼" },
  { name: "Notebooks", nameRw: "Amakayi", category: "School", unit: "pcs", emoji: "📒" },
  { name: "Pens", nameRw: "Ibyandiko", category: "School", unit: "pcs", emoji: "✏️" },
  { name: "Calculators", nameRw: "Calculators", category: "School", unit: "pcs", emoji: "🔢" },
  { name: "Mathematical set", nameRw: "Mathematical set", category: "School", unit: "pcs", emoji: "📐" },
  { name: "Rim of papers (Lame)", nameRw: "Lame / Rim", category: "School", unit: "pack", emoji: "📄" },
  { name: "Slippers", nameRw: "Slippers", category: "Clothes", unit: "pcs", emoji: "🩴" },
  { name: "T-shirts", nameRw: "T-shirts", category: "Clothes", unit: "pcs", emoji: "👕" },
  { name: "Sweaters", nameRw: "Sweters", category: "Clothes", unit: "pcs", emoji: "🧥" },
  { name: "Trousers", nameRw: "Trousers", category: "Clothes", unit: "pcs", emoji: "👖" },
  { name: "Jeans", nameRw: "Jeans", category: "Clothes", unit: "pcs", emoji: "👖" },
  { name: "Vest (Amasengeri)", nameRw: "Amasengeri", category: "Clothes", unit: "pcs", emoji: "🦺" },
  { name: "Socks (Amasogisi)", nameRw: "Amasogisi", category: "Clothes", unit: "pcs", emoji: "🧦" },
  { name: "Inyange Milk 500ml", category: "Beverages", unit: "pcs", emoji: "🥛" },
  { name: "Primus 72cl", category: "Beverages", unit: "bottle", emoji: "🍺" },
  { name: "Inyange Water 1.5L", category: "Beverages", unit: "bottle", emoji: "💧" },
  { name: "Fanta / Soft drink", category: "Beverages", unit: "bottle", emoji: "🥤" },
  { name: "Rice (Umuceri)", nameRw: "Umuceri", category: "Food", unit: "kg", emoji: "🍙" },
  { name: "MTN Airtime", category: "Airtime", unit: "pcs", emoji: "📱" },
  { name: "Airtel Airtime", category: "Airtime", unit: "pcs", emoji: "📶" },
];

export const DEFAULT_CATEGORIES = [
  ...new Set(DEFAULT_PRODUCTS.map((p) => p.category)),
];

/** Colour + size variants so look-alike items (e.g. two brands of T-shirt) get distinct cards. */
const COLORS: [string, string, string][] = [
  ["Black", "Umukara", "⚫"], ["White", "Umweru", "⚪"], ["Red", "Umutuku", "🔴"], ["Blue", "Ubururu", "🔵"],
  ["Green", "Icyatsi", "🟢"], ["Yellow", "Umuhondo", "🟡"], ["Brown", "Ikigina", "🟤"], ["Purple", "Move", "🟣"],
  ["Orange", "Orange", "🟠"],
];
const CLOTH_SIZES = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44"];
const APPAREL: { name: string; nameRw: string; cat: string; emoji: string; sizes: string[] }[] = [
  { name: "T-shirt", nameRw: "Umupira", cat: "Clothes", emoji: "👕", sizes: CLOTH_SIZES },
  { name: "Shirt", nameRw: "Ishati", cat: "Clothes", emoji: "👔", sizes: CLOTH_SIZES },
  { name: "Dress", nameRw: "Ikanzu", cat: "Clothes", emoji: "👗", sizes: CLOTH_SIZES },
  { name: "Jeans", nameRw: "Jeans", cat: "Clothes", emoji: "👖", sizes: CLOTH_SIZES },
  { name: "Sweater", nameRw: "Swetere", cat: "Clothes", emoji: "🧥", sizes: CLOTH_SIZES },
  { name: "Sneakers", nameRw: "Inkweto za siporo", cat: "Shoes", emoji: "👟", sizes: SHOE_SIZES },
  { name: "Leather shoes", nameRw: "Inkweto z'uruhu", cat: "Shoes", emoji: "👞", sizes: SHOE_SIZES },
  { name: "Heels", nameRw: "Inkweto ndende", cat: "Shoes", emoji: "👠", sizes: SHOE_SIZES },
  { name: "Sandals", nameRw: "Sandali", cat: "Shoes", emoji: "🩴", sizes: SHOE_SIZES },
];
const VARIANTS: DefaultProduct[] = APPAREL.flatMap((a) =>
  COLORS.flatMap(([c, cRw, dot]) =>
    a.sizes.map((s) => ({
      name: `${a.name} ${c} size ${s}`,
      nameRw: `${a.nameRw} ${cRw} ${s}`,
      category: a.cat,
      unit: "pcs",
      emoji: `${a.emoji}${dot}`,
    })),
  ),
);

/** Full searchable catalogue: base items + every colour/size variant. */
export const CATALOG: DefaultProduct[] = [...DEFAULT_PRODUCTS, ...VARIANTS];
export const CATALOG_CATEGORIES = [...new Set(CATALOG.map((p) => p.category))];
