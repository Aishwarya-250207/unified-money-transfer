import { useSyncExternalStore } from "react";
import type { Transfer, User } from "@/types";
import { seedDemoTransfers } from "@/data/demo";

/**
 * Single client-side app state (prototype persistence in localStorage).
 * Only services/* write to it; UI reads via hooks. Swap for Supabase later
 * by re-implementing the services, not the pages.
 */
export interface AppState {
  user: User | null;
  transfers: Transfer[];
}

const KEY = "safesend:v1";
const EMPTY: AppState = { user: null, transfers: [] };
let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // The signed-in user comes from the Cloud session, not this blob.
      return { user: null, transfers: Array.isArray(parsed.transfers) ? parsed.transfers : seedDemoTransfers() };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return EMPTY;
}

export function getState(): AppState {
  if (!state) state = load();
  return state;
}

export function setState(updater: (s: AppState) => AppState) {
  state = updater(getState());
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify({ user: state.user, transfers: [] }));
  listeners.forEach((l) => l());
}

export function resetState() {
  state = { user: getState().user, transfers: seedDemoTransfers() };
  setState((s) => s);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Selector must return a stable reference (a slice of state), not a new object. */
export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(EMPTY),
  );
}

export const useUser = () => useAppState((s) => s.user);
export const useTransfers = () => useAppState((s) => s.transfers);
export const useTransfer = (id: string) =>
  useAppState((s) => s.transfers.find((t) => t.id === id));
