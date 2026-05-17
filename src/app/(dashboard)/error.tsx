"use client";
import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error("Dashboard error:", error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080c18] text-white gap-4">
      <p className="text-red-400 text-sm">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm hover:bg-indigo-700">
        Tentar novamente
      </button>
    </div>
  );
}
