"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Orders", href: "/admin/orders", icon: "📦" },
  { label: "Products", href: "/admin/products", icon: "👕" },
  { label: "Inventory", href: "/admin/inventory", icon: "📦" },
  { label: "Customers", href: "/admin/customers", icon: "👥" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { label: "Coupling", href: "/admin/coupons", icon: "🎟️" },
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

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/admin/login");
    }
  }, [loading, user, router]);

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
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 flex-col border-r border-ink/10 bg-ink p-4 text-paper transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex lg:flex`}
      >
        <div className="mb-8">
          <Logo variant="wordmark" className="h-10 w-auto invert" />
          <p className="mt-2 text-xs tracking-[0.3em] uppercase text-ink/30">Admin Panel</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors hover:bg-ink/10 ${
                isActive(pathname, item.href) ? "bg-ink/10 font-medium" : ""
              }`}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink/10 pt-4">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm text-red-200 transition-colors hover:bg-ink/10"
          >
            <span className="w-5 text-center text-base">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-ink/10 bg-paper px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-ink hover:text-camel-dark lg:hidden"
              aria-label="Open menu"
            >
              <span className="text-xl">☰</span>
            </button>
            <h1 className="font-serif text-2xl">{currentLabel}</h1>
          </div>
          <div className="text-sm text-ink-soft">
            Logged in as {user.fullName}
          </div>
        </header>
        <main className="p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
