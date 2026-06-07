"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckoutButton({ planId, planName, isPopular, isFree }: {
  planId: string; planName: string; isPopular: boolean; isFree?: boolean;
}) {
  void planName;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/pagamento/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json() as { checkoutUrl?: string; preferenceId?: string; planSlug?: string; activated?: boolean; error?: string };

      if (data.error) {
        setCheckoutError(data.error);
        setLoading(false);
        return;
      }

      if (data.activated) {
        setDone(true);
        setTimeout(() => window.location.replace("/workspace"), 1500);
        return;
      }

      if (data.preferenceId) {
        const params = new URLSearchParams({ preferenceId: data.preferenceId });
        if (data.planSlug) params.set("plan", data.planSlug);
        window.location.href = `/planos/checkout?${params.toString()}`;
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setLoading(false);
      }
    } catch {
      setCheckoutError("Erro inesperado ao iniciar o checkout. Tente novamente.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full py-2.5 rounded-xl text-sm font-medium text-center bg-green-500/15 border border-green-500/30 text-green-400">
        ✓ Ativado! Redirecionando…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={cn(
          "w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60",
          isFree
            ? "bg-green-600 hover:bg-green-500 text-white"
            : isPopular
              ? "bg-orange-500 hover:bg-orange-400 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
        )}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading
          ? (isFree ? "Ativando..." : "Redirecionando...")
          : isFree
            ? "Começar grátis — 7 dias"
            : "Começar agora"}
      </button>
      {checkoutError && (
        <p className="text-xs text-red-400 text-center px-1">{checkoutError}</p>
      )}
    </div>
  );
}
