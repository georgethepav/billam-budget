import { parseAmountToPence } from "./money";
import { externalId, type ParseResult, type ParsedRow } from "./csv";

// pdfjs 4 uses Promise.withResolvers, which isn't in Node < 22 (Vercel may
// run an older Node). Polyfill it before pdfjs loads.
const P = Promise as unknown as { withResolvers?: unknown };
if (typeof P.withResolvers !== "function") {
  P.withResolvers = function withResolvers<T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Halifax/Lloyds-group PDF statement parser. The PDF is a positioned grid:
// each row sits at a y, each column at an x. We reconstruct rows from text
// item coordinates, then bucket the money columns by x against the header
// label positions. Output matches the CSV ParsedRow shape (same externalId
// scheme) so dedup works across CSV and PDF.

type Item = { s: string; x: number; y: number };

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// "01 May 26" -> "2026-05-01"
function parseStatementDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const mon = MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return `20${m[3]}-${mon}-${day}`;
}

const AMOUNT_RE = /^-?[\d,]+\.\d{2}$/;
const DATE_RE = /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2}$/;

export async function parsePdfStatement(
  data: Uint8Array
): Promise<ParseResult> {
  const errors: string[] = [];
  let detectedSortCode: string | null = null;
  let minDate: string | null = null;
  let maxDate: string | null = null;
  const out: ParsedRow[] = [];

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  // Column x-anchors taken from the header row; sensible fallbacks if a page
  // is missing the header.
  let descX = 122;
  let typeX = 271;
  let moneyOutX = 393;
  let balanceX = 490;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();

    const items: Item[] = tc.items
      .map((it) => {
        const t = it as { str: string; transform: number[] };
        return {
          s: t.str.trim(),
          x: Math.round(t.transform[4]),
          y: Math.round(t.transform[5]),
        };
      })
      .filter((i) => i.s !== "" && i.s !== "." && i.s !== "blank.");

    // Group into visual rows by y (top to bottom).
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: Item[][] = [];
    for (const it of items) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= 3) last.push(it);
      else rows.push([it]);
    }

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);

      // Sort code appears as "Sort Code" + value on the same row.
      if (!detectedSortCode) {
        const sc = row.find((c) => /^\d{2}-\d{2}-\d{2}$/.test(c.s));
        const hasLabel = row.some((c) => /sort code/i.test(c.s));
        if (sc && hasLabel) detectedSortCode = sc.s;
      }

      // Header row: re-anchor column x positions.
      const inLabel = row.find((c) => c.s.startsWith("Money In"));
      const outLabel = row.find((c) => c.s.startsWith("Money Out"));
      const balLabel = row.find((c) => c.s.startsWith("Balance"));
      const descLabel = row.find((c) => c.s === "Description");
      const typeLabel = row.find((c) => c.s === "Type");
      if (inLabel && outLabel && balLabel && descLabel && typeLabel) {
        descX = descLabel.x;
        typeX = typeLabel.x;
        moneyOutX = outLabel.x;
        balanceX = balLabel.x;
        continue;
      }

      // Transaction rows start with a date at the far left.
      const first = row[0];
      if (!first || !DATE_RE.test(first.s)) continue;
      const date = parseStatementDate(first.s);
      if (!date) {
        errors.push(`Could not parse date "${first.s}" on page ${p}`);
        continue;
      }

      const descParts: string[] = [];
      let inPence = 0;
      let outPence = 0;
      let sawAmount = false;

      for (const c of row) {
        if (c === first) continue;
        if (c.x >= descX && c.x < typeX) {
          descParts.push(c.s);
          continue;
        }
        if (AMOUNT_RE.test(c.s)) {
          // Bucket the number by which money column it sits under.
          if (c.x < moneyOutX) {
            inPence = parseAmountToPence(c.s);
            sawAmount = true;
          } else if (c.x < balanceX) {
            outPence = parseAmountToPence(c.s);
            sawAmount = true;
          }
          // x >= balanceX is the running balance - ignored for the amount.
        }
      }

      const description = descParts
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (!description) {
        errors.push(`Row on ${date} (page ${p}) had no description`);
        continue;
      }
      if (!sawAmount) {
        errors.push(
          `Row "${description}" on ${date} (page ${p}) had no amount`
        );
        continue;
      }

      const amountPence = inPence - outPence;
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;

      out.push({
        externalId: externalId(date, amountPence, description),
        transactionDate: date,
        description,
        amountPence,
      });
    }
  }

  if (out.length === 0 && errors.length === 0) {
    errors.push(
      "No transactions found. This may not be a Halifax/Lloyds PDF statement."
    );
  }

  return { rows: out, detectedSortCode, minDate, maxDate, errors };
}
