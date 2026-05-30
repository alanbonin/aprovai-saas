"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Search, Filter, FileText, Loader2, ChevronRight, X, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Carrega o viewer apenas no cliente (evita SSR com pdf.js)
const PdfViewer = dynamic(
  () => import("@/components/biblioteca/pdf-viewer").then(m => ({ default: m.PdfViewer })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div> }
);

interface Subject { id: string; name: string; ids?: string[] }
interface Doc {
  id: string; title: string; description?: string;
  subjectId?: string; topicId?: string;
  fileSize: number; pageCount?: number; planLevel: string; createdAt: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BibliotecaClient() {
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [docs, setDocs]           = useState<Doc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDoc, setSelectedDoc]         = useState<Doc | null>(null);
  const [pdfUrl, setPdfUrl]                   = useState<string | null>(null);
  const [userEmail, setUserEmail]             = useState("");
  const [loadingPdf, setLoadingPdf]           = useState(false);
  const [urlExpired, setUrlExpired]           = useState(false);

  useEffect(() => {
    // Busca matérias matriculadas do aluno + email do usuário
    Promise.all([
      fetch("/api/biblioteca").then(r => r.json()),
      fetch("/api/configuracoes").then(r => r.json()),
      fetch("/api/workspace/materias").then(r => r.json()).catch(() => ({ subjects: [] })),
    ]).then(([docsData, user, materiasData]) => {
      setDocs(Array.isArray(docsData) ? docsData : []);
      setUserEmail(user?.email ?? "");
      setSubjects(materiasData?.subjects ?? []);
      setLoading(false);
    });
  }, []);

  const fetchDocs = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedSubject) {
      // Suporta matérias com múltiplos IDs (cross-categoria)
      const sub = subjects.find(s => s.id === selectedSubject);
      if (sub?.ids && sub.ids.length > 1) {
        params.set("subjectIds", sub.ids.join(","));
      } else {
        params.set("subjectId", selectedSubject);
      }
    }
    fetch(`/api/biblioteca?${params}`).then(r => r.json()).then(d => {
      setDocs(Array.isArray(d) ? d : []);
    });
  }, [search, selectedSubject, subjects]);

  useEffect(() => {
    const t = setTimeout(fetchDocs, 300);
    return () => clearTimeout(t);
  }, [fetchDocs]);

  async function openDoc(doc: Doc) {
    setSelectedDoc(doc);
    setLoadingPdf(true);
    setPdfUrl(null);
    setUrlExpired(false);
    try {
      const r = await fetch(`/api/biblioteca/url?id=${doc.id}`);
      if (!r.ok) {
        const err = await r.json();
        alert(err.error ?? "Erro ao abrir documento");
        setSelectedDoc(null);
        return;
      }
      const { url } = await r.json();
      setPdfUrl(url);
    } catch {
      alert("Erro ao carregar documento");
      setSelectedDoc(null);
    } finally {
      setLoadingPdf(false);
    }
  }

  async function refreshUrl() {
    if (!selectedDoc) return;
    setUrlExpired(false);
    setLoadingPdf(true);
    try {
      const r = await fetch(`/api/biblioteca/url?id=${selectedDoc.id}`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(err.error ?? "Erro ao renovar link do documento");
        setLoadingPdf(false);
        return;
      }
      const { url } = await r.json();
      setPdfUrl(url);
    } catch {
      alert("Erro ao renovar link do documento");
    } finally {
      setLoadingPdf(false);
    }
  }

  // subjects já vêm ordenados alfabeticamente de /api/workspace/materias

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar — filtros */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-[#111827] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h1 className="text-base font-bold text-white">Biblioteca PDF</h1>
          </div>
          <p className="text-xs text-gray-500">Material de estudo exclusivo</p>
        </div>

        {/* Busca */}
        <div className="p-3 border-b border-white/5">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar documento..."
              className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-gray-600"
            />
            {search && <button onClick={() => setSearch("")}><X className="w-3 h-3 text-gray-500" /></button>}
          </div>
        </div>

        {/* Matérias */}
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => setSelectedSubject("")}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors",
              !selectedSubject ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            Todas as matérias
          </button>

          {subjects.length === 0 && !loading && (
            <p className="text-xs text-gray-600 px-3 py-2">
              Adicione matérias em Estudar para filtrar aqui.
            </p>
          )}
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(s.id === selectedSubject ? "" : s.id)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                selectedSubject === s.id ? "bg-indigo-600/20 text-indigo-300" : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Lista de documentos */}
      <div className={cn("flex flex-col overflow-hidden transition-all", selectedDoc ? "w-80 flex-shrink-0" : "flex-1")}>
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">{docs.length} documento{docs.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center mt-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center mt-20 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum documento encontrado</p>
            </div>
          ) : (
            docs.map(doc => (
              <button
                key={doc.id}
                onClick={() => openDoc(doc)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all",
                  selectedDoc?.id === doc.id
                    ? "bg-indigo-600/20 border-indigo-500/50"
                    : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-10 bg-red-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                    {doc.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-gray-600">{formatSize(doc.fileSize)}</span>
                      {doc.pageCount && <span className="text-[10px] text-gray-600">• {doc.pageCount} págs</span>}
                      {doc.planLevel !== "trial" && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-500">
                          <Lock className="w-2.5 h-2.5" />
                          {doc.planLevel}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Viewer */}
      {selectedDoc && (
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300 truncate">{selectedDoc.title}</h2>
            <button
              onClick={() => { setSelectedDoc(null); setPdfUrl(null); }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingPdf ? (
            <div className="flex-1 flex items-center justify-center bg-[#1a1d2e] rounded-2xl">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Carregando documento seguro...</p>
              </div>
            </div>
          ) : urlExpired ? (
            <div className="flex-1 flex items-center justify-center bg-[#1a1d2e] rounded-2xl">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-3">Sessão expirada (30 min)</p>
                <button
                  onClick={refreshUrl}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >
                  Recarregar documento
                </button>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="flex-1 overflow-hidden">
              <PdfViewer
                url={pdfUrl}
                title={selectedDoc.title}
                userEmail={userEmail}
                onExpired={() => setUrlExpired(true)}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
