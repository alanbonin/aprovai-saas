import { db } from "@/lib/db";
import { Zap, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";

interface WebhookLog {
  id: string;
  content: string;
  createdAt: string;
}

interface ParsedLog {
  type: string;
  payload?: Record<string, unknown>;
  error?: string;
  ts?: string;
}

const TYPE_META: Record<string, { label: string; color: string; icon: "ok" | "err" | "warn" | "info" }> = {
  payment_approved:         { label: "Pagamento aprovado",    color: "text-green-400",  icon: "ok" },
  subscription_renewed:     { label: "Assinatura renovada",   color: "text-emerald-400", icon: "ok" },
  merchant_order_approved:  { label: "Ordem aprovada",        color: "text-green-400",  icon: "ok" },
  subscription_cancelled:   { label: "Assinatura cancelada",  color: "text-red-400",    icon: "err" },
  payment_no_ref:           { label: "Sem referência",        color: "text-orange-400", icon: "warn" },
  signature_invalid:        { label: "Assinatura inválida",   color: "text-red-500",    icon: "err" },
  webhook_error:            { label: "Erro no webhook",       color: "text-red-500",    icon: "err" },
  payment:                  { label: "Evento payment",        color: "text-blue-400",   icon: "info" },
  merchant_order:           { label: "Merchant order",        color: "text-blue-400",   icon: "info" },
  subscription_authorized_payment: { label: "Sub autorizada", color: "text-indigo-400", icon: "info" },
  subscription_preapproval:       { label: "Pre-approval",    color: "text-indigo-400", icon: "info" },
};

function IconFor({ kind }: { kind: "ok" | "err" | "warn" | "info" }) {
  if (kind === "ok")   return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (kind === "err")  return <XCircle      className="w-4 h-4 text-red-400" />;
  if (kind === "warn") return <AlertCircle  className="w-4 h-4 text-orange-400" />;
  return                      <Clock        className="w-4 h-4 text-blue-400" />;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

export default async function WebhooksPage() {
  // Os logs ficam na tabela Note com userId="webhook" e subjectId="__WEBHOOK_LOG__"
  const { data: logs } = await db
    .from("Note")
    .select("id, content, createdAt")
    .eq("userId", "webhook")
    .eq("subjectId", "__WEBHOOK_LOG__")
    .order("createdAt", { ascending: false })
    .limit(100);

  const parsed: Array<{ raw: WebhookLog; log: ParsedLog }> = (logs ?? []).map((row: WebhookLog) => {
    try { return { raw: row, log: JSON.parse(row.content) as ParsedLog }; }
    catch { return { raw: row, log: { type: "parse_error", error: row.content } }; }
  });

  // Estatísticas
  const total = parsed.length;
  const approved = parsed.filter(({ log }) => log.type === "payment_approved" || log.type === "merchant_order_approved" || log.type === "subscription_renewed").length;
  const errors = parsed.filter(({ log }) => log.type === "webhook_error" || log.type === "signature_invalid").length;
  const pending = parsed.filter(({ log }) => log.type === "payment" || log.type === "merchant_order").length;

  return (
    <div className="p-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" /> Webhooks & Pagamentos
          </h1>
          <p className="text-gray-500 text-sm mt-1">Últimos 100 eventos registrados pelo Mercado Pago</p>
        </div>
        <a href="/admin/webhooks" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
          <RefreshCw className="w-3 h-3" /> Atualizar
        </a>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Eventos",         value: total,    color: "text-white" },
          { label: "Pagamentos OK",   value: approved, color: "text-green-400" },
          { label: "Erros",           value: errors,   color: errors > 0 ? "text-red-400" : "text-gray-500" },
          { label: "Em processamento",value: pending,  color: "text-blue-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/3 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela de eventos */}
      <div className="rounded-xl border border-white/5 bg-white/3 overflow-hidden">
        {parsed.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Nenhum webhook registrado ainda.</p>
            <p className="text-xs mt-1">Configure o webhook no painel do Mercado Pago apontando para <code className="bg-white/5 px-1 rounded">/api/pagamento/webhook</code></p>
          </div>
        )}

        {parsed.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-xs">
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Detalhes</th>
                  <th className="px-4 py-3 text-left">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {parsed.map(({ raw, log }) => {
                  const meta = TYPE_META[log.type] ?? { label: log.type, color: "text-gray-400", icon: "info" as const };
                  const userId = (log.payload as Record<string, unknown> | undefined)?.userId as string | undefined;
                  const planId = (log.payload as Record<string, unknown> | undefined)?.planId as string | undefined;
                  const paymentId = (log.payload as Record<string, unknown> | undefined)?.paymentId as string | undefined;
                  const ts = log.ts ?? raw.createdAt;

                  return (
                    <tr key={raw.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <IconFor kind={meta.icon} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                        {log.error && <span className="text-red-400 text-xs">{log.error.slice(0, 80)}</span>}
                        {!log.error && (
                          <span className="text-xs">
                            {userId && <span className="mr-2">👤 {userId.slice(0, 8)}…</span>}
                            {planId && <span className="mr-2">📦 {planId.slice(0, 8)}…</span>}
                            {paymentId && <span>💳 {paymentId}</span>}
                            {!userId && !planId && !paymentId && <span className="opacity-40">—</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDate(ts ?? "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
