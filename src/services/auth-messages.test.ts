import { describe, expect, it } from "vitest";
import { authMessage, safeNextPath } from "./auth-messages";

describe("auth messages", () => {
  it("explains an unconfirmed email", () => {
    expect(authMessage({ code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/confirm your email/i);
  });

  it("explains a wrong password", () => {
    expect(authMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "Email or password is incorrect.",
    );
  });

  it("explains an email that is already registered", () => {
    expect(authMessage({ message: "User already registered" })).toMatch(/already exists/i);
  });

  it("keeps only same-app redirect paths", () => {
    expect(safeNextPath("/history")).toBe("/history");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
  });
});
