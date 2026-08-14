"use client";

import { useState } from "react";
import { AuthLinks, AuthShell, fieldClass } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const data = (await res.json()) as { message?: string };
    setPending(false);
    setMessage(data.message || "If an account exists with this email, a password reset link has been sent.");
  }

  return (
    <AuthShell title="Forgot Password">
      {message ? (
        <p className="mt-8 text-sm text-ink-soft">{message}</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <label className="block text-sm">
            Email
            <input name="email" type="email" required className={fieldClass} />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full bg-camel text-[12px] tracking-[0.2em] text-ink uppercase disabled:opacity-60"
          >
            {pending ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>
      )}
      <AuthLinks />
    </AuthShell>
  );
}
