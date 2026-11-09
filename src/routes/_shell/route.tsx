import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { authService } from "@/services/auth";

// Signed-in app area. Client-only so the Cloud session can be read from the browser.
export const Route = createFileRoute("/_shell")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (!(await authService.restore())) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
