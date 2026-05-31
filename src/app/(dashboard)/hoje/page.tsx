"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Flame, Target, RotateCcw, Zap, Brain, BookOpen, ChevronRight, RefreshCw, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyDigestMini {
  emoji: string;
  titulo: string;
  aproveitamento: number;
  tendencia: "subindo" | "estavel" | "caindo";
  questoesRespondidas: number;
}

interface HojeData {
  questoesHoje: number;
  questoesVencidas: number;
  flashcardsVencidos: number;
  streak: number;
  streakAtRisk: boolean;
  metaQuestoesHoje: number;
  metaLeituraPdfHoje: number;
  progressoPct: number;
  prioridade: { subjectName: string; erros: number } | null;
  estudouHoje: boolean;
  desafioConcluido: boolean;
  simuladoHoje: boolean;
  revisaoFeitaHoje: boolean;
  pdfMinutosHoje: number;
}

function RingProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(100, pct);
  const color = fill >= 100 ? "#34d399" : fill >= 60 ? "#6366f1" : fill >= 30 ? "#f59e0b" : "#6b7280";
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - fill / 100)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: number | string;
  badgeColor?: string;
  urgent?: boolean;
  done?: boolean;
}

function ActionCard({ href, icon, title, desc, badge, badgeColor = "bg-indigo-500", urgent, done }: ActionCardProps) {
  return (
    <Link href={href} className={cn(
      "flex items-center gap-4 p-4 rounded-xl border transition-all hover:bg-white/[0.04] group",
      done ? "border-emerald-500/30 bg-emerald-500/[0.03]" :
      urgent ? "border-amber-500/30 bg-amber-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        done ? "bg-emerald-500/15" : urgent ? "bg-amber-500/15" : "bg-white/[0.05]"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", done ? "text-emerald-300" : "text-white")}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{desc}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : badge !== undefined ? (
          <span className={cn("min-w-[22px] h-[22px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1.5", badgeColor)}>
            {badge}
          </span>
        ) : null}
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </Link>
  );
}

const DIAS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function HojePage() {
  const [data, setData] = useState<HojeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [digest, setDigest] = useState<WeeklyDigestMini | null>(null);

  const now = new Date();
  const dateLabel = `${DIAS_PT[now.getDay()]}, ${now.getDate()} de ${MESES_PT[now.getMonth()]}`;

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    const res = await fetch("/api/workspace/hoje");
    if (res.ok) setData(await res.json());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    // Atualiza contadores ao responder questões na mesma página
    const onProgress = () => load();
    window.addEventListener("aprovai:progress", onProgress);
    return () => window.removeEventListener("aprovai:progress", onProgress);
    // Carrega resumo semanal em paralelo (não bloqueia)
    fetch("/api/relatorio/semanal")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.digest) {
          const { emoji, titulo, aproveitamento, tendencia, questoesRespondidas } = d.digest as WeeklyDigestMini & { titulo: string };
          setDigest({ emoji, titulo, aproveitamento, tendencia, questoesRespondidas });
        }
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-xl w-48" />
          <div className="h-32 bg-white/5 rounded-2xl" />
          <div className="h-20 bg-white/5 rounded-xl" />
          <div className="h-20 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">Não foi possível carregar seu briefing. Tente recarregar a página.</p>
        <button onClick={() => load()} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm text-white transition-colors">
          Tentar novamente
        </button>
      </div>
    );
  }

  const d = data;
  const totalPendente = d.questoesVencidas + d.flashcardsVencidos;

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sun className="w-6 h-6 text-amber-400" />
            Briefing de Hoje
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{dateLabel}</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Streak at risk banner */}
      {d.streakAtRisk && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-300">Sequência em risco!</p>
            <p className="text-xs text-amber-500/80 mt-0.5">
              Você tem {d.streak} dias de sequência. Estude hoje para não perder!
            </p>
          </div>
        </div>
      )}

      {/* Meta do dia + streak */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
        <div className="flex items-center gap-5">
          {/* Ring */}
          <div className="relative flex-shrink-0">
            <RingProgress pct={d.progressoPct} size={84} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "text-lg font-black leading-none",
                d.progressoPct >= 100 ? "text-emerald-400" : "text-white"
              )}>
                {d.progressoPct}%
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-300 mb-0.5">Meta diária</p>
            <p className="text-2xl font-black text-white">
              {d.questoesHoje}
              <span className="text-base font-medium text-gray-500">/{d.metaQuestoesHoje}</span>
            </p>
            <p className="text-xs text-gray-600 mt-0.5">questões respondidas hoje</p>
          </div>

          <div className="flex-shrink-0 text-center">
            <div className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border",
              d.estudouHoje
                ? "bg-emerald-500/10 border-emerald-500/20"
                : d.streakAtRisk
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-white/[0.03] border-white/[0.06]"
            )}>
              <Flame className={cn(
                "w-5 h-5",
                d.streak > 0 ? "text-amber-400" : "text-gray-600"
              )} />
              <span className="text-xl font-black text-white leading-none">{d.streak}</span>
              <span className="text-[9px] text-gray-500 font-medium">DIAS</span>
            </div>
          </div>
        </div>

        {d.progressoPct >= 100 && (
          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <p className="text-xs text-emerald-400 font-semibold text-center">
              🎉 Meta batida! Continue para acumular mais XP.
            </p>
          </div>
        )}

        {d.progressoPct < 100 && d.questoesHoje === 0 && !d.streakAtRisk && (
          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <p className="text-xs text-gray-600 text-center">
              Você ainda não respondeu nenhuma questão hoje. Vamos lá?
            </p>
          </div>
        )}
      </div>

      {/* Ações prioritárias */}
      <div className="space-y-2 mb-6">
        <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-3">
          Ações de hoje
        </p>

        <ActionCard
          href="/questoes"
          icon={<Target className={cn("w-5 h-5", d.questoesHoje >= d.metaQuestoesHoje ? "text-emerald-400" : "text-indigo-400")} />}
          title="Questões"
          desc={d.questoesHoje === 0 ? "Comece respondendo questões agora" : `${d.questoesHoje} respondida${d.questoesHoje !== 1 ? "s" : ""} — continue!`}
          badge={d.questoesHoje >= d.metaQuestoesHoje ? undefined : `+${d.metaQuestoesHoje - d.questoesHoje}`}
          badgeColor="bg-indigo-600"
          done={d.questoesHoje >= d.metaQuestoesHoje}
        />

        <ActionCard
          href="/desafio"
          icon={<Zap className={cn("w-5 h-5", d.desafioConcluido ? "text-emerald-400" : "text-amber-400")} />}
          title="Desafio Diário"
          desc={d.desafioConcluido ? "Desafio de hoje concluído!" : "10 questões cronometradas — XP bônus"}
          done={d.desafioConcluido}
        />

        {d.questoesVencidas > 0 && (
          <ActionCard
            href="/revisao"
            icon={<RotateCcw className={cn("w-5 h-5", d.revisaoFeitaHoje ? "text-emerald-400" : "text-rose-400")} />}
            title="Revisão SM-2"
            desc={d.revisaoFeitaHoje ? "Revisões feitas hoje!" : "Questões com revisão espaçada pendente"}
            badge={d.revisaoFeitaHoje ? undefined : d.questoesVencidas}
            badgeColor="bg-rose-600"
            urgent={!d.revisaoFeitaHoje}
            done={d.revisaoFeitaHoje}
          />
        )}

        {d.flashcardsVencidos > 0 && (
          <ActionCard
            href="/flashcards"
            icon={<Brain className="w-5 h-5 text-violet-400" />}
            title="Flashcards para revisar"
            desc="Flashcards com repetição espaçada vencida"
            badge={d.flashcardsVencidos}
            badgeColor="bg-violet-600"
            urgent={d.flashcardsVencidos > 5}
          />
        )}

        <ActionCard
          href="/biblioteca"
          icon={<BookOpen className={cn("w-5 h-5", d.pdfMinutosHoje >= d.metaLeituraPdfHoje ? "text-emerald-400" : "text-emerald-400")} />}
          title="Leitura de PDFs"
          desc={d.pdfMinutosHoje > 0
            ? `${d.pdfMinutosHoje}/${d.metaLeituraPdfHoje} min lidos hoje`
            : `Meta: ${d.metaLeituraPdfHoje} min na Biblioteca de materiais`}
          done={d.pdfMinutosHoje >= d.metaLeituraPdfHoje}
        />

        <ActionCard
          href="/agenda-revisoes"
          icon={<RotateCcw className="w-5 h-5 text-blue-400" />}
          title="Agenda de Revisões"
          desc="Veja todas as revisões programadas"
        />

        {d.simuladoHoje && (
          <ActionCard
            href="/simulado"
            icon={<Target className="w-5 h-5 text-emerald-400" />}
            title="Simulado"
            desc="Simulado feito hoje!"
            done
          />
        )}
      </div>

      {/* Matéria prioritária */}
      {d.prioridade && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
          <div className="flex items-start gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Matéria prioritária esta semana</p>
              <p className="text-xs text-gray-500 mt-0.5">Baseado nos seus erros dos últimos 7 dias</p>
            </div>
          </div>

          <div className="rounded-xl bg-rose-500/[0.06] border border-rose-500/15 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-rose-300">{d.prioridade.subjectName}</p>
              <p className="text-xs text-gray-600 mt-0.5">{d.prioridade.erros} erro{d.prioridade.erros !== 1 ? "s" : ""} recente{d.prioridade.erros !== 1 ? "s" : ""}</p>
            </div>
            <Link
              href={`/questoes?subject=${encodeURIComponent(d.prioridade.subjectName)}`}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1"
            >
              Praticar <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Card resumo semanal */}
      {digest && (
        <Link href="/resumo-semanal" className="block rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08] transition-colors p-4 mb-5 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{digest.emoji}</span>
              <div>
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-0.5">Resumo da semana</p>
                <p className="text-sm font-medium text-white truncate max-w-[220px]">{digest.titulo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className={cn(
                  "text-lg font-black leading-none",
                  digest.aproveitamento >= 70 ? "text-emerald-400"
                  : digest.aproveitamento >= 50 ? "text-amber-400"
                  : "text-red-400"
                )}>{digest.aproveitamento}%</p>
                <p className="text-[10px] text-gray-600">{digest.questoesRespondidas} questões</p>
              </div>
              {digest.tendencia === "subindo"
                ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                : digest.tendencia === "caindo"
                ? <TrendingDown className="w-4 h-4 text-red-400" />
                : <Minus className="w-4 h-4 text-gray-500" />}
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
          </div>
        </Link>
      )}

      {/* Resumo geral */}
      {totalPendente === 0 && d.progressoPct >= 100 && (
        <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 p-6 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm font-bold text-emerald-300 mb-1">Parabéns! Tudo em dia!</p>
          <p className="text-xs text-gray-500">
            Meta batida, sem revisões pendentes. Você é incrível!
          </p>
        </div>
      )}

      {totalPendente === 0 && d.progressoPct < 100 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center">
          <p className="text-xs text-gray-600">
            {d.questoesHoje === 0
              ? "Nenhum pendente além da meta de hoje. Bora começar!"
              : "Sem revisões vencidas — ótimo! Foco na meta de questões."}
          </p>
        </div>
      )}
    </div>
  );
}
