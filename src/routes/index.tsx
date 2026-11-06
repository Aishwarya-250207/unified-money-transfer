import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, BadgeCheck, Clock, Gauge, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/layout/PublicLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeSend — Verify. Pause. Protect." },
      { name: "description", content: "SafeSend adds recipient verification, explainable risk scoring and a cancellation window to personal transfers." },
      { property: "og:title", content: "SafeSend — Your money. Your control." },
      { property: "og:description", content: "Safer personal transfers with verification, risk detection and cancel-before-release." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: UserCheck, title: "Verify Recipient", body: "Confirm the real account holder's name before you pay. Look-alike emails and name mismatches are flagged instantly." },
  { icon: Gauge, title: "Smart Risk Detection", body: "A transparent 0–100 score built from clear signals: new recipients, unusual amounts, scam-pattern language." },
  { icon: Clock, title: "Cancel Before Release", body: "Higher-risk transfers wait in a short cancellation window, so you can stop a mistake before it lands." },
];

const STEPS = [
  ["Enter details", "Recipient email, amount and a note."],
  ["We verify", "Account ownership is checked against the name you expect."],
  ["We score risk", "Every factor is explained in plain language."],
  ["You decide", "Confirm, cancel, or pause and double-check."],
];

function Landing() {
  return (
    <div>
      <PublicHeader />
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <div className="fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-brand" /> Verify · Pause · Protect
          </span>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Your money.<br />Your control.</h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Personal transfers are fast and final, and that's exactly what scammers count on. SafeSend checks who you're paying, explains the risk, and gives you a window to cancel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="xl"><Link to="/signup">Get Started <ArrowRight /></Link></Button>
            <Button asChild size="xl" variant="outline"><Link to="/" hash="protection">Explore Protection</Link></Button>
          </div>
        </div>

        <div className="surface fade-up mx-auto w-full max-w-md p-6 shadow-elevated">
          <div className="flex items-center justify-between text-sm"><span className="font-semibold">Review payment</span><span className="text-xs text-muted-foreground">Preview</span></div>
          <div className="mt-5 tabular text-4xl font-semibold">$1,200.00</div>
          <div className="mt-5 flex items-center gap-3 rounded-lg border p-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">N</span>
            <div className="flex-1 text-sm"><p className="font-medium">Northside Rentals LLC</p><p className="text-xs text-muted-foreground">northside.rentals@mail.com</p></div>
            <AlertTriangle className="size-4 text-warning" />
          </div>
          <div className="mt-3 rounded-lg bg-warning-soft p-3 text-xs text-warning">You expected “Northside Property”. Account is 14 days old.</div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-danger-soft p-3 text-sm">
            <span className="font-medium text-danger">HIGH risk · 85/100</span>
            <span className="text-xs text-danger">3-min cancel window</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-brand py-2.5 text-center text-sm font-medium text-brand-foreground">Confirm</div>
            <div className="rounded-md border border-danger/40 py-2.5 text-center text-sm font-medium text-danger">Cancel</div>
          </div>
        </div>
      </section>

      <section id="protection" className="border-y bg-card py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight">Three layers between you and a costly mistake.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-background p-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><f.icon className="size-5" /></span>
                <h3 className="mt-5 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <span className="tabular text-sm font-semibold text-brand">0{i + 1}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary p-10 text-primary-foreground md:flex-row md:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm text-primary-foreground/70"><BadgeCheck className="size-4" /> Hackathon prototype</p>
            <p className="mt-2 text-2xl font-semibold">Try a protected transfer in under a minute.</p>
          </div>
          <Button asChild variant="inverse" size="xl"><Link to="/signup">Get Started</Link></Button>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
