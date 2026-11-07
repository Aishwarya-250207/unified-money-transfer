# SafeSend

A scam-aware money transfer prototype. Senders verify the recipient, see an explainable risk score, and get a cancellation window before money moves — so funds reach the person they actually meant to pay.

## Architecture

One cohesive React + TypeScript app (TanStack Start). All pages share a single client-side state store; only `src/services/*` write to it, and pages read via hooks. Swapping in a real backend (Supabase, PayPal) later means re-implementing the services, not the pages.

```text
Pages (routes)  -->  services/* (all writes, pure rules)  -->  lib/store.ts (one state, localStorage)
```

## Folder structure

```text
src/
  routes/            TanStack Router pages
    index.tsx        Landing page
    login.tsx, signup.tsx
    _shell/          Authenticated layout + pages
      dashboard.tsx, send.tsx, history.tsx, security.tsx
      transfers.$id.verify.tsx   Recipient verification
      transfers.$id.risk.tsx     Risk assessment
      transfers.$id.review.tsx   Payment review
      transfers.$id.pending.tsx  Pending transfer (countdown + cancel)
  services/          Business logic (the only writers to state)
    transfer-machine.ts  Status lifecycle + cancellation windows
    risk.ts              Rule-based, explainable risk scoring (0-100)
    transfers.ts, verification.ts, auth.ts, stats.ts
  lib/store.ts       Single app state, persisted to localStorage
  data/demo.ts       Demo recipients and seed transfers
  types/index.ts     Centralized TypeScript types
  components/        Shared UI (shadcn-based design system)
```

## Technologies

- TanStack Start (React 19, Vite) + TanStack Router
- TypeScript, Tailwind CSS v4, shadcn/ui
- Vitest for rule tests

## Features

**Existing**
- Landing, login, signup (mock auth: any email + 8+ char password)
- Dashboard with transfer stats
- Send Money flow: recipient verification (demo directory of 6 people; unknown emails show "Not registered"), risk assessment with explainable factors, payment review, pending transfer with countdown and cancel
- Transaction history with search, filters, and detail view
- Security settings page
- Shared transfer lifecycle: `draft -> pending/completed/cancelled`; completed and cancelled are terminal
- Cancellation windows by risk level: LOW 0s, MEDIUM 60s, HIGH 180s
- Tests for the status rules and risk scoring (`npm test`)

**Pending (planned for Cursor, to conserve Lovable credits)**
- Real backend: Supabase (auth, transfers table, RLS)
- PayPal Sandbox payout integration
- Only `src/services/*` should need changes; pages stay as-is

## Environment variables

None required for the frontend prototype. Backend integration will add Supabase and PayPal keys.

## Run it

```sh
npm i
npm run dev    # start the dev server
npm test       # run the rule tests
```
