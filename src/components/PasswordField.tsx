"use client";

import { useState } from "react";
import { fieldClass } from "./AuthShell";

export function PasswordField({
  name,
  label,
  autoComplete,
}: {
  name: string;
  label: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-sm">
      {label}
      <span className="relative mt-1 block">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          className={`${fieldClass} pr-16`}
        />
        <button
          type="button"
          className="absolute top-0 right-0 h-12 px-3 text-[10px] tracking-[0.14em] uppercase"
          onClick={() => setShow((v) => !v)}
        >
          {show ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}
