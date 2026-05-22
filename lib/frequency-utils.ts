/**
 * Determines whether a subscription payment falls within a given month/year
 * based on its billing frequency and start date.
 */
export function isPaymentInMonth(
  frequency: string,
  startDate: Date,
  currentMonth: number,
  currentYear: number
): boolean {
  if (isNaN(startDate.getTime())) {
    return false;
  }

  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const totalMonthsDiff =
    (currentYear - startYear) * 12 + (currentMonth - startMonth);

  if (totalMonthsDiff < 0) {
    return false;
  }

  switch (frequency) {
    case "yearly":
      return currentMonth === startMonth && totalMonthsDiff % 12 === 0;
    case "quarterly":
      return totalMonthsDiff % 3 === 0;
    case "biannually":
      return totalMonthsDiff % 6 === 0;
    case "monthly":
    case "weekly":
    case "biweekly":
    case "daily":
    default:
      return true;
  }
}
