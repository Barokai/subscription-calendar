import { describe, expect, it } from "vitest";
import { Subscription, SubscriptionInput } from "@/lib/subscriptions";
import {
  findOverlappingSubscriptionVersion,
  findSubscriptionWithSameStartDate,
  getPreviousIsoDate,
} from "../subscription-versioning";

function buildSubscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: "sub-1",
    userId: "user-1",
    name: "Spotify",
    amount: 9.99,
    currency: "EUR",
    frequency: "monthly",
    dayOfMonth: 10,
    color: null,
    category: null,
    startDate: "2024-01-01",
    endDate: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildInput(overrides: Partial<SubscriptionInput>): SubscriptionInput {
  return {
    name: "Spotify",
    amount: 12.99,
    currency: "EUR",
    frequency: "monthly",
    dayOfMonth: 10,
    startDate: "2024-06-01",
    endDate: null,
    category: null,
    color: null,
    ...overrides,
  };
}

describe("subscription-versioning", () => {
  it("returns previous day for a valid ISO date", () => {
    expect(getPreviousIsoDate("2024-06-01")).toBe("2024-05-31");
  });

  it("returns null for invalid dates", () => {
    expect(getPreviousIsoDate("not-a-date")).toBeNull();
  });

  it("finds same start-date version with case-insensitive name match", () => {
    const subs = [buildSubscription({ name: "SPOTIFY", startDate: "2024-06-01" })];
    const input = buildInput({ name: "spotify", startDate: "2024-06-01" });

    const match = findSubscriptionWithSameStartDate(subs, input);
    expect(match?.id).toBe("sub-1");
  });

  it("finds overlapping active version for same name", () => {
    const subs = [
      buildSubscription({
        id: "old",
        startDate: "2024-01-01",
        endDate: null,
      }),
      buildSubscription({
        id: "newer",
        startDate: "2024-03-01",
        endDate: null,
      }),
    ];
    const input = buildInput({ startDate: "2024-06-01" });

    const match = findOverlappingSubscriptionVersion(subs, input);
    expect(match?.id).toBe("newer");
  });

  it("does not return ended versions that ended before input start date", () => {
    const subs = [
      buildSubscription({
        id: "ended",
        startDate: "2024-01-01",
        endDate: "2024-05-31",
      }),
    ];
    const input = buildInput({ startDate: "2024-06-01" });

    const match = findOverlappingSubscriptionVersion(subs, input);
    expect(match).toBeNull();
  });
});
