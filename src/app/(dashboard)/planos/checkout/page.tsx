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

  const amount = parseFloat(searchParams.get("amount") ?? "0");
  const fallbackUrl = searchParams.get("fallback") ? decodeURIComponent(searchParams.get("fallback")!) : null;
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
      setError("Configuração de pagamento ausente. Tente novamente ou contate o suporte.");
      setLoading(false);
      return;
    }

    // Timeout: se o Brick não carregar em 10s, redireciona para o MP diretamente
    const brickTimeout = setTimeout(() => {
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
      } else {
        setError("O checkout demorou muito para carregar. Verifique sua conexão e tente novamente.");
        setLoading(false);
      }
    }, 10000);

    const successUrl = plan ? `/planos/sucesso?plan=${plan}` : "/planos/sucesso";

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;

    script.onload = () => {
      try {
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricks = mp.bricks();

        bricks.create("payment", "mp-payment-brick", {
          initialization: {
            amount: amount > 0 ? amount : 1,
            preferenceId,
          },
          customization: {
            visual: {
              style: { theme: "dark" },
            },
          },
          callbacks: {
            onReady: () => {
              clearTimeout(brickTimeout);
              setLoading(false);
            },
            onError: (err: unknown) => {
              clearTimeout(brickTimeout);
              console.error("MP Brick error:", err);
              setError("Erro ao carregar o checkout. Tente novamente.");
              setLoading(false);
            },
            onSubmit: async ({ formData }: { selectedPaymentMethod: string; formData: unknown }) => {
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
          clearTimeout(brickTimeout);
          console.error("MP Brick create error:", err);
          setError("Erro ao inicializar o checkout. Tente novamente.");
          setLoading(false);
        });
      } catch (err) {
        clearTimeout(brickTimeout);
        console.error("MP init error:", err);
        setError("Erro ao inicializar o Mercado Pago. Tente novamente.");
        setLoading(false);
      }
    };

    script.onerror = () => {
      clearTimeout(brickTimeout);
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
      } else {
        setError("Não foi possível carregar o Mercado Pago. Verifique sua conexão.");
        setLoading(false);
      }
    };

    document.head.appendChild(script);

    return () => {
      clearTimeout(brickTimeout);
      if (document.head.contains(script)) document.head.removeChild(script);
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
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm text-gray-500">Carregando checkout seguro…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center space-y-3">
            <p>{error}</p>
            <Link href="/planos" className="underline inline-block">Voltar e tentar novamente</Link>
          </div>
        )}

        <div id="mp-payment-brick" />
      </div>
    </div>
  );
}
