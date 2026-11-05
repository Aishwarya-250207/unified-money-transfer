import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getState } from "@/lib/store";

// Signed-in app area. Client-only because prototype state lives in localStorage.
export const Route = createFileRoute("/_shell")({
  ssr: false,
  beforeLoad: ({ location }) => {
    if (!getState().user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
