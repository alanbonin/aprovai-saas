"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, X, Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker do PDF.js via CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  title: string;
  userEmail: string; // para marca d'água
  onExpired?: () => void;
}

export function PdfViewer({ url, title, userEmail, onExpired }: PdfViewerProps) {
  const [numPages, setNumPages]   = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale]         = useState(1.2);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bloqueia teclas de atalho de download/print
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      // Ctrl+S, Ctrl+P, Ctrl+Shift+S
      if ((e.ctrlKey || e.metaKey) && ["s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  // Bloqueia menu de contexto (botão direito) no viewer
  const blockContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    if (err.message.includes("403") || err.message.includes("expired")) {
      onExpired?.();
    } else {
      setError("Erro ao carregar documento. Tente novamente.");
    }
    setLoading(false);
  }

  const prevPage = () => setPageNumber(p => Math.max(1, p - 1));
  const nextPage = () => setPageNumber(p => Math.min(numPages, p + 1));
  const zoomIn   = () => setScale(s => Math.min(2.5, s + 0.2));
  const zoomOut  = () => setScale(s => Math.max(0.5, s - 0.2));

  const maskedEmail = userEmail.replace(/(.{2}).*(@.*)/, "$1***$2");
  const watermark = `${maskedEmail} • Aprovai360 • Uso exclusivo do assinante`;

  return (
    <div className="flex flex-col h-full bg-[#1a1d2e] rounded-2xl overflow-hidden select-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-white/10 flex-shrink-0">
        <h2 className="text-sm font-semibold text-white truncate max-w-xs">{title}</h2>

        <div className="flex items-center gap-2">
          {/* Busca */}
          {showSearch ? (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Buscar no documento..."
                className="bg-transparent text-sm text-white outline-none w-40 placeholder:text-gray-500"
              />
              <button onClick={() => { setShowSearch(false); setSearchText(""); }}>
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Buscar (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Zoom */}
          <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex flex-col items-center py-6 px-4 relative"
        onContextMenu={blockContext}
      >
        {loading && (
          <div className="flex items-center gap-3 text-gray-400 mt-20">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Carregando documento...</span>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm mt-20 text-center">
            <p>{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); }}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!error && (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
          >
            <div className="relative">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                customTextRenderer={({ str }) => {
                  if (!searchText) return str;
                  const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
                  return str.replace(regex, '<mark style="background:#fbbf24;color:#000">$1</mark>');
                }}
              />
              {/* Marca d'água */}
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                style={{ transform: "rotate(-30deg)" }}
              >
                <span
                  className="text-white/[0.06] font-bold text-lg text-center leading-loose whitespace-nowrap"
                  style={{ fontSize: `${scale * 14}px` }}
                >
                  {watermark}
                </span>
              </div>
            </div>
          </Document>
        )}
      </div>

      {/* Footer — navegação de páginas */}
      {numPages > 0 && (
        <div className="flex items-center justify-center gap-4 py-3 bg-[#111827] border-t border-white/10 flex-shrink-0">
          <button
            onClick={prevPage}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= numPages) setPageNumber(v);
              }}
              className="w-12 text-center bg-white/10 border border-white/10 rounded text-sm text-white py-0.5 outline-none focus:border-indigo-500"
            />
            <span className="text-sm text-gray-400">de {numPages}</span>
          </div>

          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
