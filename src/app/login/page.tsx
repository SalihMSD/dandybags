"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/Logo";
import { AssetImage } from "@/components/AssetImage";
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
    const next = params.get("next") || "/";
    const target = next.startsWith("/") ? next : "/";
    if (target === "/") {
      window.location.href = "/";
    } else {
      router.push(target);
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-8rem)]">
      {/* LEFT — Brand panel (desktop only) */}
      <div className="relative hidden lg:flex lg:flex-col bg-cream">
        <div className="p-8">
          <Logo variant="wordmark" />
        </div>
        <div className="flex-1 relative px-8 pb-6">
          <div className="relative h-full min-h-[360px] rounded-2xl overflow-hidden">
            <AssetImage
              src="/products/dummy/hero-collection.png"
              alt="DANDY bags collection"
              fill
              className="object-cover object-center"
              sizes="50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <p className="font-serif text-3xl text-white italic">More Than Bags</p>
              <p className="mt-2 text-[11px] tracking-[0.28em] text-white/80 uppercase">
                Bags for every journey
              </p>
            </div>
          </div>
        </div>
        <div className="p-8 pt-2">
          <div className="flex flex-wrap gap-6">
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Premium Quality</p>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Designed for Every Journey</p>
            <p className="text-[11px] tracking-[0.18em] uppercase text-ink-soft">Stylish & Practical</p>
          </div>
        </div>
      </div>

      {/* RIGHT — Login panel */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12 bg-paper">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-ink/5">
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-[11px] tracking-[0.28em] text-camel uppercase font-medium">
                DANDY
              </p>
              <h1 className="mt-3 font-serif text-3xl text-ink">Welcome Back</h1>
              <p className="mt-1.5 text-sm text-ink-soft">Glad to see you again.</p>
            </div>

            {/* Form */}
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              <label className="block text-sm">
                <span className="text-ink">Email or Mobile Number</span>
                <input
                  name="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-paper px-4 text-base outline-none transition focus:border-camel focus:ring-1 focus:ring-camel/30"
                />
              </label>

              <PasswordField
                name="password"
                label="Password"
                autoComplete="current-password"
                className="rounded-xl"
              />

              <div className="flex items-center justify-between text-sm pt-1">
                <Link
                  href="/forgot-password"
                  className="text-camel hover:text-camel-dark underline underline-offset-4 transition"
                >
                  Forgot Password?
                </Link>
              </div>

              {error ? (
                <p className="text-sm text-red-800 bg-red-50 rounded-lg px-4 py-2.5" role="alert">
                  {error}
                </p>
              ) : null}

              {verifyUrl ? (
                <p className="text-sm text-ink-soft bg-paper rounded-lg px-4 py-3">
                  Open this link to verify your account:{" "}
                  <a href={verifyUrl} className="text-camel underline">
                    Verify my account
                  </a>
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="h-12 w-full rounded-xl bg-camel text-[12px] tracking-[0.2em] text-ink uppercase font-medium transition hover:bg-camel-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? "Logging in..." : "Login"}
              </button>
            </form>

            {/* Create Account CTA */}
            <div className="mt-6 rounded-xl border border-camel/20 bg-camel/5 p-4 text-center">
              <p className="text-sm text-ink">New to DANDY?</p>
              <p className="mt-1 text-xs text-ink-soft">
                Create your account and start your journey.
              </p>
              <Link
                href="/register"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg bg-camel text-[12px] tracking-[0.2em] text-ink uppercase font-medium transition hover:bg-camel-dark"
              >
                Create Account
              </Link>
            </div>

            {/* Security & navigation */}
            <p className="mt-5 text-center text-[11px] text-ink-soft/70">
              Secure login • Your information is protected
            </p>
            <p className="mt-3 text-center text-sm">
              <Link href="/" className="text-ink-soft hover:text-ink underline underline-offset-4 transition">
                Back to Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
