"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useSessionState — useState que persiste no sessionStorage.
 * Sobrevive à navegação entre rotas na mesma aba.
 * Perde o estado ao fechar/recarregar a aba (use localStorage para maior durabilidade).
 */
export function useSessionState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setStateRaw] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const saved = sessionStorage.getItem(key);
      return saved !== null ? (JSON.parse(saved) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateRaw(prev => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* quota exceeded */ }
        return next;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(key); } catch { /* ok */ }
    setStateRaw(initialValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [state, setState, clear];
}

/**
 * useLocalState — igual mas usa localStorage (persiste entre abas e recargas).
 */
export function useLocalState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setStateRaw] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? (JSON.parse(saved) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateRaw(prev => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ok */ }
        return next;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    try { localStorage.removeItem(key); } catch { /* ok */ }
    setStateRaw(initialValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [state, setState, clear];
}

/**
 * useTimerSession — persiste um timer como timestamp absoluto de expiração.
 * Ao voltar à página, calcula o tempo restante real (desconta o tempo fora).
 */
export function useTimerSession(key: string): {
  startTimer: (durationSeconds: number) => number; // retorna timeLeft inicial
  getTimeLeft: () => number;                        // tempo restante agora
  saveTimeLeft: (secs: number) => void;
  clearTimer: () => void;
  hasSession: () => boolean;
} {
  const endAtKey = `${key}:endAt`;

  return {
    startTimer(durationSeconds) {
      const endAt = Date.now() + durationSeconds * 1000;
      try { sessionStorage.setItem(endAtKey, String(endAt)); } catch { /* ok */ }
      return durationSeconds;
    },
    getTimeLeft() {
      try {
        const endAt = Number(sessionStorage.getItem(endAtKey) ?? "0");
        return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      } catch { return 0; }
    },
    saveTimeLeft(secs) {
      try { sessionStorage.setItem(endAtKey, String(Date.now() + secs * 1000)); } catch { /* ok */ }
    },
    clearTimer() {
      try { sessionStorage.removeItem(endAtKey); } catch { /* ok */ }
    },
    hasSession() {
      try {
        const endAt = Number(sessionStorage.getItem(endAtKey) ?? "0");
        return endAt > Date.now();
      } catch { return false; }
    },
  };
}
