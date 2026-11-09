import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth";
import { safeNextPath } from "@/services/auth-messages";
import { Field } from "@/components/common/Field";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await authService.restore();
    if (user) throw redirect({ href: safeNextPath(undefined) });
  },
  head: () => ({
    meta: [
      { title: "Create account — SafeSend" },
      { name: "description", content: "Create a SafeSend account to add verification, risk scoring and a cancellation window to personal transfers." },
      { property: "og:title", content: "Create account — SafeSend" },
      { property: "og:description", content: "Start sending money with protection built in." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    setErrors({});
    setFormError("");
    setNotice("");
    setLoading(true);
    try {
      await authService.signUp(r.data.name, r.data.email, r.data.password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create the account.";
      if (msg.toLowerCase().includes("confirm")) {
        setNotice(msg);
      } else {
        setFormError(msg);
      }
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Add a safety layer to every personal transfer."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-brand hover:underline">Log in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field id="name" label="Full name" placeholder="Aishwarya Rao" error={errors.name} />
        <Field id="email" label="Email" type="email" placeholder="you@example.com" error={errors.email} />
        <Field id="password" label="Password" type="password" error={errors.password} />
        <Field id="confirm" label="Confirm password" type="password" error={errors.confirm} />
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
        <Button type="submit" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
