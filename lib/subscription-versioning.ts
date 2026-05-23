import { Subscription, SubscriptionInput } from "@/lib/subscriptions";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function getPreviousIsoDate(isoDate: string): string | null {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setUTCDate(parsed.getUTCDate() - 1);
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function findSubscriptionWithSameStartDate(
  subscriptions: Subscription[],
  input: SubscriptionInput
): Subscription | null {
  const normalized = normalizeName(input.name);
  const found =
    subscriptions.find(
      (s) =>
        normalizeName(s.name) === normalized && s.startDate === input.startDate
    ) ?? null;
  return found;
}

export function findOverlappingSubscriptionVersion(
  subscriptions: Subscription[],
  input: SubscriptionInput
): Subscription | null {
  const normalized = normalizeName(input.name);

  const candidates = subscriptions.filter((s) => {
    if (normalizeName(s.name) !== normalized) {
      return false;
    }

    if (s.startDate > input.startDate) {
      return false;
    }

    return s.endDate === null || s.endDate >= input.startDate;
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return candidates[0];
}
