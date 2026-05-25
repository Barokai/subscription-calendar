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
  // Detect delimiter: tab takes priority (common in spreadsheet exports)
  const delimiter = raw.includes("\t") ? "\t" : raw.includes(";") ? ";" : ",";
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
  // Strip currency symbols and whitespace
  let s = raw.replace(/[€$£¥\s]/g, "").trim();
  if (!s) { return NaN; }
  // European with thousands separator: "1.290,88"
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  // European without thousands: "150,00" or "64,00"
  if (/^\d+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(",", "."));
  }
  // Standard (already dot-decimal): strip any remaining commas used as thousands sep
  return parseFloat(s.replace(/,/g, ""));
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
// Supports two shapes:
//   A) Simple English format:
//      Name | Category | Interval | Jan 2024 | Feb 2024 | ...
//
//   B) Real-world German pivot with group headers:
//      Gruppe | Beschreibung | Häufigkeit | Jänner | Februar | ... | Dezember | | Summe
//      Gemeinde                                        ← group header row (only col 0 set)
//      1.389,08 € | Kanal/Wasser | Quartal | 145,62 € | ...   ← first item in group
//                 | Strom        | Monatlich| 150,00 € | ...   ← subsequent items
// ---------------------------------------------------------------------------

/** German (incl. Austrian) month names → 0-based month index */
const GERMAN_MONTHS: Record<string, number> = {
  // Austrian/Southern German
  jänner: 0,
  // Standard German
  januar: 0, jan: 0,
  februar: 1, feb: 1,
  märz: 2, maerz: 2, mär: 2, mar: 2,
  april: 3, apr: 3,
  mai: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9,
  november: 10, nov: 10,
  dezember: 11, dez: 11,
  // English fallbacks
  january: 0, february: 1, march: 2, may: 4, june: 5, july: 6,
  october: 9, december: 11,
};

export interface PivotRow {
  name: string;
  category: string;
  frequency: string;
  averageAmount: number;
  currency: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string | null;
  dayOfMonth: number;
  hasPriceVariance: boolean;
  minAmount: number;
  maxAmount: number;
}

/**
 * Parse a column header as a month reference.
 * Supports: "Jan 2024", "Jänner", "01/2024", "2024-01".
 * When no year is present, `fallbackYear` is used (defaults to current year).
 */
function parseMonthHeader(header: string, fallbackYear = new Date().getFullYear()): Date | null {
  const h = header.trim().toLowerCase();

  // "Jan 2024" / "Jänner 2024"
  const withYear = h.match(/^([a-zäöü]{2,9})\s+(\d{4})$/);
  if (withYear) {
    const m = GERMAN_MONTHS[withYear[1]];
    if (m !== undefined) { return new Date(Date.UTC(parseInt(withYear[2]), m, 1)); }
    // English month name via Date constructor
    const d = new Date(`${withYear[1]} 1, ${withYear[2]}`);
    if (!isNaN(d.getTime())) { return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)); }
  }

  // "01/2024"
  const numeric = h.match(/^(\d{1,2})\/(\d{4})$/);
  if (numeric) { return new Date(Date.UTC(parseInt(numeric[2]), parseInt(numeric[1]) - 1, 1)); }

  // "2024-01"
  const iso = h.match(/^(\d{4})-(\d{2})$/);
  if (iso) { return new Date(Date.UTC(parseInt(iso[1]), parseInt(iso[2]) - 1, 1)); }

  // German/Austrian month name without year (e.g. "Jänner", "März")
  const m = GERMAN_MONTHS[h];
  if (m !== undefined) { return new Date(Date.UTC(fallbackYear, m, 1)); }

  return null;
}

/** Map German/English frequency text (or numeric shorthand) to app frequency strings */
function mapFrequency(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (/monatl|monthly/.test(s)) { return "monthly"; }
  if (/j.hrl|annual|yearly/.test(s)) { return "yearly"; }
  // "Quartal", "Qartal" (typo — missing 'u'), "quartalsweise", "quarterly"
  if (/q.?artal|quarter/.test(s)) { return "quarterly"; }
  if (/halbj|biann|semi/.test(s)) { return "biannually"; }
  if (/w.chent|weekly/.test(s)) { return "weekly"; }
  // Numeric: 1=monthly, 3=quarterly, 6=biannually, 12=yearly
  if (s === "1") { return "monthly"; }
  if (s === "3") { return "quarterly"; }
  if (s === "6") { return "biannually"; }
  if (s === "12") { return "yearly"; }
  return "";
}

/** Infer billing frequency from which months have payments */
function inferFrequency(activeMonthIndices: number[]): string {
  const n = activeMonthIndices.length;
  if (n === 0) { return "monthly"; }
  if (n === 1) { return "yearly"; }
  if (n <= 2) { return "biannually"; }
  if (n <= 4) { return "quarterly"; }
  return "monthly";
}

export function parsePivotCsv(rows: string[][]): PivotRow[] {
  if (rows.length < 2) { return []; }

  const headers = rows[0];
  const h = headers.map((s) => s.toLowerCase().trim());
  const fallbackYear = new Date().getFullYear();

  // ── Locate well-known columns ─────────────────────────────────────────────
  // German: Gruppe | Beschreibung | Häufigkeit
  // English: (group) | name/service | interval/frequency
  const groupCol = h.findIndex((s) => /^gruppe$|^group$|^cat/.test(s));
  const nameCol = h.findIndex((s) =>
    /^name$|^service$|^subscription|^beschreibung$|^bezeichnung$/.test(s)
  );
  const freqCol = h.findIndex((s) =>
    /^h.ufigkeit$|^interval$|^frequency$|^freq$|^billing/.test(s)
  );

  // ── Locate month columns (skip "Summe" / total columns) ───────────────────
  const SKIP_HEADERS = /^summe$|^total$|^gesamt$|^sum$/;
  const monthCols: { index: number; date: Date }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const raw = headers[i].trim();
    if (SKIP_HEADERS.test(raw.toLowerCase())) { continue; }
    const d = parseMonthHeader(raw, fallbackYear);
    if (d) { monthCols.push({ index: i, date: d }); }
  }

  // We need at least a name column OR month columns to proceed
  if (monthCols.length === 0) { return []; }

  // Effective name column: if no header found, try column 1 (common in German pivot)
  const effectiveNameCol = nameCol !== -1 ? nameCol : (groupCol !== -1 ? groupCol + 1 : 1);

  const results: PivotRow[] = [];
  let currentCategory = "";

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];

    const rawGroup = groupCol !== -1 ? (row[groupCol]?.trim() ?? "") : "";
    const rawName = row[effectiveNameCol]?.trim() ?? "";
    const rawFreq = freqCol !== -1 ? (row[freqCol]?.trim() ?? "") : "";

    // ── Group header row: only the group column has text, name is empty ───
    if (rawName === "" && rawGroup !== "" && !parseAmount(rawGroup)) {
      currentCategory = rawGroup;
      continue;
    }

    // ── Skip rows with no subscription name ───────────────────────────────
    if (rawName === "") { continue; }

    // ── Group subtotal row: group col has a currency amount, ignore it ────
    // (name is filled — this IS a data row; just discard the group-total cell)

    // Use the group column value as category only if it's a plain text name,
    // not a currency amount (those are group subtotals placed in the Gruppe cell)
    const categoryFromRow =
      rawGroup && !parseAmount(rawGroup) ? rawGroup : currentCategory;
    const category = categoryFromRow || "";

    // ── Parse monthly amounts ─────────────────────────────────────────────
    const monthAmounts: { date: Date; amount: number; monthIndex: number }[] = [];
    for (let mi = 0; mi < monthCols.length; mi++) {
      const mc = monthCols[mi];
      const raw = row[mc.index]?.trim() ?? "";
      const amount = parseAmount(raw);
      if (!isNaN(amount) && amount > 0) {
        monthAmounts.push({ date: mc.date, amount, monthIndex: mi });
      }
    }

    if (monthAmounts.length === 0) { continue; }

    // ── Frequency ─────────────────────────────────────────────────────────
    // Track whether the user explicitly provided a frequency in the CSV.
    // If they did, we trust the subscription is ongoing (no auto-end date).
    const hasExplicitFrequency = rawFreq.trim() !== "" && mapFrequency(rawFreq.trim()) !== "";
    let frequency = hasExplicitFrequency ? mapFrequency(rawFreq.trim()) : "";
    if (!frequency) {
      frequency = inferFrequency(monthAmounts.map((m) => m.monthIndex));
    }

    // ── Average / start / end ─────────────────────────────────────────────
    const amounts = monthAmounts.map((m) => m.amount);
    const avgAmount =
      Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100;

    const sortedMonths = [...monthAmounts].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    const firstMonth = sortedMonths[0].date;
    const lastMonth = sortedMonths[sortedMonths.length - 1].date;
    const lastDataMonth = monthCols[monthCols.length - 1].date;
    // Only infer end date from payment pattern when no explicit frequency was given.
    // A yearly expense that appears once in the data window should not be marked as ended.
    const isEnded = !hasExplicitFrequency && lastMonth.getTime() < lastDataMonth.getTime();

    // ── Detect currency ────────────────────────────────────────────────────
    const currencyMatch = row
      .slice(Math.min(...monthCols.map((mc) => mc.index)))
      .join("")
      .match(/[€$£¥]/);
    const currency = currencyMatch
      ? ({ "€": "EUR", $: "USD", "£": "GBP", "¥": "JPY" }[currencyMatch[0]] ?? "EUR")
      : "EUR";

    // ── Price variance ────────────────────────────────────────────────────
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const hasPriceVariance = minAmount !== maxAmount;

    results.push({
      name: rawName,
      category,
      frequency,
      averageAmount: avgAmount,
      currency,
      startDate: firstMonth.toISOString().slice(0, 10),
      endDate: isEnded ? lastMonth.toISOString().slice(0, 10) : null,
      dayOfMonth: 1,
      hasPriceVariance,
      minAmount,
      maxAmount,
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
