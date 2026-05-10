"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckoutButton({ planId, planName, isPopular }: { planId: string; planName: string; isPopular: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    const res = await fetch("/api/pagamento/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    else setLoading(false);
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={cn(
        "w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60",
        isPopular
          ? "bg-orange-500 hover:bg-orange-400 text-white"
          : "bg-indigo-600 hover:bg-indigo-500 text-white"
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {loading ? "Redirecionando..." : "Começar agora"}
    </button>
  );
}
