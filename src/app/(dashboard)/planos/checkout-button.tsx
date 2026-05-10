"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <Button
      onClick={handleCheckout}
      disabled={loading}
      variant={isPopular ? "default" : "outline"}
      className="w-full"
    >
      {loading ? "Redirecionando..." : `Assinar ${planName}`}
    </Button>
  );
}
