"use client";
import { usePush } from "@/hooks/use-push";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  compact?: boolean;   // exibe só o ícone, sem texto completo
}

export function PushToggle({ compact = false }: Props) {
  const { state, subscribe, unsubscribe } = usePush();

  if (state === "unsupported") return null;   // browser sem suporte

  const isGranted = state === "granted";
  const isLoading = state === "loading";
  const isDenied  = state === "denied";

  async function toggle() {
    if (isLoading) return;
    if (isGranted) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={isDenied || isLoading}
        title={
          isDenied  ? "Notificações bloqueadas no navegador" :
          isGranted ? "Desativar notificações" :
          "Ativar lembretes por push"
        }
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isGranted ? "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25" :
          isDenied  ? "text-gray-700 cursor-not-allowed" :
                      "text-gray-500 hover:text-gray-300 hover:bg-white/5",
        )}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
         isGranted ? <BellRing className="w-4 h-4" /> :
         isDenied  ? <BellOff  className="w-4 h-4" /> :
                     <Bell     className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={isDenied || isLoading}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left",
        isGranted
          ? "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15"
          : isDenied
          ? "bg-white/3 border-white/8 opacity-60 cursor-not-allowed"
          : "bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5",
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
        isGranted ? "bg-orange-500/20" : "bg-white/5",
      )}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-orange-400" /> :
         isGranted ? <BellRing className="w-4 h-4 text-orange-400" /> :
         isDenied  ? <BellOff  className="w-4 h-4 text-gray-600" /> :
                     <Bell     className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", isGranted ? "text-orange-300" : isDenied ? "text-gray-600" : "text-gray-300")}>
          {isGranted ? "Lembretes ativados" :
           isDenied  ? "Notificações bloqueadas" :
                       "Ativar lembretes push"}
        </div>
        <div className="text-xs text-gray-600 mt-0.5">
          {isGranted ? "Você receberá avisos para estudar diariamente" :
           isDenied  ? "Desbloqueie nas configurações do navegador" :
                       "Receba lembretes de estudo mesmo com o app fechado"}
        </div>
      </div>
      {!isDenied && (
        <div className={cn(
          "w-10 h-6 rounded-full relative transition-colors flex-shrink-0",
          isGranted ? "bg-orange-500" : "bg-white/10",
        )}>
          <div className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
            isGranted ? "translate-x-[18px]" : "translate-x-0.5",
          )} />
        </div>
      )}
    </button>
  );
}
