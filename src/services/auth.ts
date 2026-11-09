import type { User as SbUser } from "@supabase/supabase-js";
import type { User } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { getState, setState } from "@/lib/store";
import { transferService } from "./transfers";

function toUser(u: SbUser): User {
  const meta = (u.user_metadata ?? {}) as { name?: string; full_name?: string };
  return {
    id: u.id,
    name: meta.full_name || meta.name || (u.email ?? "").split("@")[0] || "Account",
    email: (u.email ?? "").toLowerCase(),
    createdAt: u.created_at,
  };
}

function setUser(user: User | null) {
  setState((s) => ({
    ...s,
    user,
    transfers: user ? s.transfers : [],
  }));
}

/** Real Lovable Cloud auth. Mirrors the signed-in user into the shared store. */
export const authService = {
  isConfigured: () => Boolean(import.meta.env["VITE_SUPABASE_URL"] && (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_ANON_KEY"])),
  current: () => getState().user,

  /** Re-validates the session with the auth server and syncs the app user. */
  async restore(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setUser(null);
        return null;
      }
      const user = toUser(data.user);
      setUser(user);
      await transferService.loadAll();
      return user;
    } catch {
      setUser(null);
      return null;
    }
  },

  /** Start is an alias to restore for component initialization compatibility. */
  async start(): Promise<User | null> {
    return this.restore();
  },

  async signUp(name: string, email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim(), full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error("Check your email to confirm your account, then log in.");
    }
    const user = toUser(data.user);
    setUser(user);
    await transferService.loadAll();
    return user;
  },

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    const user = toUser(data.user);
    setUser(user);
    await transferService.loadAll();
    return user;
  },

  async signOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setState((s) => ({ ...s, transfers: [] }));
    }
  },
};
