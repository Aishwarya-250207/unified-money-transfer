import type { User } from "@/types";
import { getState, setState } from "@/lib/store";

/** Frontend-only prototype auth. Replace with Lovable Cloud auth later. */
export const authService = {
  current: () => getState().user,

  async signUp(name: string, email: string, _password: string): Promise<User> {
    await new Promise((r) => setTimeout(r, 600));
    const user: User = { id: `usr_${Date.now()}`, name: name.trim(), email: email.trim().toLowerCase(), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, user }));
    return user;
  },

  async signIn(email: string, _password: string): Promise<User> {
    await new Promise((r) => setTimeout(r, 600));
    const local = email.split("@")[0].replace(/[._-]+/g, " ");
    const name = local.replace(/\b\w/g, (c) => c.toUpperCase());
    const user: User = { id: `usr_${email}`, name, email: email.trim().toLowerCase(), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, user }));
    return user;
  },

  signOut() {
    setState((s) => ({ ...s, user: null }));
  },
};
