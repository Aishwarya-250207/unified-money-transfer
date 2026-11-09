import type { User } from "@/types";
import { getState, setState } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import type { User as SbUser } from "@supabase/supabase-js";

function toUser(u: SbUser): User {
  const meta = (u.user_metadata ?? {}) as { name?: string };
  return { id: u.id, name: meta.name || (u.email ?? "").split("@")[0], email: u.email ?? "", createdAt: u.created_at };
}

function setUser(user: User | null) {
  setState((s) => ({ ...s, user }));
}

/** Real Lovable Cloud auth. Mirrors the signed-in user into the shared store. */
export const authService = {
  current: () => getState().user,

  /** Re-validates the session with the auth server. */
  async restore(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    const user = data.user ? toUser(data.user) : null;
    setUser(user);
    return user;
  },

  async signUp(name: string, email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
    if (!data.session || !data.user) throw new Error("Check your email to confirm your account, then log in.");
    const user = toUser(data.user);
    setUser(user);
    return user;
  },

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    const user = toUser(data.user);
    setUser(user);
    return user;
  },

  async signOut() {
    await supabase.auth.signOut();
    setUser(null);
  },
};
