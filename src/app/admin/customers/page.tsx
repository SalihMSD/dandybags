"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AssetImage } from "@/components/AssetImage";
import { useDebounce } from "@/lib/useDebounce";

type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean;
};

type OrderRef = {
  id: string;
  orderStatus: string;
  paymentStatus: string;
  totalLabel: string;
  createdAt: string;
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    void fetch(`/api/admin/customers?search=${encodeURIComponent(debouncedSearch)}`, { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as { customers?: Customer[]; error?: string };
        if (!res.ok) setError(data.error || "Failed to load customers.");
        else setCustomers(data.customers || []);
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const filtered = customers;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded border border-ink/10 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2">Customer</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th className="text-center">Verified</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-ink-soft">Loading customers…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-ink-soft">No customers found.</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-ink/5">
                  <td className="py-3">
                    <p className="font-medium">{c.fullName}</p>
                    <p className="text-xs text-ink-soft">{c.id}</p>
                  </td>
                  <td className="text-ink-soft">{c.email || "—"}</td>
                  <td className="text-ink-soft">{c.phone || "—"}</td>
                  <td className="text-ink-soft">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="text-ink-soft">
                    {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="text-center">
                    {c.emailVerified ? (
                      <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-800">Yes</span>
                    ) : (
                      <span className="rounded bg-camel/20 px-2 py-0.5 text-xs">No</span>
                    )}
                  </td>
                   <td className="text-center">
                     <Link
                       href={`/admin/orders?search=${encodeURIComponent(c.email || c.phone || c.id)}`}
                       className="text-xs underline"
                     >
                       View Orders
                     </Link>
                   </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
