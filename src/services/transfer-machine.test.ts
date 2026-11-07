import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  holdSecondsFor,
  isTerminal,
  InvalidTransitionError,
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

  it("applies cancellation windows by risk level: LOW 0s, MEDIUM 60s, HIGH 180s", () => {
    expect(holdSecondsFor("LOW")).toBe(0);
    expect(holdSecondsFor("MEDIUM")).toBe(60);
    expect(holdSecondsFor("HIGH")).toBe(180);
    expect(holdSecondsFor(undefined)).toBe(180);
  });
});
