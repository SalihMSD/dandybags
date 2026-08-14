"use client";

import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const { logout } = useAuth();
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl">Account Settings</h1>
      <p className="mt-4 text-sm text-ink-soft">
        Password changes use the forgot-password flow. Optional business details such as GSTIN can be added to your
        profile later — they are not a separate account type.
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-8 h-12 bg-ink px-6 text-[12px] tracking-[0.18em] text-paper uppercase"
      >
        Logout
      </button>
    </div>
  );
}
