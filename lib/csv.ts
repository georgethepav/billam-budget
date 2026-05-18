import { createHash } from "node:crypto";
import Papa from "papaparse";
import { parseAmountToPence } from "./money";

export type ParsedRow = {
  externalId: string;
  transactionDate: string; // YYYY-MM-DD
  description: string;
  amountPence: number; // positive credit, negative debit
};

export type ParseResult = {
  rows: ParsedRow[];
  detectedSortCode: string | null;
  minDate: string | null;
  maxDate: string | null;
  errors: string[];
};

export type CsvFormat = "lloyds" | "halifax" | "monzo";

export const CSV_FORMATS: { value: CsvFormat; label: string }[] = [
  { value: "lloyds", label: "Lloyds" },
  { value: "halifax", label: "Halifax" },
  { value: "monzo", label: "Monzo" },
];

function externalId(date: string, amountPence: number, description: string): string {
  return createHash("sha256")
    .update(`${date}|${amountPence}|${description}`)
    .digest("hex");
}

// Lloyds dates are DD/MM/YYYY. Some exports use YYYY-MM-DD.
function normaliseDate(raw: string): string | null {
  const v = raw.trim();
  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function pick(row: Record<string, string>, names: string[]): string {
  for (const n of names) {
    const key = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === n.toLowerCase()
    );
    if (key && row[key] != null) return String(row[key]);
  }
  return "";
}

// Lloyds and Halifax share the same banking-group export schema. Halifax is
// routed here too until a real Halifax export reveals any differences.
function parseLloydsLike(rows: Record<string, string>[]): ParseResult {
  const out: ParsedRow[] = [];
  const errors: string[] = [];
  let detectedSortCode: string | null = null;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  rows.forEach((row, idx) => {
    const rawDate = pick(row, ["Transaction Date", "Date"]);
    const description = pick(row, [
      "Transaction Description",
      "Description",
      "Memo",
    ]).trim();
    const debit = pick(row, ["Debit Amount", "Debit", "Money Out"]);
    const credit = pick(row, ["Credit Amount", "Credit", "Money In"]);
    const sortCode = pick(row, ["Sort Code"]).trim();

    if (!rawDate && !description) return; // blank line

    const date = normaliseDate(rawDate);
    if (!date) {
      errors.push(`Row ${idx + 2}: could not parse date "${rawDate}"`);
      return;
    }
    if (!description) {
      errors.push(`Row ${idx + 2}: missing description`);
      return;
    }

    const debitPence = parseAmountToPence(debit);
    const creditPence = parseAmountToPence(credit);
    const amountPence = creditPence - debitPence;

    if (sortCode && !detectedSortCode) detectedSortCode = sortCode;
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;

    out.push({
      externalId: externalId(date, amountPence, description),
      transactionDate: date,
      description,
      amountPence,
    });
  });

  return { rows: out, detectedSortCode, minDate, maxDate, errors };
}

// Monzo exports: Date, Name/Description, Amount (single signed column).
function parseMonzo(rows: Record<string, string>[]): ParseResult {
  const out: ParsedRow[] = [];
  const errors: string[] = [];
  let minDate: string | null = null;
  let maxDate: string | null = null;

  rows.forEach((row, idx) => {
    const rawDate = pick(row, ["Date", "Created"]);
    const description =
      pick(row, ["Name", "Description"]).trim() ||
      pick(row, ["Notes and #tags", "Reference"]).trim();
    const amount = pick(row, ["Amount", "Amount (GBP)"]);

    if (!rawDate && !description) return;

    const date = normaliseDate(rawDate);
    if (!date) {
      errors.push(`Row ${idx + 2}: could not parse date "${rawDate}"`);
      return;
    }
    const amountPence = parseAmountToPence(amount);
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;

    out.push({
      externalId: externalId(date, amountPence, description),
      transactionDate: date,
      description: description || "(no description)",
      amountPence,
    });
  });

  return { rows: out, detectedSortCode: null, minDate, maxDate, errors };
}

export function parseCsv(content: string, format: CsvFormat): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = parsed.data;
  if (!rows || rows.length === 0) {
    return {
      rows: [],
      detectedSortCode: null,
      minDate: null,
      maxDate: null,
      errors: ["No rows found in CSV. Check the file is a valid export."],
    };
  }

  switch (format) {
    case "monzo":
      return parseMonzo(rows);
    case "halifax":
    case "lloyds":
    default:
      return parseLloydsLike(rows);
  }
}

export { externalId };
