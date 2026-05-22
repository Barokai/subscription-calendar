/**
 * Client-side CSV import utilities.
 *
 * Supports two formats:
 *   1. Bank/CC statement — rows of transactions (date, description, amount, …)
 *   2. Pivot/sheet format — rows are subscriptions, columns are months (migration from Google Sheets)
 */

// ---------------------------------------------------------------------------
// Generic CSV parsing
// ---------------------------------------------------------------------------

export function parseCsv(raw: string): string[][] {
  const delimiter = raw.includes(";") ? ";" : ",";
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .split(delimiter)
        .map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
    )
    .filter((row) => row.some((cell) => cell !== ""));
}

// ---------------------------------------------------------------------------
// Bank statement format
// ---------------------------------------------------------------------------

export interface BankTransaction {
  date: Date;
  description: string;
  amount: number; // always positive (outgoing charge)
  rawRow: string[];
}

export interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
  /** When credit/debit are split into two columns */
  debitCol?: number;
}

/** Heuristic: score a header row to find date / description / amount columns */
export function detectColumns(headers: string[]): ColumnMapping | null {
  const h = headers.map((s) => s.toLowerCase());

  const dateCol = h.findIndex((s) =>
    /date|datum|buchung|valuta|when/.test(s)
  );
  const descCol = h.findIndex((s) =>
    /desc|besch|merchant|name|text|purpose|verwendung|payee|empf/.test(s)
  );
  const amountCol = h.findIndex((s) =>
    /^amount$|^betrag$|^summe$|^total$|^value$|^debit$|^soll$/.test(s)
  );
  const debitCol = h.findIndex((s) =>
    /debit|ausgabe|belastung|soll/.test(s)
  );

  if (dateCol === -1 || descCol === -1) { return null; }
  if (amountCol === -1 && debitCol === -1) { return null; }

  return {
    dateCol,
    descCol,
    amountCol: amountCol !== -1 ? amountCol : -1,
    debitCol: debitCol !== -1 ? debitCol : undefined,
  };
}

function parseAmount(raw: string): number {
  // Handle European format (1.234,56) and standard (1,234.56)
  let s = raw.replace(/[€$£¥\s]/g, "");
  if (/\d+\.\d{3},\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  return parseFloat(s);
}

function parseDate(raw: string): Date | null {
  // Try ISO first
  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) { return iso; }

  // DD.MM.YYYY or DD/MM/YYYY
  const eu = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (eu) {
    const [, d, m, y] = eu;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }

  return null;
}

export function parseBankStatement(
  rows: string[][],
  mapping: ColumnMapping
): BankTransaction[] {
  const result: BankTransaction[] = [];
  for (const row of rows) {
    const rawDate = row[mapping.dateCol] ?? "";
    const desc = row[mapping.descCol] ?? "";
    const rawAmount =
      mapping.debitCol !== undefined
        ? row[mapping.debitCol] ?? ""
        : row[mapping.amountCol] ?? "";

    if (!rawDate || !desc || !rawAmount) { continue; }

    const date = parseDate(rawDate);
    if (!date) { continue; }

    const amount = parseAmount(rawAmount);
    if (isNaN(amount) || amount <= 0) { continue; } // skip credits / zero

    result.push({ date, description: desc, amount, rawRow: row });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Recurring charge detection
// ---------------------------------------------------------------------------

export interface RecurringCandidate {
  name: string;
  /** Normalised merchant key used for grouping */
  key: string;
  occurrences: BankTransaction[];
  averageAmount: number;
  /** Best-guess billing frequency */
  frequency: "monthly" | "yearly" | "quarterly" | "biannually" | "weekly";
  /** Day of month most commonly charged */
  dayOfMonth: number;
  /** Earliest transaction date */
  firstSeen: Date;
}

function normalizeMerchant(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[0-9]{4,}/g, "") // strip long numbers (order IDs, etc.)
    .replace(/[^a-zäöüß ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3) // keep first 3 words
    .join(" ");
}

function guessFrequency(
  dates: Date[]
): RecurringCandidate["frequency"] {
  if (dates.length < 2) { return "monthly"; }
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(
      (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avg < 10) { return "weekly"; }
  if (avg < 45) { return "monthly"; }
  if (avg < 100) { return "quarterly"; }
  if (avg < 200) { return "biannually"; }
  return "yearly";
}

export function detectRecurring(
  transactions: BankTransaction[],
  minOccurrences = 2
): RecurringCandidate[] {
  const groups = new Map<string, BankTransaction[]>();

  for (const tx of transactions) {
    const key = normalizeMerchant(tx.description);
    if (!groups.has(key)) { groups.set(key, []); }
    groups.get(key)!.push(tx);
  }

  const candidates: RecurringCandidate[] = [];

  for (const [key, txs] of groups) {
    if (txs.length < minOccurrences) { continue; }

    // Check amounts are similar (within 20% of median)
    const amounts = txs.map((t) => t.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const consistent = amounts.every(
      (a) => Math.abs(a - median) / median < 0.2
    );
    if (!consistent) { continue; }

    const dates = txs.map((t) => t.date);
    const frequency = guessFrequency(dates);
    const days = dates.map((d) => d.getDate());
    const dayOfMonth = Math.round(
      days.reduce((a, b) => a + b, 0) / days.length
    );

    candidates.push({
      name: txs[0].description,
      key,
      occurrences: txs,
      averageAmount: Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100,
      frequency,
      dayOfMonth,
      firstSeen: dates.reduce((a, b) => (a < b ? a : b)),
    });
  }

  return candidates.sort((a, b) => b.occurrences.length - a.occurrences.length);
}

// ---------------------------------------------------------------------------
// Pivot / Google Sheets migration format
//
// Expected shape:
//   Name | Category | Interval | Jan 2024 | Feb 2024 | Mar 2024 | ...
//   Netflix | Entertainment | monthly | 15.99 | 15.99 | 0 | ...
// ---------------------------------------------------------------------------

export interface PivotRow {
  name: string;
  category: string;
  frequency: string;
  averageAmount: number;
  currency: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string | null;
  dayOfMonth: number;
}

function parseMonthHeader(header: string): Date | null {
  // "Jan 2024", "January 2024", "01/2024", "2024-01"
  const short = header.match(/^([a-z]{3,9})\s+(\d{4})$/i);
  if (short) {
    return new Date(`${short[1]} 1, ${short[2]}`);
  }
  const numeric = header.match(/^(\d{1,2})\/(\d{4})$/);
  if (numeric) {
    return new Date(parseInt(numeric[2]), parseInt(numeric[1]) - 1, 1);
  }
  const iso = header.match(/^(\d{4})-(\d{2})$/);
  if (iso) {
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, 1);
  }
  return null;
}

export function parsePivotCsv(rows: string[][]): PivotRow[] {
  if (rows.length < 2) { return []; }

  const headers = rows[0];
  const h = headers.map((s) => s.toLowerCase().trim());

  const nameCol = h.findIndex((s) => /^name$|^service$|^subscription/.test(s));
  const catCol = h.findIndex((s) => /^cat|^group|^type/.test(s));
  const intervalCol = h.findIndex((s) => /^interval|^frequency|^freq|^billing/.test(s));

  // Find month columns (anything that parses as a month header)
  const monthCols: { index: number; date: Date }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const d = parseMonthHeader(headers[i].trim());
    if (d) { monthCols.push({ index: i, date: d }); }
  }

  if (nameCol === -1 || monthCols.length === 0) { return []; }

  const results: PivotRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = row[nameCol]?.trim();
    if (!name) { continue; }

    const category = catCol !== -1 ? (row[catCol]?.trim() ?? "") : "";
    const intervalRaw = intervalCol !== -1 ? (row[intervalCol]?.trim().toLowerCase() ?? "") : "";

    // Map common interval strings
    let frequency = "monthly";
    if (/year|annual|j.hrlich/.test(intervalRaw)) { frequency = "yearly"; }
    else if (/quarter|quartal/.test(intervalRaw)) { frequency = "quarterly"; }
    else if (/bi.annual|half|halb/.test(intervalRaw)) { frequency = "biannually"; }
    else if (/week|w.chent/.test(intervalRaw)) { frequency = "weekly"; }

    // Parse monthly amounts
    const monthAmounts: { date: Date; amount: number }[] = [];
    for (const mc of monthCols) {
      const raw = row[mc.index]?.trim() ?? "";
      const amount = parseAmount(raw);
      if (!isNaN(amount) && amount > 0) {
        monthAmounts.push({ date: mc.date, amount });
      }
    }

    if (monthAmounts.length === 0) { continue; }

    const amounts = monthAmounts.map((m) => m.amount);
    const avgAmount =
      Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100;

    const sortedMonths = [...monthAmounts].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    const firstMonth = sortedMonths[0].date;
    const lastMonth = sortedMonths[sortedMonths.length - 1].date;

    // Check if it ended (last month is not the most recent month in data)
    const lastDataMonth = monthCols[monthCols.length - 1].date;
    const isEnded = lastMonth.getTime() < lastDataMonth.getTime();

    // Try to detect currency from amount cells
    const currencyMatch = row
      .slice(Math.min(...monthCols.map((m) => m.index)))
      .join("")
      .match(/[€$£¥]/);
    const currency = currencyMatch
      ? { "€": "EUR", $: "USD", "£": "GBP", "¥": "JPY" }[currencyMatch[0]] ?? "EUR"
      : "EUR";

    results.push({
      name,
      category,
      frequency,
      averageAmount: avgAmount,
      currency,
      startDate: firstMonth.toISOString().slice(0, 10),
      endDate: isEnded ? lastMonth.toISOString().slice(0, 10) : null,
      dayOfMonth: 1, // pivot format doesn't have day info; user can edit
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

export type CsvFormat = "bank" | "pivot" | "unknown";

export function detectFormat(rows: string[][]): CsvFormat {
  if (rows.length < 2) { return "unknown"; }
  const headers = rows[0].map((h) => h.toLowerCase().trim());

  // Pivot: has a column that looks like a month name
  const hasMonthCol = rows[0].some((h) => parseMonthHeader(h.trim()) !== null);
  if (hasMonthCol) { return "pivot"; }

  // Bank: has date + description + amount columns
  const mapping = detectColumns(headers);
  if (mapping) { return "bank"; }

  return "unknown";
}
