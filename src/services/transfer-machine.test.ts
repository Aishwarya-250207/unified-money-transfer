import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  holdSecondsFor,
  isTerminal,
  InvalidTransitionError,
  assertCheckoutEligible,
} from "./transfer-machine";

describe("transfer status rules", () => {
  it("allows draft -> pending, completed, cancelled", () => {
    expect(canTransition("draft", "pending")).toBe(true);
    expect(canTransition("draft", "completed")).toBe(true);
    expect(canTransition("draft", "cancelled")).toBe(true);
  });

  it("allows pending -> completed and cancelled, but not back to draft", () => {
    expect(canTransition("pending", "completed")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("pending", "draft")).toBe(false);
  });

  it("treats completed and cancelled as terminal", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("draft")).toBe(false);
    expect(isTerminal("pending")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "completed")).toBe(false);
  });

  it("throws InvalidTransitionError on illegal moves", () => {
    expect(() => assertTransition("completed", "pending")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("draft", "pending")).not.toThrow();
  });

  it("gives every transfer a 60-second cancellation window", () => {
    expect(holdSecondsFor("LOW")).toBe(60);
    expect(holdSecondsFor("MEDIUM")).toBe(60);
    expect(holdSecondsFor("HIGH")).toBe(60);
    expect(holdSecondsFor(undefined)).toBe(60);
  });

  it("blocks checkout before the saved 60-second deadline", () => {
    const deadline = new Date(60_000).toISOString();
    expect(() => assertCheckoutEligible("pending", deadline, 59_999)).toThrow();
    expect(() => assertCheckoutEligible("pending", deadline, 60_000)).not.toThrow();
  });

  it("blocks checkout for cancelled transfers even after the deadline", () => {
    expect(() => assertCheckoutEligible("cancelled", new Date(60_000).toISOString(), 60_001)).toThrow();
  });

  it("blocks checkout when no valid deadline was saved", () => {
    expect(() => assertCheckoutEligible("pending", undefined)).toThrow();
    expect(() => assertCheckoutEligible("pending", "invalid")).toThrow();
  });
});
