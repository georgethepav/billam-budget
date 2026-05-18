// Validate the PDF parser against the statement's own stated totals:
// Money In £1,677.96, Money Out £3,590.27 (01-18 May 2026).
import { readFileSync } from "node:fs";
import { parsePdfStatement } from "../lib/pdf";

async function main() {
  const data = new Uint8Array(readFileSync("Statement_2026_5.pdf"));
  const r = await parsePdfStatement(data);

  let credits = 0;
  let debits = 0;
  for (const row of r.rows) {
    if (row.amountPence > 0) credits += row.amountPence;
    else debits += -row.amountPence;
  }

  console.log("rows:", r.rows.length);
  console.log("date range:", r.minDate, "->", r.maxDate);
  console.log("sort code:", r.detectedSortCode);
  console.log("credits: £" + (credits / 100).toFixed(2), "(expect £1,677.96)");
  console.log("debits:  £" + (debits / 100).toFixed(2), "(expect £3,590.27)");
  console.log("errors:", r.errors.length);
  for (const e of r.errors.slice(0, 10)) console.log("  -", e);
  console.log("first 5:");
  for (const row of r.rows.slice(0, 5)) console.log("  ", row);
  console.log("last 3:");
  for (const row of r.rows.slice(-3)) console.log("  ", row);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
