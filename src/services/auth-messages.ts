/** User-facing copy for Cloud auth failures. Pure so tests do not need a network. */
export function authMessage(error: { message?: string; code?: string }): string {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirm your email before logging in. Check your inbox for the SafeSend link.";
  }
  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "Email or password is incorrect.";
  }
  if (code === "user_already_exists" || message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email already exists. Log in instead.";
  }
  if (code === "over_request_rate_limit" || message.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (code === "weak_password" || message.includes("password")) {
    return error.message?.trim() || "Choose a stronger password.";
  }
  return error.message?.trim() || "Something went wrong. Try again.";
}

/** Internal app paths only. Rejects protocol-relative and absolute URLs. */
export function safeNextPath(value: string | undefined, fallback = "/dashboard"): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  return fallback;
}
