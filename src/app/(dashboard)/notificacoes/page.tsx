"use client";
import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  icon: string;
}

const TYPE_COLORS: Record<string, string> = {
  streak:       "border-amber-500/30 bg-amber-500/5",
  level:        "border-indigo-500/30 bg-indigo-500/5",
  achievement:  "border-yellow-500/30 bg-yellow-500/5",
  reminder:     "border-blue-500/30 bg-blue-500/5",
  prova:        "border-red-500/30 bg-red-500/5",
  announcement: "border-green-500/30 bg-green-500/5",
};

export default function NotificacoesPage() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notificacoes");
      const d   = await res.json();
      setNotifs(d.notifs ?? []);
      setUnread(d.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(ids: string[]) {
    setNotifs(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - ids.filter(id => !notifs.find(n => n.id === id)?.read).length));
    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }

  async function markAll() {
    setMarking(true);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    setMarking(false);
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-indigo-400" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notificações</h1>
            <p className="text-gray-500 text-sm">
              {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia!"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            disabled={marking}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p>Nenhuma notificação ainda.</p>
          <p className="text-sm mt-1">Continue estudando para desbloquear conquistas!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead([n.id])}
              className={cn(
                "flex gap-3 p-4 rounded-xl border transition-all",
                TYPE_COLORS[n.type] ?? "border-white/10 bg-white/3",
                !n.read && "cursor-pointer hover:brightness-110",
                n.read && "opacity-60"
              )}
            >
              <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    "text-sm font-semibold",
                    n.read ? "text-gray-300" : "text-white"
                  )}>
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
              </div>
              {n.read && (
                <Check className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
