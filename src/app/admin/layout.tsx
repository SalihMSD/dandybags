"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Orders", href: "/admin/orders", icon: "📦" },
  { label: "Products", href: "/admin/products", icon: "👕" },
  { label: "Inventory", href: "/admin/inventory", icon: "📦" },
  { label: "Customers", href: "/admin/customers", icon: "👥" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { label: "Coupons", href: "/admin/coupons", icon: "🎟️" },
  { label: "Share & Earn", href: "/admin/share-rewards", icon: "📲" },
  { label: "Analytics", href: "/admin/analytics", icon: "📈" },
  { label: "Settings", href: "/admin/settings", icon: "⚙" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/admin/login");
    }
  }, [loading, user, router, isLoginPage]);

  useEffect(() => {
    const saved = sessionStorage.getItem("adminSidebarCollapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("adminSidebarCollapsed", String(collapsed));
  }, [collapsed]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <p className="text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  const currentItem = navItems.find((n) => isActive(pathname, n.href));
  const currentLabel = currentItem?.label || "Admin";

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: overlay drawer on mobile/tablet, fixed on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-y-auto border-r border-ink/10 bg-ink p-4 text-paper
          w-60 shrink-0
          -translate-x-full
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : ""}
          xl:translate-x-0 xl:transition-none
          ${collapsed ? "xl:w-20" : "xl:w-60"}
        `}
      >
        <div className={`flex w-full items-center justify-${collapsed ? "center" : "end"}`}>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 rounded p-1.5 text-paper/50 hover:bg-ink/10 hover:text-paper"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden>{collapsed ? "→" : "←"}</span>
          </button>
        </div>
        <p className="mt-3 text-center text-xs tracking-[0.3em] uppercase text-ink/30">Admin Panel</p>

        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors hover:bg-ink/10 ${
                  active ? "bg-ink/10 font-medium" : ""
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="w-5 text-center text-base" aria-hidden="true">
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-ink/10 pt-4">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm text-red-200 transition-colors hover:bg-ink/10"
            title={collapsed ? "Logout" : undefined}
          >
            <span className="w-5 text-center text-base">🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content: takes remaining width on desktop, full width on mobile */}
      <div className={`flex-1 overflow-x-hidden ${collapsed ? "xl:ml-[80px]" : "xl:ml-[240px]"}`}>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-ink/10 bg-paper px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-ink hover:text-camel-dark xl:hidden"
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <span className="text-xl">☰</span>
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden text-ink hover:text-camel-dark xl:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              <span className="text-xl">{collapsed ? "→" : "←"}</span>
            </button>
            <h1 className="font-serif text-2xl">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <span>Logged in as {user.fullName}</span>
          </div>
        </header>
        <main className="p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
