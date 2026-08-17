"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readCart, writeCart, type CartLine } from "@/lib/cart";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "CUSTOMER" | "ADMIN";
  emailVerified: boolean;
  status: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  loading: true,
  refresh: async () => undefined,
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user ?? null);
      if (data.user?.role === "CUSTOMER") {
        const cartRes = await fetch("/api/customer/cart", { credentials: "include" });
        if (cartRes.ok) {
          const cart = (await cartRes.json()) as { items: CartLine[] };
          if (Array.isArray(cart.items)) writeCart(cart.items);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || user.role !== "CUSTOMER") return;
    const sync = () => {
      void fetch("/api/customer/cart", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: readCart() }),
      });
    };
    window.addEventListener("dandy-cart", sync);
    return () => window.removeEventListener("dandy-cart", sync);
  }, [user]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    writeCart([], true);
    window.location.href = "/";
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: Boolean(user), user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function guestCartPayload(): CartLine[] {
  return readCart();
}
