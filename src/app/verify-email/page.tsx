"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLinks, AuthShell } from "@/components/AuthShell";

function Verify() {
  const token = useSearchParams().get("token") || "";
  const [status, setStatus] = useState("Verifying account...");

  useEffect(() => {
    if (!token) {
      setStatus("This verification link is not valid.");
      return;
    }
    void fetch("/api/auth/verify-email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { error?: string };
        setStatus(res.ok ? "Your email is verified. You can log in." : data.error || "Something went wrong. Please try again.");
      })
      .catch(() => setStatus("Something went wrong. Please try again."));
  }, [token]);

  return (
    <AuthShell title="Verify Your DANDY Account">
      <p className="mt-8 text-sm text-ink-soft">{status}</p>
      <Link href="/login" className="mt-6 inline-block underline underline-offset-4">
        Login
      </Link>
      <AuthLinks />
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
