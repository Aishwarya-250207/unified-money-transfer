CREATE TABLE public.recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);
CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid REFERENCES public.recipients(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('USD','EUR','GBP','INR')),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','completed','cancelled')),
  verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk jsonb,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  release_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);
CREATE TABLE public.transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('created','verified','risk_assessed','confirmed','hold_started','released','cancelled')),
  message text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.transfers (user_id, created_at DESC);
CREATE INDEX ON public.transfer_events (transfer_id, at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT SELECT, INSERT ON public.transfer_events TO authenticated;
GRANT ALL ON public.recipients, public.transfers, public.transfer_events TO service_role;

ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own recipients" ON public.recipients FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own transfers" ON public.transfers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read own events" ON public.transfer_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "add own events" ON public.transfer_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.transfers t WHERE t.id = transfer_id AND t.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_transfer_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN RAISE EXCEPTION 'owner cannot change'; END IF;
  IF NEW.status = OLD.status THEN
    IF OLD.status <> 'draft' AND (NEW.amount, NEW.currency, NEW.recipient_email) IS DISTINCT FROM (OLD.amount, OLD.currency, OLD.recipient_email) THEN
      RAISE EXCEPTION 'submitted transfers cannot be edited';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT ((OLD.status = 'draft' AND NEW.status IN ('pending','completed','cancelled'))
       OR (OLD.status = 'pending' AND NEW.status IN ('completed','cancelled'))) THEN
    RAISE EXCEPTION 'illegal transfer status change: % -> %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'pending' AND NEW.status = 'cancelled' AND OLD.release_at IS NOT NULL AND now() > OLD.release_at THEN
    RAISE EXCEPTION 'cancellation window has ended';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transfers_transition BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_transfer_transition();
