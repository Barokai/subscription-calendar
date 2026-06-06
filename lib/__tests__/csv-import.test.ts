/**
 * Tests for lib/csv-import.ts
 *
 * Coverage:
 *   - parseAmount (European + standard formats)
 *   - parsePivotCsv (German real-world format with group headers, English simple format)
 *   - parseBankStatement
 *   - detectRecurring
 *   - detectFormat
 *   - detectColumns
 */

import { describe, it, expect } from "vitest";
import {
  parseCsv,
  detectColumns,
  parseBankStatement,
  detectRecurring,
  parsePivotCsv,
  detectFormat,
  type ColumnMapping,
} from "../csv-import";

// ---------------------------------------------------------------------------
// parseCsv — delimiter detection
// ---------------------------------------------------------------------------

describe("parseCsv", () => {
  it("parses comma-separated values", () => {
    const rows = parseCsv("a,b,c\n1,2,3");
    expect(rows).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("prefers tab delimiter when tabs are present", () => {
    const rows = parseCsv("a\tb\tc\n1\t2\t3");
    expect(rows).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("parses semicolon-separated values", () => {
    const rows = parseCsv("a;b;c\n1;2;3");
    expect(rows).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("strips surrounding quotes", () => {
    const rows = parseCsv('"hello","world"\n"foo","bar"');
    expect(rows).toEqual([["hello", "world"], ["foo", "bar"]]);
  });

  it("filters out completely empty rows", () => {
    const rows = parseCsv("a,b\n\nc,d");
    expect(rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// parseAmount (tested indirectly via parsePivotCsv / parseBankStatement)
// We test it directly by using parsePivotCsv with known amounts.
// ---------------------------------------------------------------------------

describe("parsePivotCsv — amount parsing", () => {
  function makeRow(amount: string) {
    return [
      ["Name", "Category", "Interval", "Jan 2024"],
      ["Test Sub", "cat", "monthly", amount],
    ];
  }

  it("parses European format with thousands separator: 1.290,88 €", () => {
    const [r] = parsePivotCsv(makeRow("1.290,88 €"));
    expect(r.averageAmount).toBe(1290.88);
  });

  it("parses European format without thousands separator: 150,00 €", () => {
    const [r] = parsePivotCsv(makeRow("150,00 €"));
    expect(r.averageAmount).toBe(150);
  });

  it("parses small European amount: 64,00 €", () => {
    const [r] = parsePivotCsv(makeRow("64,00 €"));
    expect(r.averageAmount).toBe(64);
  });

  it("parses standard dot-decimal format: 15.99", () => {
    const [r] = parsePivotCsv(makeRow("15.99"));
    expect(r.averageAmount).toBe(15.99);
  });

  it("parses USD amount: $9.99", () => {
    const [r] = parsePivotCsv(makeRow("$9.99"));
    expect(r.averageAmount).toBe(9.99);
  });
});

// ---------------------------------------------------------------------------
// parsePivotCsv — English simple format
// ---------------------------------------------------------------------------

describe("parsePivotCsv — English simple format", () => {
  const HEADERS = ["Name", "Category", "Interval", "Jan 2024", "Feb 2024", "Mar 2024"];

  it("parses a basic monthly subscription", () => {
    const rows = [
      HEADERS,
      ["Netflix", "Entertainment", "monthly", "15.99", "15.99", "15.99"],
    ];
    const result = parsePivotCsv(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Netflix");
    expect(result[0].category).toBe("Entertainment");
    expect(result[0].frequency).toBe("monthly");
    expect(result[0].averageAmount).toBe(15.99);
  });

  it("parses a yearly subscription (amount in only one month)", () => {
    const rows = [
      HEADERS,
      ["Antivirus", "Software", "yearly", "99.00", "", ""],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.frequency).toBe("yearly");
    expect(r.averageAmount).toBe(99);
    // Explicit interval given — must not be marked as ended even though only one payment
    expect(r.endDate).toBeNull();
  });

  it("parses a quarterly subscription", () => {
    const rows = [
      ["Name", "Category", "Interval", "Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024"],
      ["iCloud", "Storage", "quarterly", "2.99", "", "", "2.99", "", "2.99"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.frequency).toBe("quarterly");
  });

  it("sets startDate to the first month with a payment", () => {
    const rows = [
      HEADERS,
      ["Spotify", "Music", "monthly", "", "9.99", "9.99"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.startDate).toBe("2024-02-01");
  });

  it("does NOT set endDate when explicit interval given, even if not paid up to last month", () => {
    const rows = [
      HEADERS,
      ["OldSub", "Other", "monthly", "5.00", "5.00", ""],
    ];
    const [r] = parsePivotCsv(rows);
    // Explicit interval: trust user that subscription is ongoing
    expect(r.endDate).toBeNull();
  });

  it("sets endDate when NO explicit interval given and last paid month is before last data month", () => {
    const rows = [
      HEADERS,
      ["OldSub", "Other", "", "5.00", "5.00", ""],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.endDate).toBe("2024-02-01");
  });

  it("sets endDate to null when paid up to the last month", () => {
    const rows = [
      HEADERS,
      ["ActiveSub", "Other", "monthly", "5.00", "5.00", "5.00"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.endDate).toBeNull();
  });

  it("skips rows with no name", () => {
    const rows = [
      HEADERS,
      ["", "Cat", "monthly", "5.00", "5.00", "5.00"],
    ];
    expect(parsePivotCsv(rows)).toHaveLength(0);
  });

  it("skips rows with no payments", () => {
    const rows = [
      HEADERS,
      ["NoPayments", "Cat", "monthly", "", "", ""],
    ];
    expect(parsePivotCsv(rows)).toHaveLength(0);
  });

  it("detects EUR currency from € symbol", () => {
    const rows = [HEADERS, ["Sub", "Cat", "monthly", "9,99 €", "9,99 €", "9,99 €"]];
    const [r] = parsePivotCsv(rows);
    expect(r.currency).toBe("EUR");
  });

  it("returns empty array for fewer than 2 rows", () => {
    expect(parsePivotCsv([["Name", "Jan 2024"]])).toHaveLength(0);
    expect(parsePivotCsv([])).toHaveLength(0);
  });

  it("returns empty array when no month columns found", () => {
    const rows = [["Name", "Category"], ["Netflix", "Entertainment"]];
    expect(parsePivotCsv(rows)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parsePivotCsv — German real-world format (group headers, no year)
// ---------------------------------------------------------------------------

describe("parsePivotCsv — German format", () => {
  // Mirrors the actual user spreadsheet structure
  const GERMAN_HEADERS = [
    "Gruppe", "Beschreibung", "Häufigkeit",
    "Jänner", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
    "", "Summe",
  ];

  function buildGermanRows(dataRows: string[][]): string[][] {
    return [GERMAN_HEADERS, ...dataRows];
  }

  it("detects German column headers (Gruppe, Beschreibung, Häufigkeit)", () => {
    const rows = buildGermanRows([
      ["Gemeinde", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["1.389,08 €", "Kanal/Wasser", "Quartal", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "", "582,47 €"],
    ]);
    const result = parsePivotCsv(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Kanal/Wasser");
  });

  it("assigns category from group header row", () => {
    const rows = buildGermanRows([
      ["Gemeinde", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "Kanal/Wasser", "Quartal", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "", ""],
      ["Haus", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "Miete", "Monatlich", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "", ""],
    ]);
    const result = parsePivotCsv(rows);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("Gemeinde");
    expect(result[1].category).toBe("Haus");
  });

  it("skips group subtotal rows (€ amount in Gruppe col, no name)", () => {
    const rows = buildGermanRows([
      ["Gemeinde", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      // subtotal row: no name (Beschreibung), first column has group total
      ["1.389,08 €", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["", "Kanal/Wasser", "Quartal", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "", ""],
    ]);
    const result = parsePivotCsv(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Kanal/Wasser");
  });

  it("extracts category from Gruppe col on data rows that have a group name (not amount)", () => {
    const rows = buildGermanRows([
      ["Haus", "Miete", "Monatlich", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "", ""],
    ]);
    const [r] = parsePivotCsv(rows);
    expect(r.category).toBe("Haus");
  });

  it("maps Monatlich → monthly", () => {
    const rows = buildGermanRows([
      ["", "Strom", "Monatlich", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "", ""],
    ]);
    const [r] = parsePivotCsv(rows);
    expect(r.frequency).toBe("monthly");
    expect(r.hasExplicitFrequency).toBe(true);
  });

  it("maps Quartal → quarterly", () => {
    const rows = buildGermanRows([
      ["", "Kanal/Wasser", "Quartal", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "", ""],
    ]);
    expect(parsePivotCsv(rows)[0].frequency).toBe("quarterly");
  });

  it("maps Jährlich → yearly and does not set endDate for single-month payment", () => {
    const rows = buildGermanRows([
      ["", "Rauchfangkehrer", "Jährlich", "", "", "", "", "", "", "", "", "", "50,00 €", "", "", "", ""],
    ]);
    const [r] = parsePivotCsv(rows);
    expect(r.frequency).toBe("yearly");
    expect(r.hasExplicitFrequency).toBe(true);
    expect(r.endDate).toBeNull(); // explicit "Jährlich" — not ended even though only one payment in the window
  });

  it("keeps explicit recurring frequencies like yearly and quarterly", () => {
    const rows = buildGermanRows([
      ["", "Bonus", "Jährlich", "", "", "", "", "500,00 €", "", "", "", "", "", "", "", "", ""],
      ["", "Allowance", "Quartal", "120,00 €", "", "", "120,00 €", "", "", "120,00 €", "", "", "120,00 €", "", "", "", ""],
    ]);
    const result = parsePivotCsv(rows);
    expect(result[0].frequency).toBe("yearly");
    expect(result[0].hasExplicitFrequency).toBe(true);
    expect(result[1].frequency).toBe("quarterly");
    expect(result[1].hasExplicitFrequency).toBe(true);
  });

  it("captures raw month occurrences for non-explicit frequency text", () => {
    const rows = buildGermanRows([
      ["", "Urlaubsgeld", "Juni/Nov", "", "", "", "", "", "4.410,13 €", "", "", "", "", "4.329,53 €", "", "", ""],
    ]);
    const [r] = parsePivotCsv(rows);
    expect(r.hasExplicitFrequency).toBe(false);
    expect(r.rawFrequency).toBe("Juni/Nov");
    expect(r.monthOccurrences).toHaveLength(2);
    expect(r.monthOccurrences[0]).toMatchObject({ date: `${new Date().getFullYear()}-06-01`, amount: 4410.13 });
    expect(r.monthOccurrences[1]).toMatchObject({ date: `${new Date().getFullYear()}-11-01`, amount: 4329.53 });
  });

  it("infers yearly when no frequency given and amount appears exactly once", () => {
    const rows = buildGermanRows([
      ["", "Wartung Gastherme", "", "", "", "", "", "", "", "", "", "", "162,00 €", "", "", "", ""],
    ]);
    const [r] = parsePivotCsv(rows);
    expect(r.frequency).toBe("yearly");
    expect(r.averageAmount).toBe(162);
  });

  it("infers monthly when no frequency given and amount appears in all 12 months", () => {
    const rows = buildGermanRows([
      ["", "NoFreqMonthly", "", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "10,00 €", "", ""],
    ]);
    expect(parsePivotCsv(rows)[0].frequency).toBe("monthly");
  });

  it("infers quarterly when no frequency given and amount appears 4 times", () => {
    const rows = buildGermanRows([
      ["", "NoFreqQuarterly", "", "10,00 €", "", "", "10,00 €", "", "", "10,00 €", "", "", "10,00 €", "", "", "", ""],
    ]);
    expect(parsePivotCsv(rows)[0].frequency).toBe("quarterly");
  });

  it("infers biannually when no frequency given and amount appears twice", () => {
    const rows = buildGermanRows([
      ["", "NoFreqBiannual", "", "20,00 €", "", "", "", "", "", "20,00 €", "", "", "", "", "", "", ""],
    ]);
    expect(parsePivotCsv(rows)[0].frequency).toBe("biannually");
  });

  it("excludes Summe column from month detection", () => {
    const rows = buildGermanRows([
      ["", "Strom", "Monatlich", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "150,00 €", "", "1.800,00 €"],
    ]);
    const [r] = parsePivotCsv(rows);
    // Should have exactly 12 months, not 13 (Summe should be excluded)
    expect(r.averageAmount).toBe(150); // avg of 12 × 150, not skewed by Summe
  });

  it("parses German months without year and uses current year as fallback", () => {
    const rows = buildGermanRows([
      ["", "Miete", "Monatlich", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "", ""],
    ]);
    const [r] = parsePivotCsv(rows);
    const currentYear = new Date().getFullYear();
    expect(r.startDate.startsWith(String(currentYear))).toBe(true);
  });

  it("handles full group structure: Gemeinde + Haus with multiple items each", () => {
    const rows = buildGermanRows([
      ["Gemeinde", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["1.389,08 €", "Kanal/Wasser", "Quartal", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "145,62 €", "", "", "", "582,47 €"],
      ["", "Kanalgrundgebühr", "Quartal", "11,00 €", "", "", "11,00 €", "", "", "11,00 €", "", "", "11,00 €", "", "", "", "44,00 €"],
      ["Haus", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["19.791,76 €", "Miete", "Monatlich", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "1.290,88 €", "", "15.490,56 €"],
      ["", "Gas", "Monatlich", "90,00 €", "90,00 €", "90,00 €", "90,00 €", "90,00 €", "90,00 €", "90,00 €", "90,00 €", "64,00 €", "64,00 €", "64,00 €", "64,00 €", "", "976,00 €"],
    ]);
    const result = parsePivotCsv(rows);
    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({ name: "Kanal/Wasser", category: "Gemeinde", frequency: "quarterly" });
    expect(result[1]).toMatchObject({ name: "Kanalgrundgebühr", category: "Gemeinde", frequency: "quarterly" });
    expect(result[2]).toMatchObject({ name: "Miete", category: "Haus", frequency: "monthly" });
    expect(result[3]).toMatchObject({ name: "Gas", category: "Haus", frequency: "monthly" });
  });
});

// ---------------------------------------------------------------------------
// parsePivotCsv — month header formats
// ---------------------------------------------------------------------------

describe("parsePivotCsv — month header formats", () => {
  it("parses 'Jan 2024' style headers", () => {
    const rows = [
      ["Name", "Jan 2024", "Feb 2024"],
      ["Sub", "9.99", "9.99"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.startDate).toBe("2024-01-01");
  });

  it("parses '01/2024' style headers", () => {
    const rows = [
      ["Name", "01/2024", "02/2024"],
      ["Sub", "9.99", "9.99"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.startDate).toBe("2024-01-01");
  });

  it("parses '2024-01' ISO style headers", () => {
    const rows = [
      ["Name", "2024-01", "2024-02"],
      ["Sub", "9.99", "9.99"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.startDate).toBe("2024-01-01");
  });

  it("handles all 12 Austrian/German month names", () => {
    const months = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const amounts = months.map(() => "10,00 €");
    const rows = [
      ["Name", ...months],
      ["Sub", ...amounts],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.averageAmount).toBe(10);
    // 12 months parsed successfully
    const currentYear = new Date().getFullYear();
    expect(r.startDate).toBe(`${currentYear}-01-01`);
  });
});

// ---------------------------------------------------------------------------
// parsePivotCsv — price variance detection
// ---------------------------------------------------------------------------

describe("parsePivotCsv — price variance", () => {
  it("sets hasPriceVariance=false when all amounts are equal", () => {
    const rows = [
      ["Name", "Jan 2024", "Feb 2024", "Mar 2024"],
      ["Netflix", "9.99", "9.99", "9.99"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.hasPriceVariance).toBe(false);
    expect(r.minAmount).toBe(9.99);
    expect(r.maxAmount).toBe(9.99);
  });

  it("sets hasPriceVariance=true when amounts differ", () => {
    const rows = [
      ["Name", "Jan 2024", "Feb 2024", "Mar 2024"],
      ["Gas", "90.00", "90.00", "64.00"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.hasPriceVariance).toBe(true);
    expect(r.minAmount).toBe(64);
    expect(r.maxAmount).toBe(90);
  });

  it("sets hasPriceVariance=true for German amounts with varying values", () => {
    const rows = [
      ["Beschreibung", "Häufigkeit", "Jänner", "Februar", "März", "April"],
      ["Haushaltsversicherung", "Monatlich", "26,85 €", "26,85 €", "25,97 €", "25,97 €"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.hasPriceVariance).toBe(true);
    expect(r.minAmount).toBeCloseTo(25.97, 2);
    expect(r.maxAmount).toBeCloseTo(26.85, 2);
  });

  it("sets hasPriceVariance=false for single-payment yearly subscription", () => {
    const rows = [
      ["Name", "Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024",
       "Jul 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024"],
      ["Annual sub", "", "", "", "", "", "", "", "", "", "", "", "50.00"],
    ];
    const [r] = parsePivotCsv(rows);
    expect(r.hasPriceVariance).toBe(false);
    expect(r.minAmount).toBe(50);
    expect(r.maxAmount).toBe(50);
  });
});



describe("detectFormat", () => {
  it("detects pivot format when headers include month names", () => {
    const rows = [["Name", "Category", "Jan 2024", "Feb 2024"], ["Netflix", "Entertainment", "15.99", "15.99"]];
    expect(detectFormat(rows)).toBe("pivot");
  });

  it("detects pivot format with German month names (no year)", () => {
    const rows = [
      ["Gruppe", "Beschreibung", "Häufigkeit", "Jänner", "Februar"],
      ["", "Miete", "Monatlich", "1.290,88 €", "1.290,88 €"],
    ];
    expect(detectFormat(rows)).toBe("pivot");
  });

  it("detects bank format from headers", () => {
    const rows = [
      ["Date", "Description", "Amount"],
      ["2024-01-15", "Netflix", "15.99"],
    ];
    expect(detectFormat(rows)).toBe("bank");
  });

  it("returns unknown for unrecognised format", () => {
    const rows = [["Foo", "Bar"], ["a", "b"]];
    expect(detectFormat(rows)).toBe("unknown");
  });

  it("returns unknown for fewer than 2 rows", () => {
    expect(detectFormat([["Name", "Jan 2024"]])).toBe("unknown");
    expect(detectFormat([])).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// detectColumns
// ---------------------------------------------------------------------------

describe("detectColumns", () => {
  it("finds standard English columns", () => {
    const headers = ["Date", "Description", "Amount"];
    const m = detectColumns(headers);
    expect(m).not.toBeNull();
    expect(m!.dateCol).toBe(0);
    expect(m!.descCol).toBe(1);
    expect(m!.amountCol).toBe(2);
  });

  it("finds German column names", () => {
    const headers = ["Datum", "Beschreibung", "Betrag"];
    const m = detectColumns(headers);
    expect(m).not.toBeNull();
    expect(m!.dateCol).toBe(0);
    expect(m!.descCol).toBe(1);
    expect(m!.amountCol).toBe(2);
  });

  it("returns null when date column is missing", () => {
    expect(detectColumns(["Description", "Amount"])).toBeNull();
  });

  it("returns null when both amount and debit columns are missing", () => {
    expect(detectColumns(["Date", "Description", "Notes"])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseBankStatement
// ---------------------------------------------------------------------------

describe("parseBankStatement", () => {
  const MAPPING: ColumnMapping = { dateCol: 0, descCol: 1, amountCol: 2 };

  it("parses basic rows", () => {
    const rows = [
      ["2024-01-15", "Netflix", "15.99"],
      ["2024-01-20", "Spotify", "9.99"],
    ];
    const result = parseBankStatement(rows, MAPPING);
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("Netflix");
    expect(result[0].amount).toBe(15.99);
    expect(result[1].description).toBe("Spotify");
  });

  it("parses European amount format", () => {
    const rows = [["15.01.2024", "Miete", "1.290,88 €"]];
    const result = parseBankStatement(rows, MAPPING);
    expect(result[0].amount).toBe(1290.88);
  });

  it("parses DD.MM.YYYY date format", () => {
    const rows = [["15.01.2024", "Netflix", "15.99"]];
    const result = parseBankStatement(rows, MAPPING);
    expect(result[0].date.getMonth()).toBe(0); // January
    expect(result[0].date.getDate()).toBe(15);
    expect(result[0].date.getFullYear()).toBe(2024);
  });

  it("skips rows with missing date or description", () => {
    const rows = [
      ["", "Netflix", "15.99"],
      ["2024-01-15", "", "15.99"],
      ["2024-01-15", "Valid", "9.99"],
    ];
    const result = parseBankStatement(rows, MAPPING);
    expect(result).toHaveLength(1);
  });

  it("skips rows with zero or negative amounts (credits)", () => {
    const rows = [
      ["2024-01-15", "Refund", "0"],
      ["2024-01-16", "Credit", "-15.99"],
      ["2024-01-17", "Netflix", "15.99"],
    ];
    const result = parseBankStatement(rows, MAPPING);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Netflix");
  });

  it("skips rows with unparseable dates", () => {
    const rows = [["not-a-date", "Netflix", "15.99"]];
    expect(parseBankStatement(rows, MAPPING)).toHaveLength(0);
  });

  it("uses debitCol when specified", () => {
    const mappingWithDebit: ColumnMapping = { dateCol: 0, descCol: 1, amountCol: -1, debitCol: 2 };
    const rows = [["2024-01-15", "Netflix", "15.99"]];
    const result = parseBankStatement(rows, mappingWithDebit);
    expect(result[0].amount).toBe(15.99);
  });
});

// ---------------------------------------------------------------------------
// detectRecurring
// ---------------------------------------------------------------------------

describe("detectRecurring", () => {
  function makeTx(desc: string, amount: number, daysOffset: number) {
    return {
      date: new Date(2024, 0, 1 + daysOffset),
      description: desc,
      amount,
      rawRow: [],
    };
  }

  it("detects monthly recurring charges", () => {
    const txs = [
      makeTx("NETFLIX MONTHLY", 15.99, 0),
      makeTx("NETFLIX MONTHLY", 15.99, 31),
      makeTx("NETFLIX MONTHLY", 15.99, 62),
    ];
    const candidates = detectRecurring(txs);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].frequency).toBe("monthly");
    expect(candidates[0].averageAmount).toBe(15.99);
  });

  it("detects yearly recurring charges", () => {
    const txs = [
      makeTx("ADOBE ANNUAL", 59.99, 0),
      makeTx("ADOBE ANNUAL", 59.99, 365),
    ];
    const candidates = detectRecurring(txs);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].frequency).toBe("yearly");
  });

  it("excludes charges that appear only once (below minOccurrences)", () => {
    const txs = [makeTx("ONE TIME PURCHASE", 49.99, 0)];
    expect(detectRecurring(txs, 2)).toHaveLength(0);
  });

  it("excludes charges with inconsistent amounts (>20% variance)", () => {
    const txs = [
      makeTx("VARIABLE CHARGE", 10.00, 0),
      makeTx("VARIABLE CHARGE", 25.00, 31), // >20% different
    ];
    expect(detectRecurring(txs)).toHaveLength(0);
  });

  it("groups transactions by normalised merchant name", () => {
    const txs = [
      makeTx("SPOTIFY PREMIUM 1234567", 9.99, 0),
      makeTx("SPOTIFY PREMIUM 8901234", 9.99, 31),
      makeTx("SPOTIFY PREMIUM 5678901", 9.99, 62),
    ];
    // Same merchant, different order numbers → should be grouped
    const candidates = detectRecurring(txs);
    expect(candidates).toHaveLength(1);
  });

  it("detects weekly recurring charges", () => {
    const txs = [
      makeTx("GYM WEEKLY", 5.00, 0),
      makeTx("GYM WEEKLY", 5.00, 7),
      makeTx("GYM WEEKLY", 5.00, 14),
    ];
    const [c] = detectRecurring(txs);
    expect(c.frequency).toBe("weekly");
  });

  it("sorts candidates by occurrence count descending", () => {
    const txs = [
      makeTx("NETFLIX", 15.99, 0),
      makeTx("NETFLIX", 15.99, 31),
      makeTx("NETFLIX", 15.99, 62),
      makeTx("SPOTIFY", 9.99, 0),
      makeTx("SPOTIFY", 9.99, 31),
    ];
    const candidates = detectRecurring(txs);
    expect(candidates[0].occurrences.length).toBeGreaterThanOrEqual(
      candidates[candidates.length - 1].occurrences.length
    );
  });
});
