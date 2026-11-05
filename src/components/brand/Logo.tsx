import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
        <ShieldCheck className="size-4.5" />
      </span>
      <span className={cn("text-lg", inverse ? "text-primary-foreground" : "text-foreground")}>SafeSend</span>
    </Link>
  );
}
