"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TemplateItem {
  slug: string;
  nome: string;
  assunto: string;
  html: string;
  variaveis: string[];
  updatedAt: string;
  isCustom: boolean;
}

const TEMPLATE_ICONS: Record<string, string> = {
  "trial-expirando": "⏰",
  "boas-vindas": "🎉",
  "lembrete": "📚",
  "reativacao": "👋",
  "relatorio-semanal": "📊",
  "questao-do-dia": "⚡",
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Destaca {{variavel}} em âmbar no textarea via div overlay */
function HighlightedTextarea({
  value,
  onChange,
  onInsertRef,
  placeholder,
  minHeight,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  onInsertRef?: (fn: (text: string) => void) => void;
  placeholder?: string;
  minHeight?: number;
  mono?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = value.slice(0, start) + text + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    }, 0);
  }, [value, onChange]);

  useEffect(() => {
    onInsertRef?.(insertAtCursor);
  }, [insertAtCursor, onInsertRef]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      style={{
        minHeight: minHeight ?? 120,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, monospace" : undefined,
        fontSize: 13,
        lineHeight: 1.6,
        resize: "vertical",
      }}
      className="w-full bg-[#0a0d18] border border-white/10 rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
    />
  );
}

export function EmailsClient() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Editor state
  const [assunto, setAssunto] = useState("");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  const insertHtmlRef = useRef<(text: string) => void>(() => {});

  const selected = templates.find((t) => t.slug === selectedSlug);

  useEffect(() => {
    fetch("/api/admin/email-templates") // eslint-disable-line react-hooks/exhaustive-deps
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setLoadError(d.error ?? `Erro ${r.status}`);
          return;
        }
        setTemplates(d.templates ?? []);
        if (d.templates?.length) {
          const first = d.templates[0].slug;
          setSelectedSlug(first);
          setAssunto(d.templates[0].assunto);
          setHtml(d.templates[0].html);
        }
      })
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, [fetchKey]);

  function selectTemplate(t: TemplateItem) {
    setSelectedSlug(t.slug);
    setAssunto(t.assunto);
    setHtml(t.html);
    setPreview(false);
    setSaveMsg(null);
  }

  async function handleSave() {
    if (!selectedSlug) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedSlug, assunto, html }),
      });
      if (res.ok) {
        setSaveMsg({ ok: true, text: "Template salvo com sucesso!" });
        // Atualiza lista local
        setTemplates((prev) =>
          prev.map((t) =>
            t.slug === selectedSlug
              ? { ...t, assunto, html, isCustom: true, updatedAt: new Date().toISOString() }
              : t
          )
        );
      } else {
        const d = await res.json();
        setSaveMsg({ ok: false, text: d.error ?? "Erro ao salvar." });
      }
    } catch {
      setSaveMsg({ ok: false, text: "Erro de conexão." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    if (!selectedSlug || !selected) return;
    if (!confirm("Restaurar o template padrão? A versão personalizada será perdida.")) return;
    setRestoring(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/email-templates?slug=${selectedSlug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Recarrega templates
        const r2 = await fetch("/api/admin/email-templates");
        const d = await r2.json();
        setTemplates(d.templates ?? []);
        const fresh = (d.templates as TemplateItem[]).find((t) => t.slug === selectedSlug);
        if (fresh) {
          setAssunto(fresh.assunto);
          setHtml(fresh.html);
        }
        setSaveMsg({ ok: true, text: "Template restaurado para o padrão." });
      } else {
        setSaveMsg({ ok: false, text: "Erro ao restaurar." });
      }
    } catch {
      setSaveMsg({ ok: false, text: "Erro de conexão." });
    } finally {
      setRestoring(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Carregando templates...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-400 font-medium">Erro ao carregar templates</p>
        <p className="text-slate-500 text-sm font-mono bg-slate-900 px-4 py-2 rounded-lg">{loadError}</p>
        <button
          onClick={() => { setLoadError(null); setLoading(true); setFetchKey(k => k + 1); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Templates de Email</h1>
        <p className="text-slate-400 text-sm mt-1">
          Edite os templates de email enviados automaticamente pelo sistema. As alterações entram em vigor imediatamente.
        </p>
      </div>

      <div className="flex gap-6" style={{ minHeight: 600 }}>
        {/* Sidebar de templates */}
        <aside className="w-60 flex-shrink-0">
          <div className="bg-[#0f1523] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Templates</p>
            </div>
            <nav className="py-1">
              {templates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => selectTemplate(t)}
                  className={[
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors text-sm",
                    selectedSlug === t.slug
                      ? "bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-500"
                      : "text-slate-300 hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="text-lg leading-none">{TEMPLATE_ICONS[t.slug] ?? "✉️"}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{t.nome}</span>
                    {t.isCustom && (
                      <span className="text-[10px] text-cyan-400 font-semibold">PERSONALIZADO</span>
                    )}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Área de edição */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Selecione um template
            </div>
          ) : (
            <div className="bg-[#0f1523] border border-white/8 rounded-xl overflow-hidden flex flex-col h-full">
              {/* Header do editor */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TEMPLATE_ICONS[selected.slug] ?? "✉️"}</span>
                  <div>
                    <h2 className="text-white font-semibold">{selected.nome}</h2>
                    <p className="text-slate-500 text-xs">
                      Última edição: {formatDate(selected.updatedAt)}
                      {selected.isCustom && (
                        <span className="ml-2 text-cyan-400 font-semibold">· Personalizado</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreview((p) => !p)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    {preview ? "✏️ Editar" : "👁️ Visualizar"}
                  </button>
                  {selected.isCustom && (
                    <button
                      onClick={handleRestore}
                      disabled={restoring}
                      className="px-3 py-1.5 text-xs rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                    >
                      {restoring ? "Restaurando..." : "↩ Restaurar padrão"}
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar template"}
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {saveMsg && (
                <div
                  className={[
                    "mx-6 mt-4 px-4 py-2.5 rounded-lg text-sm font-medium",
                    saveMsg.ok
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400",
                  ].join(" ")}
                >
                  {saveMsg.text}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {preview ? (
                  /* Preview renderizado */
                  <div>
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 mb-1 font-medium">Assunto:</p>
                      <p className="text-slate-200 text-sm font-mono bg-[#0a0d18] border border-white/8 rounded-lg px-3 py-2">
                        {assunto || "(sem assunto)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1 font-medium">Preview do HTML:</p>
                      <div className="rounded-lg overflow-hidden border border-white/8">
                        <iframe
                          srcDoc={html}
                          title="Preview do email"
                          style={{ width: "100%", height: 500, border: "none", background: "#fff" }}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Editor */
                  <>
                    {/* Campo assunto */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Assunto do email
                      </label>
                      <input
                        type="text"
                        value={assunto}
                        onChange={(e) => setAssunto(e.target.value)}
                        placeholder="Assunto do email..."
                        className="w-full bg-[#0a0d18] border border-white/10 rounded-lg px-3 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      />
                    </div>

                    {/* Chips de variáveis */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Variáveis disponíveis
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selected.variaveis.map((v) => (
                          <button
                            key={v}
                            onClick={() => insertHtmlRef.current(`{{${v}}}`)}
                            title={`Inserir {{${v}}} no HTML`}
                            className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-300 text-xs font-mono hover:bg-amber-500/20 transition-colors"
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        Clique em uma variável para inseri-la no cursor do editor HTML.
                      </p>
                    </div>

                    {/* Editor HTML */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        HTML do email
                      </label>
                      <HighlightedTextarea
                        value={html}
                        onChange={setHtml}
                        onInsertRef={(fn) => { insertHtmlRef.current = fn; }}
                        placeholder="Cole ou edite o HTML do email aqui..."
                        minHeight={400}
                        mono
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
