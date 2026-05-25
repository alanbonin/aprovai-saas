"use client";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-10 h-10 text-gray-500"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold mb-2">Você está offline</h1>
      <p className="text-gray-500 max-w-xs leading-relaxed mb-8">
        Sem conexão com a internet. Verifique o Wi-Fi ou os dados móveis e tente novamente.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl font-medium text-sm transition-all"
        style={{ backgroundColor: "var(--color-teal)", color: "#fff" }}
      >
        Tentar novamente
      </button>

      <p className="mt-10 text-xs text-gray-600">
        AprovAI360 — seus estudos, mesmo sem internet
      </p>
    </div>
  );
}
