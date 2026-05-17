"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload, Download, CheckCircle, AlertCircle,
  FileText, ArrowLeft, Loader2, Table,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportResult {
  inserted: number;
  skipped: number;
  total: number;
  errors: { row: number; message: string }[];
}

export default function ImportQuestoesPage() {
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<string[][]>([]);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    // Quick CSV preview (first 6 rows)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
      const rows = lines.map(l => l.split(";").map(c => c.replace(/^"|"$/g, "").trim()));
      setPreview(rows);
    };
    reader.readAsText(f, "utf-8");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.type.includes("csv"))) handleFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/questoes/import", { method: "POST", body: form }).catch(() => null);
    if (res?.ok) {
      const d: ImportResult = await res.json();
      setResult(d);
    }
    setLoading(false);
  }

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/questoes" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Importar Questões</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload em massa via arquivo CSV</p>
        </div>
        <a
          href="/api/admin/questoes/import"
          download="template-questoes.csv"
          className="ml-auto flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar template
        </a>
      </div>

      {/* Format guide */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Table className="w-4 h-4 text-indigo-400" />
          Formato do CSV
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {["subjectId *","statement *","optionA *","optionB *","optionC","optionD","optionE","answer *","level","banca","year","explanation"].map(h => (
                  <th key={h} className={cn(
                    "px-2 py-1.5 text-left font-medium whitespace-nowrap",
                    h.includes("*") ? "text-indigo-400" : "text-gray-500"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {["uuid-materia","Enunciado...","Alt. A","Alt. B","Alt. C","","","A","medio","CESPE","2024","Explicação"].map((v, i) => (
                  <td key={i} className="px-2 py-1.5 text-gray-600 italic whitespace-nowrap">{v || "—"}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
          <span>* Obrigatório</span>
          <span>Separador: <code className="text-gray-400">;</code></span>
          <span>level: <code className="text-gray-400">facil | medio | dificil</code></span>
          <span>answer: <code className="text-gray-400">A–E</code></span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all mb-5",
          dragOver
            ? "border-indigo-400 bg-indigo-500/10"
            : file
            ? "border-green-500/40 bg-green-500/5"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <div>
            <FileText className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-green-300 font-semibold">{file.name}</p>
            <p className="text-gray-500 text-sm mt-1">
              {(file.size / 1024).toFixed(1)} KB · Clique para trocar
            </p>
          </div>
        ) : (
          <div>
            <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Arraste o CSV aqui ou clique para selecionar</p>
            <p className="text-gray-600 text-sm mt-1">Arquivo .csv com separador ponto e vírgula</p>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5 overflow-x-auto">
          <p className="text-xs text-gray-500 mb-2">Pré-visualização (primeiras 5 linhas):</p>
          <table className="text-xs w-full">
            {preview.map((row, i) => (
              <tr key={i} className={cn(
                "border-b border-white/5",
                i === 0 ? "text-indigo-400 font-semibold" : "text-gray-400"
              )}>
                {row.slice(0, 8).map((cell, j) => (
                  <td key={j} className="px-2 py-1.5 max-w-32 truncate" title={cell}>
                    {cell || "—"}
                  </td>
                ))}
                {row.length > 8 && (
                  <td className="px-2 py-1.5 text-gray-600">+{row.length - 8}</td>
                )}
              </tr>
            ))}
          </table>
        </div>
      )}

      {/* Upload button */}
      {file && !result && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Importando...</>
            : <><Upload className="w-5 h-5" /> Importar questões</>
          }
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-green-500/[0.06] border border-green-500/20 p-4 text-center">
              <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-black text-green-400">{result.inserted}</p>
              <p className="text-xs text-gray-500">Inseridas</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-2xl font-black text-white">{result.total}</p>
              <p className="text-xs text-gray-500">Total no CSV</p>
            </div>
            <div className={cn(
              "rounded-xl p-4 text-center",
              result.errors.length > 0
                ? "bg-red-500/[0.06] border border-red-500/20"
                : "bg-white/[0.03] border border-white/[0.06]"
            )}>
              <p className={cn("text-2xl font-black", result.errors.length > 0 ? "text-red-400" : "text-gray-400")}>
                {result.skipped}
              </p>
              <p className="text-xs text-gray-500">Ignoradas</p>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="rounded-xl bg-red-500/[0.04] border border-red-500/20 p-4">
              <h3 className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {result.errors.length} erro{result.errors.length !== 1 ? "s" : ""} encontrado{result.errors.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs text-red-300/80 flex gap-2">
                    <span className="text-red-500 flex-shrink-0">Linha {e.row}:</span>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.inserted > 0 && (
            <div className="text-center">
              <p className="text-sm text-green-400 font-medium mb-3">
                ✅ {result.inserted} questão{result.inserted !== 1 ? "ões" : ""} importada{result.inserted !== 1 ? "s" : ""} com sucesso!
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/admin/questoes"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
                  Ver questões
                </Link>
                <button
                  onClick={() => { setFile(null); setPreview([]); setResult(null); }}
                  className="px-5 py-2.5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Importar mais
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
