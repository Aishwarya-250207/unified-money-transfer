import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" hash="protection" className="hover:text-foreground">Protection</Link>
          <Link to="/" hash="how" className="hover:text-foreground">How it works</Link>
          <Link to="/security" className="hover:text-foreground">Security</Link>
        </nav>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Log in</Link></Button>
          <Button asChild variant="default" size="sm"><Link to="/signup">Get started</Link></Button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:px-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-muted-foreground">
            Verify. Pause. Protect. A payment-safety layer for personal transfers.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Hackathon prototype. SafeSend does not process, hold or reverse real payments and is not affiliated with PayPal.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Product</p>
          <Link to="/send" className="block text-muted-foreground hover:text-foreground">Send money</Link>
          <Link to="/security" className="block text-muted-foreground hover:text-foreground">Security center</Link>
          <Link to="/history" className="block text-muted-foreground hover:text-foreground">Transactions</Link>
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Account</p>
          <Link to="/login" className="block text-muted-foreground hover:text-foreground">Log in</Link>
          <Link to="/signup" className="block text-muted-foreground hover:text-foreground">Create account</Link>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">© 2026 SafeSend</div>
    </footer>
  );
}

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="fade-up mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
        </div>
      </div>
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">Verify · Pause · Protect</span>
        <div>
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            “I almost sent a $2,500 deposit to a fake landlord. SafeSend flagged the name mismatch before I hit confirm.”
          </p>
          <p className="mt-4 text-sm text-primary-foreground/60">Sample testimonial · Demo</p>
        </div>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div><p className="text-2xl font-semibold">3</p><p className="text-primary-foreground/60">layers of protection</p></div>
          <div><p className="text-2xl font-semibold">&lt;2s</p><p className="text-primary-foreground/60">recipient check</p></div>
          <div><p className="text-2xl font-semibold">0–100</p><p className="text-primary-foreground/60">explainable risk score</p></div>
        </div>
      </div>
    </div>
  );
}
