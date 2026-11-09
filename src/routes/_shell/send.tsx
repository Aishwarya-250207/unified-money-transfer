import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { PageHeader, Panel } from "@/components/common/ui-blocks";
import { FlowSteps } from "@/components/transfer/FlowSteps";
import { CURRENCIES, type Currency } from "@/types";
import { DEMO_DIRECTORY } from "@/services/verification";
import { transferService } from "@/services/transfers";

const schema = z.object({
  recipientEmail: z.string().trim().email("Enter a valid recipient email"),
  recipientName: z.string().trim().max(80).default(""),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Amount must be greater than 0").max(10000, "Prototype limit is 10,000"),
  note: z.string().trim().max(140, "Keep notes under 140 characters"),
});

export const Route = createFileRoute("/_shell/send")({
  head: () => ({
    meta: [
      { title: "Send money — SafeSend" },
      { name: "description", content: "Start a protected transfer with recipient verification and risk scoring." },
      { property: "og:title", content: "Send money — SafeSend" },
      { property: "og:description", content: "Start a protected personal transfer." },
    ],
  }),
  component: SendPage,
});

function SendPage() {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    try {
      const t = await transferService.createDraft({ ...r.data, currency });
      navigate({ to: "/transfers/$id/verify", params: { id: t.id } });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <FlowSteps current={0} />
      <PageHeader title="Send money" description="We'll verify the recipient and assess risk before anything is sent." />
      <Panel>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <Field id="recipientEmail" label="Recipient email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.recipientEmail} />
          <Field id="recipientName" label="Recipient name (as you know them)" placeholder="e.g. Priya Sharma" value={name} onChange={(e) => setName(e.target.value)} hint="Used to detect name mismatches. Optional but recommended." />
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field id="amount" label="Amount" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" error={errors.amount} />
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="!h-11 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Payment note</Label>
            <Textarea id="note" name="note" rows={3} placeholder="What's this for?" className="bg-card" />
            {errors.note && <p className="text-xs text-danger">{errors.note}</p>}
          </div>
          <Button type="submit" variant="brand" size="xl" className="w-full">Continue <ArrowRight /></Button>
        </form>
      </Panel>

      <div className="mt-6 rounded-xl border border-dashed p-4 text-sm">
        <p className="flex items-center gap-2 font-medium"><Info className="size-4 text-brand" /> Demo recipient directory</p>
        <p className="mt-1 text-muted-foreground">Pick one to prefill. Any other email will show as “not registered”.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(DEMO_DIRECTORY).map(([e, d]) => (
            <button key={e} type="button" onClick={() => { setEmail(e); setName(d.name); }} className="rounded-full border bg-card px-3 py-1 text-xs hover:border-brand hover:text-brand">
              {d.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
