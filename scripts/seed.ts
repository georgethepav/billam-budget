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
  // PRIORITY 5 - specific NatWest flows caught before the generic mortgage rule
  { pattern: "F/FLOW NATWEST", category: "Transfer", subcategory: "NatWest Flow", priority: 5, markExcluded: true },

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
  { pattern: "SAVETHECHANGE", category: "Transfer", subcategory: "Save The Change", priority: 30, markExcluded: true },

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
  { pattern: "ABOUND BY FINTERN", category: "Finance", subcategory: "Abound", priority: 50 },
  { pattern: "BARCLAYS PRTNR FIN", category: "Finance", subcategory: "Barclays Partner Finance", priority: 50 },

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
  { pattern: "RING BASIC PLAN", category: "Subscriptions", subcategory: "Ring", priority: 60 },
  { pattern: "RING SOLO PLAN", category: "Subscriptions", subcategory: "Ring", priority: 60 },
  { pattern: "HELP.DISCOVERYPLUS", category: "Subscriptions", subcategory: "Discovery+", priority: 60 },
  { pattern: "DISCOVERY PLUS", category: "Subscriptions", subcategory: "Discovery+", priority: 60 },

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
  { pattern: "SITTERS.CO.UK", category: "Kids", subcategory: "Childcare", priority: 70 },
  { pattern: "OXTON CRIC", category: "Kids", subcategory: "Cricket", priority: 70 },

  // PRIORITY 80 - GROCERIES
  { pattern: "SAINSBURYS S/MKTS", category: "Groceries", subcategory: "Sainsburys", priority: 80 },
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

  // PRIORITY 80 - FUEL (own top-level category so dashboard tracker sees it)
  { pattern: "SAINSBURYS PETROL", category: "Fuel", subcategory: "Sainsburys", priority: 80 },
  { pattern: "BP WOLLATON", category: "Fuel", subcategory: "BP", priority: 80 },
  { pattern: "SHELL", category: "Fuel", subcategory: "Shell", priority: 80 },
  { pattern: "ESSO", category: "Fuel", subcategory: "Esso", priority: 80 },
  { pattern: "RONTEC", category: "Fuel", subcategory: "Rontec", priority: 80 },
  { pattern: "MFG ", category: "Fuel", subcategory: "MFG", priority: 80 },

  // PRIORITY 80 - TRANSPORT (non-fuel)
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
  { pattern: "HARRY S CAR WASH", category: "Transport", subcategory: "Car Wash", priority: 80 },

  // PRIORITY 85 - HOLIDAY 2026 (travel bookings, holiday-let accommodation)
  { pattern: "SOLMAR VILLAS", category: "Holiday 2026", subcategory: "Accommodation", priority: 85 },
  { pattern: "CALLOW TOP", category: "Holiday 2026", subcategory: "Accommodation", priority: 85 },
  { pattern: "CROWNE PLAZA", category: "Holiday 2026", subcategory: "Accommodation", priority: 85 },
  { pattern: "TREWAN HALL", category: "Holiday 2026", subcategory: "Accommodation", priority: 85 },
  { pattern: "BOOKING.COM", category: "Holiday 2026", subcategory: "Booking.com", priority: 85 },
  { pattern: "BKG*BOOKING", category: "Holiday 2026", subcategory: "Booking.com", priority: 85 },
  { pattern: "CARS ON BOOKING", category: "Holiday 2026", subcategory: "Car hire", priority: 85 },
  { pattern: "LASTMINUTE", category: "Holiday 2026", subcategory: "Lastminute", priority: 85 },
  { pattern: "P&O FERRIES", category: "Holiday 2026", subcategory: "Ferry", priority: 85 },

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
  { pattern: "COTSWOLD OUTDOOR", category: "Shopping", subcategory: "Outdoor", priority: 100 },

  // PRIORITY 100 - PERSONAL
  { pattern: "ZETTLE + BARBE", category: "Personal", subcategory: "Barber", priority: 100 },
  { pattern: "WODIFY", category: "Personal", subcategory: "CrossFit", priority: 100 },
  { pattern: "THE GYM LTD", category: "Personal", subcategory: "Gym", priority: 100 },
  { pattern: "NOTTINGHAM FIT SPO", category: "Personal", subcategory: "Gym", priority: 100 },
  { pattern: "SHEENNAZ HAIR", category: "Personal", subcategory: "Hair", priority: 100 },
  { pattern: "WOODTHORPE DENTAL", category: "Personal", subcategory: "Dental", priority: 100 },
  { pattern: "LENSTORE", category: "Personal", subcategory: "Lenstore", priority: 100 },
  { pattern: "NATIONAL TRUST", category: "Personal", subcategory: "National Trust", priority: 100 },
  { pattern: "NFFC", category: "Personal", subcategory: "Football", priority: 100 },
  { pattern: "NOTTINGHAM FOREST", category: "Personal", subcategory: "Football", priority: 100 },
  { pattern: "NOTTINGHAM FORE", category: "Personal", subcategory: "Football", priority: 100 },

  // ==== BEST-GUESS BATCH (bulk-added after historical import audit) ====

  // Priority 5 - specific one-off override
  { pattern: "ESTELLE & GEORGE", category: "Transfer", subcategory: "Joint", priority: 5, markExcluded: true },

  // Priority 20 - income
  { pattern: "CHEQUE DEPOSIT", category: "Income", subcategory: "Cheque", priority: 20, direction: "credit" },

  // Priority 30 - cash transfers (excluded)
  { pattern: "HFX ", category: "Transfer", subcategory: "Cash", priority: 30, markExcluded: true },
  { pattern: "LNK ", category: "Transfer", subcategory: "Cash", priority: 30, markExcluded: true },

  // Priority 50 - finance / insurance / housing
  { pattern: "NON-GBP TRANS FEE", category: "Finance", subcategory: "FX Fees", priority: 50 },
  { pattern: "NON-GBP PURCH FEE", category: "Finance", subcategory: "FX Fees", priority: 50 },
  { pattern: "NW WORLD MASTERCAR", category: "Finance", subcategory: "Credit Card", priority: 50 },
  { pattern: "KLARNA", category: "Finance", subcategory: "Klarna", priority: 50 },
  { pattern: "HMCOURTS", category: "Finance", subcategory: "Legal", priority: 50 },
  { pattern: "DEBT RECOVERY", category: "Finance", subcategory: "Debt Recovery", priority: 50 },
  { pattern: "BANK OD INT", category: "Finance", subcategory: "Overdraft Interest", priority: 50, direction: "credit" },
  { pattern: "CUVVA", category: "Insurance", subcategory: "Cuvva", priority: 50 },
  { pattern: "SNUG + BOILER", category: "Housing", subcategory: "Boiler Service", priority: 50 },

  // Priority 60 - subscriptions
  { pattern: "GSUITE + GOOGLE", category: "Subscriptions", subcategory: "Google Workspace", priority: 60 },
  { pattern: "WORKSPACE + GOOGLE", category: "Subscriptions", subcategory: "Google Workspace", priority: 60 },
  { pattern: "NOW + SKY SPOR", category: "Subscriptions", subcategory: "Now TV", priority: 60 },
  { pattern: "DISCOVERY+", category: "Subscriptions", subcategory: "Discovery+", priority: 60 },
  { pattern: "PRIME + VIDEO", category: "Subscriptions", subcategory: "Amazon Prime", priority: 60 },
  { pattern: "EMMA APP", category: "Subscriptions", subcategory: "Emma", priority: 60 },
  { pattern: "VODAFONE", category: "Subscriptions", subcategory: "Vodafone", priority: 60 },
  { pattern: "ITV", category: "Subscriptions", subcategory: "ITV", priority: 60 },
  { pattern: "GLOBAL.COM", category: "Subscriptions", subcategory: "Global", priority: 60 },

  // Priority 70 - kids (sport, play, days out, fairs, dance, school)
  { pattern: "LOVEADMIN", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "NEWARK RUGBY", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "LONG EATON RUGBY", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "SOUTHWELL RUGBY", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "OLD SALTLEIANS", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "STOKE-ON-TRENT RUG", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "MELLISH RFC", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "BINGHAM RUGBY", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "HOVERINGHAM CRICKE", category: "Kids", subcategory: "Cricket", priority: 70 },
  { pattern: "FREEMANS EVENT", category: "Kids", subcategory: "Rugby", priority: 70 },
  { pattern: "PARK WOOD LEISURE", category: "Kids", subcategory: "Leisure", priority: 70 },
  { pattern: "ARNOLD LEISURE", category: "Kids", subcategory: "Leisure", priority: 70 },
  { pattern: "BENDALLS LEISURE", category: "Kids", subcategory: "Leisure", priority: 70 },
  { pattern: "CARLTON FORUM", category: "Kids", subcategory: "Leisure", priority: 70 },
  { pattern: "RAMSDALE PARK", category: "Kids", subcategory: "Leisure", priority: 70 },
  { pattern: "PIRATES PLAY", category: "Kids", subcategory: "Play Centre", priority: 70 },
  { pattern: "VIKINGS PLAY", category: "Kids", subcategory: "Play Centre", priority: 70 },
  { pattern: "VIKINGSPLAY", category: "Kids", subcategory: "Play Centre", priority: 70 },
  { pattern: "REDKANGAROO", category: "Kids", subcategory: "Play Centre", priority: 70 },
  { pattern: "TUMBLE TOWN", category: "Kids", subcategory: "Play Centre", priority: 70 },
  { pattern: "WIRED ON WHEELS", category: "Kids", subcategory: "Activities", priority: 70 },
  { pattern: "WOODTHORPE TOP", category: "Kids", subcategory: "Activities", priority: 70 },
  { pattern: "NOTTINGHAM ARENA", category: "Kids", subcategory: "Activities", priority: 70 },
  { pattern: "NOTTINGHAM COURSES", category: "Kids", subcategory: "Activities", priority: 70 },
  { pattern: "GEDLING COLL", category: "Kids", subcategory: "Rugby Allstars", priority: 70 },
  { pattern: "ALT TWRS", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "ALTON TOWERS", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "TWYCROSS ZOO", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "WWW.TWYCROSSZOO", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "YORKSHIRE WILDLIFE", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "WHITE POST", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "TREE TOPS", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "LINCOLN CATHEDRAL", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "JURASSIC COVE", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "LARWOOD PARK", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "MARKEATON PARK", category: "Kids", subcategory: "Days Out", priority: 70 },
  { pattern: "JAMES MELLORS", category: "Kids", subcategory: "Fair", priority: 70 },
  { pattern: "GB_JAMESMELLORS", category: "Kids", subcategory: "Fair", priority: 70 },
  { pattern: "WILLIAM FUNFAIRS", category: "Kids", subcategory: "Fair", priority: 70 },
  { pattern: "LEONARD SCHOOL", category: "Kids", subcategory: "Dance", priority: 70 },
  { pattern: "ZETTLE_*SCHOLASTIC", category: "Kids", subcategory: "School", priority: 70 },
  { pattern: "ZETTLE_*NO.1 CUBS", category: "Kids", subcategory: "Scouts", priority: 70 },
  { pattern: "ZETTLE_*TUMBLE", category: "Kids", subcategory: "Play Centre", priority: 70 },
  { pattern: "ZETTLE_*NUTBROOK", category: "Kids", subcategory: "Cricket", priority: 70 },

  // Priority 80 - transport (parking, travel, rail, car service, bus, fines)
  { pattern: "WH SMITH", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "WH SMITHS", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "TROWELL S/W", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "WELCOME BREAK", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "GLOUCESTER SERVICE", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "GLOUCESTER S FARMS", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "CHERWELL VALLEY", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "TODDINGTON N/E", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "TAMWORTH SERVICE", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "NORTHAMPTON NORTH", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "MOTO DONINGTON", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "WB OXFORD WHS", category: "Transport", subcategory: "Travel", priority: 80 },
  { pattern: "EDINBURGH TRAMS", category: "Transport", subcategory: "Rail", priority: 80 },
  { pattern: "LONDON AND NORTH W", category: "Transport", subcategory: "Rail", priority: 80 },
  { pattern: "EMR MOBILE", category: "Transport", subcategory: "Rail", priority: 80 },
  { pattern: "CONTACTLESS.TRAVEL", category: "Transport", subcategory: "Rail", priority: 80 },
  { pattern: "NOTT EMR CARPARK", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "EMA AIRPORT", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "APCOA", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "PARK WITH EASE", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "STATION ROAD CAR", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "MERRYMOOR CAR PARK", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "CAR PARK VICTORIA", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "OBN*MIPERMIT", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "JUSTPARK", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "Q PARK", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "LACE MARKET CAR", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "PAYBYPHONE", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "RUSHCLIFFE BC PARK", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "ASHFIELD DISTRICT", category: "Transport", subcategory: "Parking", priority: 80 },
  { pattern: "CSC PCN", category: "Transport", subcategory: "Fines", priority: 80 },
  { pattern: "WWW.DCBLTD", category: "Transport", subcategory: "Fines", priority: 80 },
  { pattern: "MOTORCHECK", category: "Transport", subcategory: "Admin", priority: 80 },
  { pattern: "AUXILLIS", category: "Transport", subcategory: "Car Service", priority: 80 },
  { pattern: "CAVENDISH AUTO", category: "Transport", subcategory: "Car Service", priority: 80 },
  { pattern: "HALFORDS AUTOCENTR", category: "Transport", subcategory: "Car Service", priority: 80 },
  { pattern: "STAGECOACH", category: "Transport", subcategory: "Bus", priority: 80 },
  { pattern: "IMO CAR WASH", category: "Transport", subcategory: "Car Wash", priority: 80 },
  { pattern: "WILCOMATIC", category: "Transport", subcategory: "Car Wash", priority: 80 },
  { pattern: "TAMAR BRIDGE", category: "Transport", subcategory: "Toll", priority: 80 },
  { pattern: "SELECTA", category: "Eating Out", subcategory: "Coffee", priority: 80 },
  { pattern: "WOLLATON SF CONNEC", category: "Fuel", subcategory: "Other", priority: 80 },
  { pattern: "TOTNES CROSS FILLI", category: "Fuel", subcategory: "Other", priority: 80 },
  { pattern: "BP MOTO", category: "Fuel", subcategory: "BP", priority: 80 },
  { pattern: "BP BROBOT", category: "Fuel", subcategory: "BP", priority: 80 },
  { pattern: "STATHERN GARAGE", category: "Fuel", subcategory: "Other", priority: 80 },
  { pattern: "MORR BERWICK", category: "Groceries", subcategory: "Other", priority: 80 },

  // Priority 85 - Holiday 2026 (travel, foreign currency, flights)
  { pattern: "AER PALMA", category: "Holiday 2026", subcategory: "Flights", priority: 85 },
  { pattern: "AEROPUERTO PALMA", category: "Holiday 2026", subcategory: "Flights", priority: 85 },
  { pattern: "E.S. SON CLADERA", category: "Holiday 2026", subcategory: "Spain", priority: 85 },
  { pattern: "LA ZENIA", category: "Holiday 2026", subcategory: "Spain", priority: 85 },
  { pattern: "MUNDO SUPERMARKET", category: "Holiday 2026", subcategory: "Foreign", priority: 85 },
  { pattern: "SUPERMARKET COLON", category: "Holiday 2026", subcategory: "Foreign", priority: 85 },
  { pattern: "CAF  LOCAL", category: "Holiday 2026", subcategory: "Foreign", priority: 85 },
  { pattern: "SUPER ONES", category: "Holiday 2026", subcategory: "Foreign", priority: 85 },
  { pattern: "HOLIDAY INN", category: "Holiday 2026", subcategory: "Accommodation", priority: 85 },
  { pattern: "HAMPTON BY HILTON", category: "Holiday 2026", subcategory: "Accommodation", priority: 85 },
  { pattern: "CORNWALL COUNCIL", category: "Holiday 2026", subcategory: "Fees", priority: 85 },
  { pattern: "TG MID CORNWALL", category: "Holiday 2026", subcategory: "Fuel", priority: 85 },
  { pattern: "EDEN PROJECT", category: "Holiday 2026", subcategory: "Days Out", priority: 85 },
  { pattern: "DT AEROBUS", category: "Holiday 2026", subcategory: "Transport", priority: 85 },

  // Priority 90 - eating out (pubs, restaurants, coffee, fast food, takeaway)
  { pattern: "BOMBAY DELICATESSE", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "KATIE O BRIENS", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "OLD GREEN DRAG", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "OZ BAR", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "DONER STOP", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "THE KILPIN", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "NO18 COFFEE", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "NOTTINGHAM KNIGHT", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "SANAM", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "THE PILLAR BOX", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "PEPPER ROCKS", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "LINCOLNSHIRE POACH", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "PLAINSMAN", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "HUDDL", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "POPWORLD", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "SIX BARREL", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "SPREAD EAGLE", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "CORCORAN", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "PIZZAHUT", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "D&J MOBILE CATERIN", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "JJ RUDDLES", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "MERCY FOOD", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "RAGLAN ROAD IRISH", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "NANDOS", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "CHOPSTIX", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "SPICE MERCHANT", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "THAI BASEMENT", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "GOLDEN CROWN CAF", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "PIT AND PENDULUM", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "BELL INN", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "FOX AND GRAPES", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "THE EMBANKMENT", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "THE PLAYWRIGHT", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "WINNING PLAICE", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "OLD THEATRE DE", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "OLD STOREHOUSE", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "WAGGON AND HOR", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "ANGEL MICROBRE", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "NUTHALL PUB", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "CRIMSON TREE", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "BLIND RABBIT", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "BOOKING OFFICE", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "LLOYDS NO.1", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "WHITE STAR", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "STRAIT AND NARROW", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "IMBIBE VENUES", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "BODEGA", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "GLACE", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "ORI CAFFE", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "ANGELOS CHIPPERY", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "BREAD AND BITTER", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "LAGAN INDIAN", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "BLEND AT CONTEMPOR", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "BREW AND BAKES", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "200 DEGREES", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "NUTRITION KITCHEN", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "RAKKI RAKKAS", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "TAKEAWAY ORDER", category: "Eating Out", subcategory: "Takeaway", priority: 90 },
  { pattern: "LITTLE GREEN KITCH", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "REFRESHMENT SYSTEM", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "VENDEASE", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "ELIOR", category: "Eating Out", subcategory: "Catering", priority: 90 },
  { pattern: "SPRINGWATER", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "BRIDGE HOUSE", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "R L ICES", category: "Eating Out", subcategory: "Ice Cream", priority: 90 },
  { pattern: "ICE CREAM PARLOUR", category: "Eating Out", subcategory: "Ice Cream", priority: 90 },
  { pattern: "TREETOP CATERING", category: "Eating Out", subcategory: "Catering", priority: 90 },
  { pattern: "TRENT NAV", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "SEA AND EARTH", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "THE OLD FLOWER SHO", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "PUDDINGPANTRY", category: "Eating Out", subcategory: "Restaurant", priority: 90 },
  { pattern: "BROTHERS COFFE", category: "Eating Out", subcategory: "Coffee", priority: 90 },
  { pattern: "ZETTLE_*PAKORA", category: "Eating Out", subcategory: "Fast Food", priority: 90 },
  { pattern: "ZETTLE_*RAILWAY", category: "Eating Out", subcategory: "Pub", priority: 90 },
  { pattern: "HOLEINTHEWA", category: "Eating Out", subcategory: "Pub", priority: 90 },

  // Priority 100 - shopping / personal / charity / groceries / casino
  { pattern: "JOHN LEWIS", category: "Shopping", subcategory: "John Lewis", priority: 100 },
  { pattern: "TK MAXX", category: "Shopping", subcategory: "Clothing", priority: 100 },
  { pattern: "TU CLOTHING", category: "Shopping", subcategory: "Clothing", priority: 100 },
  { pattern: "BEAUTY BAY", category: "Personal", subcategory: "Beauty", priority: 100 },
  { pattern: "GO OUTDOORS", category: "Shopping", subcategory: "Outdoor", priority: 100 },
  { pattern: "DECATHLON", category: "Shopping", subcategory: "Outdoor", priority: 100 },
  { pattern: "HOKA", category: "Shopping", subcategory: "Clothing", priority: 100 },
  { pattern: "SPORTSDIRECT", category: "Shopping", subcategory: "Outdoor", priority: 100 },
  { pattern: "BETTYS SURF SHOP", category: "Shopping", subcategory: "Outdoor", priority: 100 },
  { pattern: "CRAFT & OUTDOOR", category: "Shopping", subcategory: "Outdoor", priority: 100 },
  { pattern: "BOOTSWEST", category: "Shopping", subcategory: "Boots", priority: 100 },
  { pattern: "WICKES", category: "Shopping", subcategory: "DIY", priority: 100 },
  { pattern: "B & Q", category: "Shopping", subcategory: "DIY", priority: 100 },
  { pattern: "DUNELM", category: "Shopping", subcategory: "Home", priority: 100 },
  { pattern: "B&M ", category: "Shopping", subcategory: "Household", priority: 100 },
  { pattern: "PEACOCK STORES", category: "Shopping", subcategory: "Clothing", priority: 100 },
  { pattern: "CLARKS", category: "Shopping", subcategory: "Clothing", priority: 100 },
  { pattern: "HERON FOODS", category: "Groceries", subcategory: "Other", priority: 100 },
  { pattern: "TEMU.COM", category: "Shopping", subcategory: "Online", priority: 100 },
  { pattern: "ETSY.COM", category: "Shopping", subcategory: "Online", priority: 100 },
  { pattern: "EBAY O*", category: "Shopping", subcategory: "Online", priority: 100 },
  { pattern: "HS *CLOTH", category: "Shopping", subcategory: "Online", priority: 100 },
  { pattern: "FLORALANDS", category: "Shopping", subcategory: "Garden", priority: 100 },
  { pattern: "WWW.THEGLOWCOMPANY", category: "Shopping", subcategory: "Online", priority: 100 },
  { pattern: "BRAISWICKDIRECT", category: "Shopping", subcategory: "Online", priority: 100 },
  { pattern: "FREEPRINTS", category: "Shopping", subcategory: "Online", priority: 100 },
  { pattern: "THEWORKS", category: "Shopping", subcategory: "Books", priority: 100 },
  { pattern: "BARNARDO", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "CANCER RESEARCH", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "OXFAM", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "RSPB", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "HOPE CHARITY", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "SUE RYDER", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "JUSTGIVING", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "COLLECTION POT", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "HEADWAY", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "NOTTM HOSPITAL CHA", category: "Personal", subcategory: "Charity", priority: 100 },
  { pattern: "NATIONAL LOTTERY", category: "Personal", subcategory: "Lottery", priority: 100 },
  { pattern: "TIMPSON", category: "Personal", subcategory: "Timpson", priority: 100 },
  { pattern: "RAKKAS GROOMING", category: "Personal", subcategory: "Barber", priority: 100 },
  { pattern: "ASCENT PHARMACY", category: "Personal", subcategory: "Pharmacy", priority: 100 },
  { pattern: "SANITAS FLOWERS", category: "Personal", subcategory: "Flowers", priority: 100 },
  { pattern: "GEDLING ROAD POST", category: "Personal", subcategory: "Post Office", priority: 100 },
  { pattern: "GROSVENOR + CARRING", category: "Personal", subcategory: "Casino", priority: 100 },
  { pattern: "HIRESTREET", category: "Shopping", subcategory: "Clothing", priority: 100 },
  { pattern: "ONE STOP COMP", category: "Shopping", subcategory: "Tech", priority: 100 },
  { pattern: "CENTRAL CO-OP", category: "Groceries", subcategory: "Co-op", priority: 100 },
  { pattern: "CENTRAL ENG COOP", category: "Groceries", subcategory: "Co-op", priority: 100 },
  { pattern: "DENMAN MINI MARKET", category: "Groceries", subcategory: "Other", priority: 100 },
  { pattern: "SOMERSBY", category: "Groceries", subcategory: "Other", priority: 100 },
  { pattern: "TRADEVITS", category: "Personal", subcategory: "Health", priority: 100 },
  { pattern: "CANOVILLE GYM", category: "Personal", subcategory: "Gym", priority: 100 },
  { pattern: "THE GYM GROUP", category: "Personal", subcategory: "Gym", priority: 100 },
  { pattern: "BIG SHOP", category: "Groceries", subcategory: "Other", priority: 100 },
  { pattern: "NOTTINGHAM FURNITU", category: "Shopping", subcategory: "Home", priority: 100 },
  { pattern: "EDEN HALL DAY SPA", category: "Personal", subcategory: "Spa", priority: 100 },
  { pattern: "MSR NEWSGROUP", category: "Shopping", subcategory: "Other", priority: 100 },
  { pattern: "ZETTLE_*M W GROW", category: "Shopping", subcategory: "Garden", priority: 100 },
  { pattern: "CLR*SPRING LANE", category: "Groceries", subcategory: "Other", priority: 100 },
  { pattern: "URBAN BRIEF", category: "Shopping", subcategory: "Clothing", priority: 100 },
  { pattern: "CHESTERFIELD PANTH", category: "Personal", subcategory: "Entertainment", priority: 100 },
  { pattern: "NORTH LEVERTON", category: "Groceries", subcategory: "Other", priority: 100 },
  { pattern: "SP ESSENCEVAULT", category: "Personal", subcategory: "Beauty", priority: 100 },

  // Priority 101 - generic Halfords retail (defer to HALFORDS AUTOCENTR priority 80)
  { pattern: "HALFORDS", category: "Shopping", subcategory: "Halfords", priority: 101 },
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
        accountName: "Halifax",
        accountType: "current",
        csvFormat: "halifax",
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
