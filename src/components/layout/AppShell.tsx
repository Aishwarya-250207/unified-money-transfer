import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { History, LayoutDashboard, LogOut, Menu, RotateCcw, Send, Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useUser } from "@/lib/store";
import { authService } from "@/services/auth";
import { transferService } from "@/services/transfers";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/send", label: "Send money", icon: Send },
  { to: "/history", label: "Transactions", icon: History },
  { to: "/security", label: "Security", icon: Shield },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <n.icon className="size-4" />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const user = useUser();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col gap-8 bg-sidebar p-5">
      <Logo inverse />
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto space-y-3">
        <div className="rounded-lg border border-sidebar-border p-3 text-xs text-sidebar-foreground">
          <p className="font-semibold text-sidebar-accent-foreground">Prototype mode</p>
          <p className="mt-1 leading-relaxed">No real money moves. Transfers and holds are simulated.</p>
          <button onClick={() => { transferService.loadAll().catch(() => {}); }} className="mt-2 inline-flex items-center gap-1 font-medium text-sidebar-primary hover:underline">
            <RotateCcw className="size-3" /> Reload from cloud
          </button>
        </div>
        {user && (
          <div className="flex items-center gap-3 px-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {user.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1 text-xs">
              <p className="truncate font-medium text-sidebar-accent-foreground">{user.name}</p>
              <p className="truncate text-sidebar-foreground">{user.email}</p>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => { await authService.signOut(); navigate({ to: "/login", replace: true }); }}
              className="text-sidebar-foreground hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block"><SidebarBody /></aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="fade-up mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
