"use client";
/**
 * TourGuide — tour interativo por página usando Driver.js
 *
 * Uso:
 *   <TourGuide tourId="workspace" steps={WORKSPACE_STEPS} autoStart />
 *
 * - autoStart: inicia automaticamente se o aluno nunca viu este tour
 * - Salva no localStorage qual tour já foi visto
 * - Botão flutuante "?" para rever o tour a qualquer momento
 */
import { useEffect, useState, useCallback } from "react";
import type { DriveStep } from "driver.js";

interface TourGuideProps {
  tourId: string;        // identificador único do tour (ex: "workspace")
  steps: DriveStep[];    // passos do tour
  autoStart?: boolean;   // iniciar automaticamente se nunca viu
  buttonLabel?: string;  // label do botão flutuante
}

function getStorageKey(tourId: string) {
  return `aprovai_tour_done_${tourId}`;
}

export function TourGuide({ tourId, steps, autoStart = true, buttonLabel = "Tutorial" }: TourGuideProps) {
  const [mounted, setMounted] = useState(false);
  const [tourDone, setTourDone] = useState(true); // assume visto até checar

  useEffect(() => {
    setMounted(true);
    try {
      const done = localStorage.getItem(getStorageKey(tourId));
      setTourDone(!!done);
    } catch {
      setTourDone(true);
    }
  }, [tourId]);

  const startTour = useCallback(async (force = false) => {
    // Verifica se o primeiro elemento do tour existe no DOM
    const firstStep = steps[0];
    const firstSelector = typeof firstStep?.element === "string" ? firstStep.element : null;
    if (firstSelector && !document.querySelector(firstSelector)) {
      // Elemento ainda não está no DOM — tenta de novo em 1s
      setTimeout(() => startTour(force), 1000);
      return;
    }

    const { driver } = await import("driver.js");
    await import("driver.js/dist/driver.css");

    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Próximo →",
      prevBtnText: "← Voltar",
      doneBtnText: "Concluir ✓",
      animate: true,
      overlayOpacity: 0.55,
      smoothScroll: true,
      allowClose: true,
      popoverClass: "aprovai-tour-popover",
      steps,
      onDestroyStarted: () => {
        try { localStorage.setItem(getStorageKey(tourId), "1"); } catch {}
        setTourDone(true);
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, [tourId, steps]);

  // Auto-inicia se nunca viu
  useEffect(() => {
    if (!mounted) return;
    if (!autoStart) return;
    if (tourDone) return;

    // Aguarda a página carregar os elementos (2s)
    const timer = setTimeout(() => {
      startTour();
    }, 2000);

    return () => clearTimeout(timer);
  }, [mounted, autoStart, tourDone, startTour]);

  if (!mounted) return null;

  return (
    <>
      {/* Botão flutuante — só aparece se o tour ainda não foi feito */}
      {!tourDone && (
        <button
          onClick={() => startTour(true)}
          title={`Ver tutorial: ${buttonLabel}`}
          className="fixed top-4 right-4 z-[200] flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 border border-[#0ab5bd]/40 text-[#0ab5bd] bg-[#0ab5bd]/10 hover:bg-[#0ab5bd]/20 backdrop-blur-sm"
        >
          <span className="text-sm">❓</span>
          <span className="hidden sm:inline">{buttonLabel}</span>
        </button>
      )}

      {/* CSS customizado para o tour */}
      <style>{`
        .aprovai-tour-popover {
          background: #0f111a !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 16px !important;
          color: #e2e8f0 !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
          max-width: 360px !important;
          padding: 20px !important;
        }
        .aprovai-tour-popover .driver-popover-title {
          color: #ffffff !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          margin-bottom: 8px !important;
        }
        .aprovai-tour-popover .driver-popover-description {
          color: #cbd5e1 !important;
          font-size: 14px !important;
          line-height: 1.65 !important;
        }
        .aprovai-tour-popover .driver-popover-progress-text {
          color: #64748b !important;
          font-size: 11px !important;
        }
        .aprovai-tour-popover .driver-popover-footer {
          margin-top: 14px !important;
          display: flex !important;
          gap: 8px !important;
          align-items: center !important;
        }
        .aprovai-tour-popover .driver-popover-next-btn,
        .aprovai-tour-popover .driver-popover-done-btn {
          background: #6366f1 !important;
          color: #fff !important;
          border: 2px solid #6366f1 !important;
          border-radius: 10px !important;
          padding: 8px 18px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: background 0.2s !important;
          box-shadow: 0 4px 12px rgba(99,102,241,0.4) !important;
        }
        .aprovai-tour-popover .driver-popover-prev-btn {
          background: transparent !important;
          color: #94a3b8 !important;
          border: 2px solid rgba(255,255,255,0.25) !important;
          border-radius: 10px !important;
          padding: 8px 18px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        .aprovai-tour-popover .driver-popover-prev-btn:hover {
          border-color: rgba(255,255,255,0.5) !important;
          color: #fff !important;
        }
        .aprovai-tour-popover .driver-popover-close-btn {
          color: #64748b !important;
          font-size: 20px !important;
          line-height: 1 !important;
          background: transparent !important;
          border: none !important;
        }
        .driver-overlay {
          background: rgba(0,0,0,0.55) !important;
        }
      `}</style>
    </>
  );
}
