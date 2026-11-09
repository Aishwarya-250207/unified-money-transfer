-- SafeSend Database Schema & Row Level Security (RLS) Policies
-- Run this script in the Lovable Cloud / Supabase SQL Editor to set up persistent tables.

-- 1. RECIPIENTS TABLE
CREATE TABLE IF NOT EXISTS public.recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  confirmed_name TEXT,
  account_age_days INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'mismatch', 'not_found')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- 2. TRANSFERS TABLE
CREATE TABLE IF NOT EXISTS public.transfers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR')),
  note TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
  verification JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk JSONB,
  idempotency_key TEXT UNIQUE,
  payment_rail TEXT NOT NULL DEFAULT 'paypal_sandbox_simulated',
  confirmed_at TIMESTAMPTZ,
  release_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TRANSFER EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.transfer_events (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created', 'verified', 'risk_assessed', 'confirmed', 'hold_started', 'released', 'cancelled')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_transfers_user_created ON public.transfers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_idempotency ON public.transfers(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transfer_events_transfer ON public.transfer_events(transfer_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_transfer_events_user ON public.transfer_events(user_id);
CREATE INDEX IF NOT EXISTS idx_recipients_user ON public.recipients(user_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_events ENABLE ROW LEVEL SECURITY;

-- RECIPIENTS POLICIES
DROP POLICY IF EXISTS "Users can only view their own recipients" ON public.recipients;
CREATE POLICY "Users can only view their own recipients"
  ON public.recipients FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recipients" ON public.recipients;
CREATE POLICY "Users can insert their own recipients"
  ON public.recipients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recipients" ON public.recipients;
CREATE POLICY "Users can update their own recipients"
  ON public.recipients FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recipients" ON public.recipients;
CREATE POLICY "Users can delete their own recipients"
  ON public.recipients FOR DELETE
  USING (auth.uid() = user_id);

-- TRANSFERS POLICIES
DROP POLICY IF EXISTS "Users can only view their own transfers" ON public.transfers;
CREATE POLICY "Users can only view their own transfers"
  ON public.transfers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transfers" ON public.transfers;
CREATE POLICY "Users can insert their own transfers"
  ON public.transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transfers" ON public.transfers;
CREATE POLICY "Users can update their own transfers"
  ON public.transfers FOR UPDATE
  USING (auth.uid() = user_id);

-- TRANSFER EVENTS POLICIES
DROP POLICY IF EXISTS "Users can only view their own transfer events" ON public.transfer_events;
CREATE POLICY "Users can only view their own transfer events"
  ON public.transfer_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transfer events" ON public.transfer_events;
CREATE POLICY "Users can insert their own transfer events"
  ON public.transfer_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. SECURITY CONSTRAINTS & SERVER TRIGGER TO PREVENT ILLEGAL TRANSITIONS AT DB LEVEL
CREATE OR REPLACE FUNCTION public.check_transfer_transition_and_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent transitions from terminal states
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    RAISE EXCEPTION 'Transfer is completed and cannot be transitioned.';
  END IF;

  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Transfer is cancelled and cannot be transitioned.';
  END IF;

  -- Enforce cancellation deadline if cancelling a pending transfer
  IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
    IF OLD.release_at IS NOT NULL AND now() > OLD.release_at THEN
      RAISE EXCEPTION 'Cancellation deadline has passed. Transfer cannot be cancelled.';
    END IF;
  END IF;

  -- Enforce release deadline if completing a pending transfer
  IF OLD.status = 'pending' AND NEW.status = 'completed' THEN
    IF OLD.release_at IS NOT NULL AND now() < OLD.release_at THEN
      RAISE EXCEPTION 'Cancellation window is still active. Transfer cannot be prematurely released.';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_transfer_transition ON public.transfers;
CREATE TRIGGER trg_check_transfer_transition
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_transfer_transition_and_deadline();
