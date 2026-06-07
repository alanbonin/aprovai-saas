"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MercadoPago: any;
  }
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preferenceId = searchParams.get("preferenceId");
  const plan = searchParams.get("plan");

  const brickRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!preferenceId) {
      router.replace("/planos");
      return;
    }
    if (mountedRef.current) return;
    mountedRef.current = true;

    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (!publicKey) {
      setError("Chave pública do Mercado Pago não configurada.");
      setLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();

      const successUrl = plan
        ? `/planos/sucesso?plan=${plan}`
        : "/planos/sucesso";

      bricks.create("payment", "mp-payment-brick", {
        initialization: {
          amount: 0,
          preferenceId,
        },
        customization: {
          paymentMethods: {
            creditCard: "all",
            debitCard: "none",
            ticket: "none",
            bankTransfer: "all",
            atm: "none",
            onlineBanking: "none",
            wallet_purchase: "none",
          },
          visual: {
            style: {
              theme: "dark",
            },
          },
        },
        callbacks: {
          onReady: () => setLoading(false),
          onError: (err: unknown) => {
            console.error("MP Brick error:", err);
            setError("Erro ao carregar o checkout. Tente novamente.");
            setLoading(false);
          },
          onSubmit: async ({ selectedPaymentMethod, formData }: { selectedPaymentMethod: string; formData: unknown }) => {
            void selectedPaymentMethod;
            const res = await fetch("/api/pagamento/processar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formData),
            });
            const data = await res.json() as { status?: string; error?: string };
            if (data.status === "approved") {
              router.replace(successUrl);
            } else if (data.status === "pending") {
              router.replace(plan ? `/planos/pendente?plan=${plan}` : "/planos/pendente");
            } else {
              throw new Error(data.error ?? "Pagamento não aprovado");
            }
          },
        },
      }).catch((err: unknown) => {
        console.error("MP Brick create error:", err);
        setError("Erro ao carregar o checkout. Tente novamente.");
        setLoading(false);
      });
    };
    script.onerror = () => {
      setError("Não foi possível carregar o Mercado Pago. Verifique sua conexão.");
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [preferenceId, plan, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4"
      style={{ background: "var(--bg-base, #080c18)" }}>
      <div className="w-full max-w-lg">
        <Link href="/planos"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar aos planos
        </Link>

        <h1 className="text-xl font-semibold text-white mb-6">Finalizar pagamento</h1>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center">
            {error}
            <br />
            <Link href="/planos" className="underline mt-2 inline-block">Voltar e tentar novamente</Link>
          </div>
        )}

        <div ref={brickRef} id="mp-payment-brick" />
      </div>
    </div>
  );
}
