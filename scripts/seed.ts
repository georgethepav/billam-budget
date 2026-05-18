import { db } from "../db";
import {
  bankAccounts,
  budgetTargets,
  savingsGoals,
  categoryRules,
  subscriptions,
} from "../db/schema";

const ACTIVE_FROM = "2026-06-01";

type RuleSeed = {
  pattern: string;
  category: string;
  subcategory: string;
  priority: number;
  direction?: "credit" | "debit";
  markExcluded?: boolean;
};

const RULES: RuleSeed[] = [
  // PRIORITY 10 - HOUSING
  { pattern: "NATWEST BANK", category: "Housing", subcategory: "Mortgage", priority: 10 },
  { pattern: "NOTTM CITY COUNC", category: "Housing", subcategory: "Council Tax", priority: 10 },

  // PRIORITY 20 - INCOME
  { pattern: "BROOKER FLYNN ARCH", category: "Income", subcategory: "BFA Salary", priority: 20 },
  { pattern: "ESTELLE BILLAM", category: "Income", subcategory: "Estelle", priority: 20, direction: "credit" },
  { pattern: "HMRC CHILD", category: "Income", subcategory: "Child Benefit", priority: 20 },

  // PRIORITY 30 - TRANSFERS (excluded from spend totals)
  { pattern: "G BILLAM", category: "Transfer", subcategory: "Personal (George)", priority: 30, markExcluded: true },
  { pattern: "GEORGE BILLAM", category: "Transfer", subcategory: "Personal (George)", priority: 30, markExcluded: true },
  { pattern: "ESTELLE BILLAM", category: "Transfer", subcategory: "Personal (Estelle)", priority: 30, direction: "debit", markExcluded: true },
  { pattern: "PD SM BILLAM", category: "Transfer", subcategory: "Pocket Money", priority: 30, markExcluded: true },

  // PRIORITY 50 - UTILITIES
  { pattern: "BRITISH GAS", category: "Utilities", subcategory: "Energy", priority: 50 },
  { pattern: "OVO", category: "Utilities", subcategory: "Energy", priority: 50 },
  { pattern: "OCTOPUS", category: "Utilities", subcategory: "Energy", priority: 50 },
  { pattern: "E.ON NEXT", category: "Utilities", subcategory: "Energy", priority: 50 },
  { pattern: "EON NEXT", category: "Utilities", subcategory: "Energy", priority: 50 },
  { pattern: "SEVERN TRENT", category: "Utilities", subcategory: "Water", priority: 50 },
  { pattern: "TV LICENCE", category: "Utilities", subcategory: "TV Licence", priority: 50 },

  // PRIORITY 50 - INSURANCE
  { pattern: "ADMIRAL INSUR", category: "Insurance", subcategory: "Admiral", priority: 50 },
  { pattern: "ZURICH ASSUR", category: "Insurance", subcategory: "Zurich Life", priority: 50 },

  // PRIORITY 50 - FINANCE
  { pattern: "SANTANDER CONSUMER", category: "Finance", subcategory: "Santander Car", priority: 50 },
  { pattern: "DAILY OD INT", category: "Finance", subcategory: "Overdraft Interest", priority: 50 },
  { pattern: "CREATION.CO.UK", category: "Finance", subcategory: "Creation", priority: 50 },
  { pattern: "DVLA", category: "Finance", subcategory: "DVLA", priority: 50 },

  // PRIORITY 60 - SUBSCRIPTIONS
  { pattern: "APPLE.COM/BILL", category: "Subscriptions", subcategory: "Apple", priority: 60 },
  { pattern: "SPOTIFY", category: "Subscriptions", subcategory: "Spotify", priority: 60 },
  { pattern: "DISNEY", category: "Subscriptions", subcategory: "Disney+", priority: 60 },
  { pattern: "NETFLIX", category: "Subscriptions", subcategory: "Netflix", priority: 60 },
  { pattern: "AMAZON PRIME", category: "Subscriptions", subcategory: "Amazon Prime", priority: 60 },
  { pattern: "PRIME VIDEO", category: "Subscriptions", subcategory: "Amazon Prime", priority: 60 },
  { pattern: "OPENAI", category: "Subscriptions", subcategory: "OpenAI", priority: 60 },
  { pattern: "CHATGPT", category: "Subscriptions", subcategory: "OpenAI", priority: 60 },
  { pattern: "CLAUDE", category: "Subscriptions", subcategory: "Claude", priority: 60 },
  { pattern: "ANTHROPIC", category: "Subscriptions", subcategory: "Claude", priority: 60 },
  { pattern: "GOCARDLESS", category: "Subscriptions", subcategory: "GoCardless", priority: 60 },
  { pattern: "THREE ", category: "Subscriptions", subcategory: "Three Mobile", priority: 60 },

  // PRIORITY 70 - KIDS
  { pattern: "CHILDCARE ACCOUNT", category: "Kids", subcategory: "Childcare", priority: 70 },
  { pattern: "HAYDN PRIMARY", category: "Kids", subcategory: "School", priority: 70 },
  { pattern: "PAVIORS RUGBY", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "RUGBY ALLSTARS", category: "Kids", subcategory: "Rugby Allstars", priority: 70 },
  { pattern: "MAPPERLEY ALL STAR", category: "Kids", subcategory: "Rugby Allstars", priority: 70 },
  { pattern: "PULP FRICTION", category: "Kids", subcategory: "Pulp Friction", priority: 70 },
  { pattern: "FUN VALLEY", category: "Kids", subcategory: "Fun Valley", priority: 70 },
  { pattern: "SMYTHS TOYS", category: "Kids", subcategory: "Toys", priority: 70 },
  { pattern: "CARD FACTORY", category: "Kids", subcategory: "Toys", priority: 70 },
  { pattern: "YOTO", category: "Kids", subcategory: "Yoto", priority: 70 },
  { pattern: "NOTTINGHAM CONTACT", category: "Kids", subcategory: "Activities", priority: 70 },
  { pattern: "GEDLING BOROUGH COUNCIL", category: "Kids", subcategory: "Swimming", priority: 70 },

  // PRIORITY 80 - GROCERIES
  { pattern: "SAINSBURYS S/MKTS", category: "Groceries", subcategory: "Sainsburys", priority: 80 },
  { pattern: "SAINSBURYS SMKT", category: "Groceries", subcategory: "Sainsburys", priority: 80 },
  { pattern: "SAINSBURYS.CO.UK", category: "Groceries", subcategory: "Sainsburys", priority: 80 },
  { pattern: "CO-OP GROUP", category: "Groceries", subcategory: "Co-op", priority: 80 },
  { pattern: "COOPERATIVE", category: "Groceries", subcategory: "Co-op", priority: 80 },
  { pattern: "M&S", category: "Groceries", subcategory: "M&S", priority: 80 },
  { pattern: "MARKS&SPENCER", category: "Groceries", subcategory: "M&S", priority: 80 },
  { pattern: "TESCO", category: "Groceries", subcategory: "Other", priority: 80 },
  { pattern: "ALDI", category: "Groceries", subcategory: "Other", priority: 80 },
  { pattern: "LIDL", category: "Groceries", subcategory: "Other", priority: 80 },
  { pattern: "ASDA", category: "Groceries", subcategory: "Other", priority: 80 },
  { pattern: "WAITROSE", category: "Groceries", subcategory: "Other", priority: 80 },
  { pattern: "MORRISON", category: "Groceries", subcategory: "Other", priority: 80 },
  { pattern: "HOLLAND AND BARRET", category: "Groceries", subcategory: "Holland & Barrett", priority: 80 },

  // PRIORITY 80 - TRANSPORT
  { pattern: "SAINSBURYS PETROL", category: "Transport", subcategory: "Fuel", priority: 80 },
  { pattern: "BP WOLLATON", category: "Transport", subcategory: "Fuel", priority: 80 },
  { pattern: " BP ", category: "Transport", subcategory: "Fuel", priority: 80 },
  { pattern: "SHELL", category: "Transport", subcategory: "Fuel", priority: 80 },
  { pattern: "ESSO", category: "Transport", subcategory: "Fuel", priority: 80 },
  { pattern: "RONTEC", category: "Transport", subcategory: "Fuel", priority: 80 },
  { pattern: "MFG ", category: "Transport", subcategory: "Fuel", priority: 80 },
  { pattern: "RINGGO", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "BROADMARSH CAR PAR", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "NCC IPS", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "NCP", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "PARKING", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "APH AIRPORT", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "UBER", category: "Transport", subcategory: "Uber", priority: 80 },
  { pattern: "ROBIN HOOD", category: "Transport", subcategory: "Bus", priority: 80 },
  { pattern: "TRAINLINE", category: "Transport", subcategory: "Rail", priority: 80 },
  { pattern: "MAPPERLEY SERVICE", category: "Transport", subcategory: "Car Service", priority: 80 },
  { pattern: "CARRINGTON SERVICE", category: "Transport", subcategory: "Car Service", priority: 80 },
  { pattern: "MARSHALL OMODA", category: "Transport", subcategory: "Car Service", priority: 80 },

  // PRIORITY 90 - EATING OUT
  ...["WETHERSPOON", "WINCHESTER", "O NEILLS", "SLUG AND LETTUCE", "BURNT STUMP", "BISTRO LIVE", "NELSON", "FOX AND HOUNDS", "BELGRAVE ROOMS", "DAYBROOK", "MANAHATTA", "PEPES BAR", "V-SPOT"].map(
    (p): RuleSeed => ({ pattern: p, category: "Eating Out", subcategory: "Pub", priority: 90 })
  ),
  ...["COSTA", "CAFFE NERO", "STARBUCKS", "BROTHERSCOFFEE", "NYX", "PRET", "GEDLING CAFE"].map(
    (p): RuleSeed => ({ pattern: p, category: "Eating Out", subcategory: "Coffee", priority: 90 })
  ),
  ...["MCDONALDS", "KFC", "BURGER KING", "SUBWAY", "GREGGS", "PIZZA HUT", "DOMINO"].map(
    (p): RuleSeed => ({ pattern: p, category: "Eating Out", subcategory: "Fast Food", priority: 90 })
  ),
  ...["DELIVEROO", "JUST EAT", "UBER EATS", "FOODHUB"].map(
    (p): RuleSeed => ({ pattern: p, category: "Eating Out", subcategory: "Takeaway", priority: 90 })
  ),
  ...["SQ *", "SUMUP", "PUDDING PA", "WOODBOROUGH", "ZAAP THAI", "FAT HIPPO", "ISO SUSHI", "TAMIL TERU", "BAKEWELL"].map(
    (p): RuleSeed => ({ pattern: p, category: "Eating Out", subcategory: "Restaurant", priority: 90 })
  ),

  // PRIORITY 100 - SHOPPING
  { pattern: "AMAZON", category: "Shopping", subcategory: "Amazon", priority: 100 },
  { pattern: "AMZN", category: "Shopping", subcategory: "Amazon", priority: 100 },
  { pattern: "ARGOS", category: "Shopping", subcategory: "Argos", priority: 100 },
  { pattern: "VINTED", category: "Shopping", subcategory: "Vinted", priority: 100 },
  { pattern: "NEXT", category: "Shopping", subcategory: "Next", priority: 100 },
  { pattern: "TIKTOK SHOP", category: "Shopping", subcategory: "TikTok", priority: 100 },

  // PRIORITY 100 - PERSONAL
  { pattern: "ZETTLE + BARBE", category: "Personal", subcategory: "Barber", priority: 100 },
  { pattern: "WODIFY", category: "Personal", subcategory: "CrossFit", priority: 100 },
  { pattern: "THE GYM LTD", category: "Personal", subcategory: "Gym", priority: 100 },
  { pattern: "NOTTINGHAM FIT SPO", category: "Personal", subcategory: "Gym", priority: 100 },
  { pattern: "SHEENNAZ HAIR", category: "Personal", subcategory: "Hair", priority: 100 },
  { pattern: "WOODTHORPE DENTAL", category: "Personal", subcategory: "Dental", priority: 100 },
  { pattern: "LENSTORE", category: "Personal", subcategory: "Lenstore", priority: 100 },
];

type TargetSeed = {
  category: string;
  monthly: number;
  weekly?: number;
  type: "fixed" | "subscription" | "variable" | "buffer";
};

const TARGETS: TargetSeed[] = [
  // Fixed
  { category: "Mortgage", monthly: 113243, type: "fixed" },
  { category: "Council Tax", monthly: 17900, type: "fixed" },
  { category: "Santander car finance", monthly: 18297, type: "fixed" },
  { category: "Admiral Insurance", monthly: 13193, type: "fixed" },
  { category: "Severn Trent water", monthly: 4817, type: "fixed" },
  { category: "Zurich Life", monthly: 1754, type: "fixed" },
  { category: "DVLA car tax", monthly: 1706, type: "fixed" },
  { category: "Creation.co.uk", monthly: 1746, type: "fixed" },
  { category: "TV Licence", monthly: 1503, type: "fixed" },
  { category: "GoCardless DDs", monthly: 1035, type: "fixed" },
  // Subscriptions
  { category: "Claude", monthly: 6470, type: "subscription" },
  { category: "Apple", monthly: 6296, type: "subscription" },
  { category: "Spotify", monthly: 1299, type: "subscription" },
  { category: "Amazon Prime", monthly: 1199, type: "subscription" },
  { category: "Netflix", monthly: 599, type: "subscription" },
  { category: "Disney+", monthly: 599, type: "subscription" },
  // Variable
  { category: "Groceries", monthly: 70000, weekly: 17500, type: "variable" },
  { category: "Eating Out", monthly: 20000, weekly: 5000, type: "variable" },
  { category: "Kids", monthly: 28000, type: "variable" },
  { category: "Shopping", monthly: 15000, type: "variable" },
  { category: "Fuel", monthly: 7500, type: "variable" },
  { category: "Transport", monthly: 12000, type: "variable" },
  { category: "Personal", monthly: 10000, type: "variable" },
  // Buffer
  { category: "Uncategorised drift", monthly: 15000, type: "buffer" },
];

const GOALS = [
  { name: "Overdraft clear", targetPence: 112700, priority: 1 },
  { name: "Melbourne accommodation", targetPence: 80000, priority: 2 },
  { name: "3k savings", targetPence: 300000, priority: 3 },
  { name: "Stretch goal", targetPence: 500000, priority: 4 },
];

const SUBSCRIPTIONS = [
  { name: "Claude", monthlyCostPence: 6470, status: "active", notes: "Keep" },
  { name: "Spotify", monthlyCostPence: 1299, status: "active", notes: "Keep" },
  { name: "Amazon Prime", monthlyCostPence: 1199, status: "active", notes: "Keep" },
  { name: "Netflix", monthlyCostPence: 599, status: "active", notes: "Keep" },
  { name: "Disney+", monthlyCostPence: 599, status: "active", notes: "Keep" },
  { name: "Apple", monthlyCostPence: 6296, status: "audit_pending", notes: "Multiple subs - identify on devices" },
  { name: "OpenAI", monthlyCostPence: 2000, status: "review", notes: "To cancel" },
  { name: "E.ON Next (Estelle Monzo)", monthlyCostPence: 18261, status: "active", notes: "External - Estelle Monzo, not in joint" },
  { name: "Three Mobile (Estelle Monzo)", monthlyCostPence: 4717, status: "active", notes: "External - Estelle Monzo, not in joint" },
  { name: "Gedling kids swimming (Estelle Monzo)", monthlyCostPence: 6200, status: "active", notes: "External - Estelle Monzo, not in joint" },
];

async function main() {
  console.log("Seeding database...");

  // Idempotent: clear seedable reference tables, then re-insert.
  await db.delete(categoryRules);
  await db.delete(budgetTargets);
  await db.delete(savingsGoals);
  await db.delete(subscriptions);

  // Accounts: only create if absent (preserve existing transactions).
  const existingAccounts = await db.select().from(bankAccounts);
  if (existingAccounts.length === 0) {
    await db.insert(bankAccounts).values([
      {
        accountName: "Lloyds Joint",
        accountType: "current",
        csvFormat: "lloyds",
        sortCode: "11-12-80",
      },
      {
        accountName: "Halifax Savings",
        accountType: "savings",
        csvFormat: "halifax",
      },
    ]);
    console.log("Created 2 bank accounts");
  } else {
    console.log(`Kept ${existingAccounts.length} existing bank accounts`);
  }

  await db.insert(categoryRules).values(
    RULES.map((r) => ({
      pattern: r.pattern,
      category: r.category,
      subcategory: r.subcategory,
      priority: r.priority,
      direction: r.direction ?? null,
      markExcluded: r.markExcluded ?? false,
    }))
  );
  console.log(`Inserted ${RULES.length} category rules`);

  await db.insert(budgetTargets).values(
    TARGETS.map((t) => ({
      category: t.category,
      monthlyTargetPence: t.monthly,
      weeklyTargetPence: t.weekly ?? null,
      type: t.type,
      activeFrom: ACTIVE_FROM,
    }))
  );
  console.log(`Inserted ${TARGETS.length} budget targets`);

  await db.insert(savingsGoals).values(
    GOALS.map((g) => ({
      name: g.name,
      targetPence: g.targetPence,
      priority: g.priority,
    }))
  );
  console.log(`Inserted ${GOALS.length} savings goals`);

  await db.insert(subscriptions).values(SUBSCRIPTIONS);
  console.log(`Inserted ${SUBSCRIPTIONS.length} subscriptions`);

  console.log("Seed complete.");
  await db.$client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
