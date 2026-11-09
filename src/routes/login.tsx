import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/common/Field";
import { authService } from "@/services/auth";
import { safeNextPath } from "@/services/auth-messages";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function readSearch(s: Record<string, unknown>): { redirect?: string; error?: string } {
  const redirect = typeof s.redirect === "string" ? s.redirect : undefined;
  const raw = s.error_description ?? s.error;
  const error = typeof raw === "string" && raw.trim() ? raw : undefined;
  return { ...(redirect ? { redirect } : {}), ...(error ? { error } : {}) };
}

export const Route = createFileRoute("/login")({
  validateSearch: readSearch,
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    const user = await authService.restore();
    if (user) throw redirect({ href: safeNextPath(search.redirect) });
  },
  head: () => ({
    meta: [
      { title: "Log in — SafeSend" },
      { name: "description", content: "Log in to SafeSend to verify recipients and protect your personal transfers." },
      { property: "og:title", content: "Log in — SafeSend" },
      { property: "og:description", content: "Access your SafeSend payment protection dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: next, error: callbackError } = Route.useSearch();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState(callbackError ?? "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const r = schema.safeParse(fd);
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    setErrors({});
    setFormError("");
    setLoading(true);
    try {
      await authService.signIn(r.data.email, r.data.password);
      const safe = safeNextPath(next);
      navigate({ to: safe });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not log in.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue protecting your transfers."
      footer={<>New to SafeSend? <Link to="/signup" className="font-medium text-brand hover:underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field id="email" label="Email" type="email" placeholder="you@example.com" error={errors.email} />
        <Field id="password" label="Password" type="password" placeholder="••••••••" error={errors.password} />
        {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
        <Button type="submit" variant="default" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
