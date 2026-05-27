export interface ProduceItem {
  name: string;
  emoji: string;
  type: "fruit" | "vegetable";
}

export interface SeasonalProduceResult {
  fruits: ProduceItem[];
  vegetables: ProduceItem[];
  hemisphere: "north" | "south";
  zone: "temperate" | "tropical";
  month: number;
}

type MonthData = { fruits: ProduceItem[]; vegetables: ProduceItem[] };
type YearData = MonthData[];

const NORTH_TEMPERATE: YearData = [
  // January (0)
  {
    fruits: [
      { name: "Clementines", emoji: "🍊", type: "fruit" },
      { name: "Grapefruit", emoji: "🍊", type: "fruit" },
      { name: "Lemons", emoji: "🍋", type: "fruit" },
      { name: "Oranges", emoji: "🍊", type: "fruit" },
      { name: "Pears", emoji: "🍐", type: "fruit" },
    ],
    vegetables: [
      { name: "Brussels Sprouts", emoji: "🥦", type: "vegetable" },
      { name: "Cabbage", emoji: "🥬", type: "vegetable" },
      { name: "Kale", emoji: "🥬", type: "vegetable" },
      { name: "Leeks", emoji: "🧅", type: "vegetable" },
      { name: "Parsnips", emoji: "🥕", type: "vegetable" },
      { name: "Turnips", emoji: "🫚", type: "vegetable" },
    ],
  },
  // February (1)
  {
    fruits: [
      { name: "Blood Oranges", emoji: "🍊", type: "fruit" },
      { name: "Grapefruit", emoji: "🍊", type: "fruit" },
      { name: "Kumquats", emoji: "🍊", type: "fruit" },
      { name: "Lemons", emoji: "🍋", type: "fruit" },
    ],
    vegetables: [
      { name: "Cabbage", emoji: "🥬", type: "vegetable" },
      { name: "Cauliflower", emoji: "🥦", type: "vegetable" },
      { name: "Kale", emoji: "🥬", type: "vegetable" },
      { name: "Leeks", emoji: "🧅", type: "vegetable" },
      { name: "Shallots", emoji: "🧅", type: "vegetable" },
    ],
  },
  // March (2)
  {
    fruits: [
      { name: "Oranges", emoji: "🍊", type: "fruit" },
      { name: "Pineapple", emoji: "🍍", type: "fruit" },
      { name: "Strawberries", emoji: "🍓", type: "fruit" },
    ],
    vegetables: [
      { name: "Artichokes", emoji: "🫛", type: "vegetable" },
      { name: "Asparagus", emoji: "🌿", type: "vegetable" },
      { name: "Broccoli", emoji: "🥦", type: "vegetable" },
      { name: "Leeks", emoji: "🧅", type: "vegetable" },
      { name: "Spinach", emoji: "🥬", type: "vegetable" },
    ],
  },
  // April (3)
  {
    fruits: [
      { name: "Apricots", emoji: "🍑", type: "fruit" },
      { name: "Mangoes", emoji: "🥭", type: "fruit" },
      { name: "Pineapple", emoji: "🍍", type: "fruit" },
      { name: "Strawberries", emoji: "🍓", type: "fruit" },
    ],
    vegetables: [
      { name: "Artichokes", emoji: "🫛", type: "vegetable" },
      { name: "Asparagus", emoji: "🌿", type: "vegetable" },
      { name: "Peas", emoji: "🟢", type: "vegetable" },
      { name: "Radishes", emoji: "🫛", type: "vegetable" },
      { name: "Spinach", emoji: "🥬", type: "vegetable" },
    ],
  },
  // May (4)
  {
    fruits: [
      { name: "Apricots", emoji: "🍑", type: "fruit" },
      { name: "Cherries", emoji: "🍒", type: "fruit" },
      { name: "Rhubarb", emoji: "🌿", type: "fruit" },
      { name: "Strawberries", emoji: "🍓", type: "fruit" },
    ],
    vegetables: [
      { name: "Asparagus", emoji: "🌿", type: "vegetable" },
      { name: "Broccoli", emoji: "🥦", type: "vegetable" },
      { name: "Peas", emoji: "🟢", type: "vegetable" },
      { name: "Radishes", emoji: "🫛", type: "vegetable" },
      { name: "Zucchini", emoji: "🥒", type: "vegetable" },
    ],
  },
  // June (5)
  {
    fruits: [
      { name: "Blueberries", emoji: "🫐", type: "fruit" },
      { name: "Cherries", emoji: "🍒", type: "fruit" },
      { name: "Peaches", emoji: "🍑", type: "fruit" },
      { name: "Raspberries", emoji: "🍓", type: "fruit" },
      { name: "Strawberries", emoji: "🍓", type: "fruit" },
    ],
    vegetables: [
      { name: "Beets", emoji: "🫛", type: "vegetable" },
      { name: "Cucumbers", emoji: "🥒", type: "vegetable" },
      { name: "Green Beans", emoji: "🫘", type: "vegetable" },
      { name: "Summer Squash", emoji: "🥒", type: "vegetable" },
      { name: "Zucchini", emoji: "🥒", type: "vegetable" },
    ],
  },
  // July (6)
  {
    fruits: [
      { name: "Blackberries", emoji: "🫐", type: "fruit" },
      { name: "Blueberries", emoji: "🫐", type: "fruit" },
      { name: "Melons", emoji: "🍈", type: "fruit" },
      { name: "Peaches", emoji: "🍑", type: "fruit" },
      { name: "Plums", emoji: "🫐", type: "fruit" },
      { name: "Tomatoes", emoji: "🍅", type: "fruit" },
    ],
    vegetables: [
      { name: "Corn", emoji: "🌽", type: "vegetable" },
      { name: "Cucumbers", emoji: "🥒", type: "vegetable" },
      { name: "Eggplant", emoji: "🍆", type: "vegetable" },
      { name: "Peppers", emoji: "🫑", type: "vegetable" },
      { name: "Tomatoes", emoji: "🍅", type: "vegetable" },
    ],
  },
  // August (7)
  {
    fruits: [
      { name: "Blackberries", emoji: "🫐", type: "fruit" },
      { name: "Figs", emoji: "🍇", type: "fruit" },
      { name: "Melons", emoji: "🍈", type: "fruit" },
      { name: "Nectarines", emoji: "🍑", type: "fruit" },
      { name: "Plums", emoji: "🫐", type: "fruit" },
    ],
    vegetables: [
      { name: "Corn", emoji: "🌽", type: "vegetable" },
      { name: "Eggplant", emoji: "🍆", type: "vegetable" },
      { name: "Okra", emoji: "🫛", type: "vegetable" },
      { name: "Peppers", emoji: "🫑", type: "vegetable" },
      { name: "Tomatoes", emoji: "🍅", type: "vegetable" },
    ],
  },
  // September (8)
  {
    fruits: [
      { name: "Apples", emoji: "🍎", type: "fruit" },
      { name: "Grapes", emoji: "🍇", type: "fruit" },
      { name: "Pears", emoji: "🍐", type: "fruit" },
      { name: "Pomegranates", emoji: "🫐", type: "fruit" },
    ],
    vegetables: [
      { name: "Butternut Squash", emoji: "🎃", type: "vegetable" },
      { name: "Cauliflower", emoji: "🥦", type: "vegetable" },
      { name: "Leeks", emoji: "🧅", type: "vegetable" },
      { name: "Pumpkin", emoji: "🎃", type: "vegetable" },
      { name: "Sweet Potato", emoji: "🍠", type: "vegetable" },
    ],
  },
  // October (9)
  {
    fruits: [
      { name: "Apples", emoji: "🍎", type: "fruit" },
      { name: "Cranberries", emoji: "🍓", type: "fruit" },
      { name: "Grapes", emoji: "🍇", type: "fruit" },
      { name: "Pears", emoji: "🍐", type: "fruit" },
      { name: "Quinces", emoji: "🍐", type: "fruit" },
    ],
    vegetables: [
      { name: "Broccoli", emoji: "🥦", type: "vegetable" },
      { name: "Brussels Sprouts", emoji: "🥦", type: "vegetable" },
      { name: "Pumpkin", emoji: "🎃", type: "vegetable" },
      { name: "Sweet Potato", emoji: "🍠", type: "vegetable" },
      { name: "Turnips", emoji: "🫚", type: "vegetable" },
    ],
  },
  // November (10)
  {
    fruits: [
      { name: "Clementines", emoji: "🍊", type: "fruit" },
      { name: "Cranberries", emoji: "🍓", type: "fruit" },
      { name: "Pears", emoji: "🍐", type: "fruit" },
      { name: "Pomegranates", emoji: "🫐", type: "fruit" },
    ],
    vegetables: [
      { name: "Brussels Sprouts", emoji: "🥦", type: "vegetable" },
      { name: "Cabbage", emoji: "🥬", type: "vegetable" },
      { name: "Kale", emoji: "🥬", type: "vegetable" },
      { name: "Parsnips", emoji: "🥕", type: "vegetable" },
      { name: "Sweet Potato", emoji: "🍠", type: "vegetable" },
    ],
  },
  // December (11)
  {
    fruits: [
      { name: "Clementines", emoji: "🍊", type: "fruit" },
      { name: "Dates", emoji: "🍊", type: "fruit" },
      { name: "Grapefruit", emoji: "🍊", type: "fruit" },
      { name: "Pomegranates", emoji: "🫐", type: "fruit" },
    ],
    vegetables: [
      { name: "Brussels Sprouts", emoji: "🥦", type: "vegetable" },
      { name: "Cabbage", emoji: "🥬", type: "vegetable" },
      { name: "Kale", emoji: "🥬", type: "vegetable" },
      { name: "Leeks", emoji: "🧅", type: "vegetable" },
      { name: "Parsnips", emoji: "🥕", type: "vegetable" },
    ],
  },
];

// Tropical zone: year-round diversity, shifted slightly by month
const TROPICAL: YearData = Array.from({ length: 12 }, (_, m) => ({
  fruits: [
    { name: "Bananas", emoji: "🍌", type: "fruit" as const },
    { name: "Mangoes", emoji: "🥭", type: "fruit" as const },
    { name: "Papayas", emoji: "🍈", type: "fruit" as const },
    ...(m >= 10 || m <= 1 ? [{ name: "Lychees", emoji: "🍇", type: "fruit" as const }] : []),
    ...(m >= 5 && m <= 8 ? [{ name: "Rambutan", emoji: "🍇", type: "fruit" as const }] : []),
    ...(m >= 3 && m <= 6 ? [{ name: "Jackfruit", emoji: "🍈", type: "fruit" as const }] : []),
    { name: "Pineapples", emoji: "🍍", type: "fruit" as const },
    { name: "Coconuts", emoji: "🥥", type: "fruit" as const },
  ],
  vegetables: [
    { name: "Cassava", emoji: "🌿", type: "vegetable" as const },
    { name: "Okra", emoji: "🫛", type: "vegetable" as const },
    { name: "Sweet Potatoes", emoji: "🍠", type: "vegetable" as const },
    { name: "Yams", emoji: "🍠", type: "vegetable" as const },
    ...(m >= 6 && m <= 9 ? [{ name: "Corn", emoji: "🌽", type: "vegetable" as const }] : []),
    ...(m >= 2 && m <= 5 ? [{ name: "Eggplant", emoji: "🍆", type: "vegetable" as const }] : []),
  ],
}));

// Southern hemisphere: 6-month offset from northern temperate
function southTemperate(month: number): MonthData {
  return NORTH_TEMPERATE[(month + 6) % 12];
}

export function getSeasonalProduce(latitude: number, date: Date = new Date()): SeasonalProduceResult {
  const month = date.getMonth(); // 0-based
  const hemisphere: "north" | "south" = latitude >= 0 ? "north" : "south";
  const zone: "temperate" | "tropical" = Math.abs(latitude) < 23.5 ? "tropical" : "temperate";

  let data: MonthData;
  if (zone === "tropical") {
    data = TROPICAL[month];
  } else if (hemisphere === "north") {
    data = NORTH_TEMPERATE[month];
  } else {
    data = southTemperate(month);
  }

  return {
    fruits: data.fruits,
    vegetables: data.vegetables,
    hemisphere,
    zone,
    month: month + 1,
  };
}
