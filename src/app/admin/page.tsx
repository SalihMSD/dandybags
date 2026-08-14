"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { products } from "@/lib/products";
import { useAuth } from "@/components/AuthProvider";

export default function AdminHome() {
  const { logout } = useAuth();
  const [data, setData] = useState<{
    counts: { customers: number; orders: number };
    customers: { fullName: string; email: string; phone: string }[];
    orders: { id: string; orderStatus: string; createdAt: string }[];
  } | null>(null);

  useEffect(() => {
    void fetch("/api/admin/overview", { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase">DANDY</p>
          <h1 className="mt-2 font-serif text-4xl">Admin</h1>
        </div>
        <button type="button" onClick={() => void logout()} className="text-sm underline">
          Logout
        </button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border border-ink/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em]">Customers</p>
          <p className="mt-2 font-serif text-3xl">{data?.counts.customers ?? "—"}</p>
        </div>
        <div className="border border-ink/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em]">Orders</p>
          <p className="mt-2 font-serif text-3xl">{data?.counts.orders ?? "—"}</p>
        </div>
        <div className="border border-ink/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em]">Catalogue styles</p>
          <p className="mt-2 font-serif text-3xl">{products.length}</p>
        </div>
      </div>
      <nav className="mt-10 flex flex-wrap gap-4 text-[11px] tracking-[0.16em] uppercase">
        <Link href="/admin/customers" className="underline">
          Customers
        </Link>
        <Link href="/admin/orders" className="underline">
          Orders
        </Link>
        <Link href="/admin/products" className="underline">
          Products
        </Link>
      </nav>
    </div>
  );
}
