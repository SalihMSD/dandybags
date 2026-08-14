"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; email: string; phone: string }[]>([]);
  useEffect(() => {
    void fetch("/api/admin/overview", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []));
  }, []);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link href="/admin" className="text-xs uppercase tracking-[0.16em] underline">
        Admin
      </Link>
      <h1 className="mt-4 font-serif text-4xl">Customers</h1>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Mobile</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-ink/5">
              <td className="py-3">{c.fullName}</td>
              <td>{c.email}</td>
              <td>{c.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
