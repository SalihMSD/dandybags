"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLinks, AuthShell, fieldClass } from "@/components/AuthShell";
import { PasswordField } from "@/components/PasswordField";
import { useAuth } from "@/components/AuthProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    await refresh();
    router.push("/admin");
  }

  return (
    <AuthShell title="Admin login">
      <p className="mt-3 text-sm text-ink-soft">Staff only. There is no admin registration.</p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block text-sm">
          Email
          <input name="email" type="email" required className={fieldClass} />
        </label>
        <PasswordField name="password" label="Password" autoComplete="current-password" />
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full bg-ink text-[12px] tracking-[0.2em] text-paper uppercase disabled:opacity-60"
        >
          {pending ? "Logging in..." : "Login"}
        </button>
      </form>
      <AuthLinks />
    </AuthShell>
  );
}
