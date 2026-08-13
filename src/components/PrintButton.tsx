"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-ink px-5 py-3 text-[11px] tracking-[0.16em] text-paper uppercase print:hidden"
    >
      Print / save PDF
    </button>
  );
}
