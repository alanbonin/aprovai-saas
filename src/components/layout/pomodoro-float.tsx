"use client";
import { useState } from "react";
import { PomodoroTimer } from "@/components/workspace/pomodoro-timer";
import { X } from "lucide-react";

export function PomodoroFloat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante — oculto quando painel aberto */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Pomodoro"
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-xl transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 20px #6366f155" }}
        >
          🍅
        </button>
      )}

      {/* Painel flutuante */}
      {open && (
        <div
          className="fixed top-14 bottom-20 right-2 md:top-auto md:bottom-20 md:right-6 z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ background: "#080c18", width: "340px", maxWidth: "calc(100vw - 1rem)", overflowY: "auto" }}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 sticky top-0 z-10" style={{ background: "#080c18" }}>
            <span className="text-sm font-semibold text-white">🍅 Pomodoro</span>
            <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <PomodoroTimer />
        </div>
      )}
    </>
  );
}
