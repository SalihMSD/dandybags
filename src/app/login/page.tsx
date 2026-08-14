"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLinks, AuthShell, fieldClass } from "@/components/AuthShell";
import { PasswordField } from "@/components/PasswordField";
import { guestCartPayload, useAuth } from "@/components/AuthProvider";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setVerifyUrl("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("identifier") || "");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        password: form.get("password"),
        guestCart: guestCartPayload(),
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      if (data.error?.toLowerCase().includes("verify your email")) {
        const again = await fetch("/api/auth/resend-verification", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier }),
        });
        const extra = (await again.json()) as { verifyUrl?: string };
        if (extra.verifyUrl) setVerifyUrl(extra.verifyUrl);
      }
      setPending(false);
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setPending(false);
    await refresh();
    const next = params.get("next") || "/account";
    router.push(next.startsWith("/") ? next : "/account");
  }

  return (
    <AuthShell title="Welcome Back">
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block text-sm">
          Email or Mobile Number
          <input name="identifier" required className={fieldClass} autoComplete="username" />
        </label>
        <PasswordField name="password" label="Password" autoComplete="current-password" />
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        {verifyUrl ? (
          <p className="text-sm">
            Open this link to verify your account:{" "}
            <a href={verifyUrl} className="underline">
              Verify my account
            </a>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
        >
          {pending ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/forgot-password" className="underline underline-offset-4">
          Forgot Password?
        </Link>
        <Link href="/register" className="underline underline-offset-4">
          Create Account
        </Link>
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href="/admin/login" className="underline underline-offset-4">
          Admin login
        </Link>
      </p>
      <AuthLinks />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
