// One-off: the joint current account is a Halifax export, not Lloyds.
// Cosmetically rename the existing row (preserves all transactions).
import { eq } from "drizzle-orm";
import { db } from "../db";
import { bankAccounts } from "../db/schema";

async function main() {
  const updated = await db
    .update(bankAccounts)
    .set({ accountName: "Halifax", csvFormat: "halifax" })
    .where(eq(bankAccounts.accountName, "Lloyds Joint"))
    .returning({ id: bankAccounts.id, name: bankAccounts.accountName });

  if (updated.length === 0) {
    console.log('No row named "Lloyds Joint" found — nothing to do.');
  } else {
    console.log(`Renamed ${updated.length} account(s) to "Halifax":`, updated);
  }
  await db.$client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
