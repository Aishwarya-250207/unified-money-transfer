import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
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
  const { redirect } = Route.useSearch();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const r = schema.safeParse(fd);
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    setErrors({});
    setLoading(true);
    await authService.signIn(r.data.email, r.data.password);
    const safe = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";
    navigate({ to: safe });
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
        <Button type="submit" variant="default" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Log in
        </Button>
        <p className="text-center text-xs text-muted-foreground">Prototype: any email and 8+ character password works.</p>
      </form>
    </AuthLayout>
  );
}

export function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} aria-invalid={!!error} className="h-11 bg-card aria-invalid:border-danger" {...props} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
