"use client";
import { useState, useEffect, useCallback } from "react";
import { Layers, RotateCcw, Trophy, Zap, ChevronRight, ChevronDown, ArrowLeft, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Deck {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  totalCards: number;
  dueCount: number;
  updatedAt: string;
}

interface Card {
  id: string;
  front: string;
  back: string;
  interval?: number;
  easeFactor?: number;
  nextReview?: string;
  dueNow: boolean;
}

interface DeckDetail {
  id: string;
  name: string;
  isOwn: boolean;
  cards: Card[];
  dueCount: number;
  totalCards: number;
}

// ── Flip card ──────────────────────────────────────────────────────────────────
function FlipCard({ front, back, flipped, onFlip }: {
  front: string; back: string; flipped: boolean; onFlip: () => void;
}) {
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1000px", height: "260px" }}
      onClick={onFlip}
    >
      <div className="absolute inset-0 transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        {/* Frente */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-indigo-800/20
          border border-indigo-500/30 flex flex-col items-center justify-center p-6 text-center"
          style={{ backfaceVisibility: "hidden" }}>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-4">Pergunta</p>
          <p className="text-base text-white leading-relaxed font-medium">{front}</p>
          <p className="text-xs text-gray-600 mt-6">Clique para revelar</p>
        </div>
        {/* Verso */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-emerald-800/20
          border border-emerald-500/30 flex flex-col items-center justify-center p-6 text-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-4">Resposta</p>
          <p className="text-base text-white leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  );
}

// ID virtual para o deck de erros automáticos
const AUTO_ERRO_DECK_ID = "__auto-erro__";

// ── Main ───────────────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const [decks, setDecks]       = useState<Deck[]>([]);
  const [autoErroDeck, setAutoErroDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeDeck, setActiveDeck] = useState<DeckDetail | null>(null);
  const [deckLoading, setDeckLoading] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Sessão de estudo
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [cardIdx, setCardIdx]   = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [done, setDone]         = useState(false);
  const [xpFlash, setXpFlash]   = useState(false);
  const [sessionStats, setSessionStats] = useState({ lembrei: 0, dificil: 0, naoLembrei: 0 });

  const loadDecks = useCallback(async () => {
    try {
      const [decksData, autoData] = await Promise.all([
        fetch("/api/workspace/flashcards").then(r => r.ok ? r.json() : null),
        fetch("/api/workspace/flashcards/auto-erro").then(r => r.ok ? r.json() : null),
      ]);
      if (decksData) {
        const loadedDecks: Deck[] = decksData.decks ?? [];
        setDecks(loadedDecks);
        // Auto-expand first subject with pending cards
        const firstWithDue = loadedDecks.find(d => d.dueCount > 0);
        if (firstWithDue) setExpandedSubject(firstWithDue.subjectId);
      }
      if (autoData?.cards?.length > 0) {
        const cards: Card[] = (autoData.cards as Array<{id: string; front: string; back: string; nextReview?: string; interval?: number; easeFactor?: number}>).map(c => ({
          id: c.id,
          front: c.front,
          back: c.back,
          interval: c.interval,
          easeFactor: c.easeFactor,
          nextReview: c.nextReview,
          dueNow: !c.nextReview || new Date(c.nextReview) <= new Date(),
        }));
        setAutoErroDeck({
          id: AUTO_ERRO_DECK_ID,
          name: "⚠️ Erros Automáticos",
          isOwn: true,
          cards,
          dueCount: cards.filter(c => c.dueNow).length,
          totalCards: cards.length,
        });
      } else {
        setAutoErroDeck(null);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDecks(); }, [loadDecks]);

  async function openDeck(deckId: string) {
    // Deck especial de erros automáticos — já temos os dados em memória
    if (deckId === AUTO_ERRO_DECK_ID && autoErroDeck) {
      setActiveDeck(autoErroDeck);
      const due    = autoErroDeck.cards.filter(c => c.dueNow).sort(() => Math.random() - 0.5);
      const notDue = autoErroDeck.cards.filter(c => !c.dueNow).sort(() => Math.random() - 0.5);
      const SESSION_CAP = 20;
      setSessionCards([...due.slice(0, SESSION_CAP), ...notDue.slice(0, Math.max(0, SESSION_CAP - due.length))]);
      setCardIdx(0);
      setFlipped(false);
      setDone(false);
      setSessionStats({ lembrei: 0, dificil: 0, naoLembrei: 0 });
      return;
    }

    setDeckLoading(true);
    const res = await fetch(`/api/workspace/flashcards/${deckId}`).catch(() => null);
    if (res?.ok) {
      const d: DeckDetail = await res.json();
      setActiveDeck(d);
      // Prioriza vencidas, depois novas, shuffla um pouco
      const due    = d.cards.filter(c => c.dueNow).sort(() => Math.random() - 0.5);
      const notDue = d.cards.filter(c => !c.dueNow).sort(() => Math.random() - 0.5);
      const SESSION_CAP = 20;
      setSessionCards([...due.slice(0, SESSION_CAP), ...notDue.slice(0, Math.max(0, SESSION_CAP - due.length))]);
      setCardIdx(0);
      setFlipped(false);
      setDone(false);
      setSessionStats({ lembrei: 0, dificil: 0, naoLembrei: 0 });
    }
    setDeckLoading(false);
  }

  const handleQuality = useCallback(async (quality: "lembrei" | "dificil" | "nao-lembrei") => {
    if (!activeDeck || !sessionCards[cardIdx]) return;
    const card = sessionCards[cardIdx];

    if (quality === "lembrei") {
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 1500);
    }

    setSessionStats(prev => ({
      ...prev,
      [quality === "lembrei" ? "lembrei" : quality === "dificil" ? "dificil" : "naoLembrei"]:
        prev[quality === "lembrei" ? "lembrei" : quality === "dificil" ? "dificil" : "naoLembrei"] + 1,
    }));

    // Deck de erros automáticos usa endpoint dedicado (SM-2 local no Note KV)
    if (activeDeck.id === AUTO_ERRO_DECK_ID) {
      await fetch("/api/workspace/flashcards/auto-erro", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, quality }),
      }).catch(() => {});
    } else {
      await fetch("/api/flashcards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: activeDeck.id, cardId: card.id, quality }),
      }).catch(() => {});
    }

    if (cardIdx + 1 >= sessionCards.length) {
      setDone(true);
    } else {
      setCardIdx(i => i + 1);
      setFlipped(false);
    }
  }, [activeDeck, cardIdx, sessionCards]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || deckLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hasAnyDeck = decks.length > 0 || autoErroDeck !== null;

  // ── Sem decks ──────────────────────────────────────────────────────────────
  if (!activeDeck && !hasAnyDeck) return (
    <div className="p-6 max-w-2xl mx-auto text-white text-center mt-20">
      <Layers className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Nenhum flashcard disponível</h2>
      <p className="text-gray-400 text-sm">
        Acesse o Workspace e peça ao mentor para gerar flashcards das suas matérias.
      </p>
    </div>
  );

  // ── Lista de decks ─────────────────────────────────────────────────────────
  if (!activeDeck) {
    const totalDue = decks.reduce((s, d) => s + d.dueCount, 0)
      + (autoErroDeck?.dueCount ?? 0);

    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto text-white">
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold">Flashcards</h1>
            <p className="text-gray-500 text-sm">
              {totalDue} cartas para revisar hoje
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Deck especial: Erros Automáticos */}
          {autoErroDeck && (
            <button
              onClick={() => openDeck(AUTO_ERRO_DECK_ID)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-red-200">{autoErroDeck.name}</p>
                <p className="text-xs text-gray-500">
                  {autoErroDeck.totalCards} carta{autoErroDeck.totalCards !== 1 ? "s" : ""} geradas automaticamente dos seus erros
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                {autoErroDeck.dueCount > 0 ? (
                  <span className="px-2 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
                    {autoErroDeck.dueCount} pendentes
                  </span>
                ) : (
                  <span className="text-xs text-green-400 font-medium">✓ Em dia</span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
            </button>
          )}

          {/* Decks regulares agrupados por matéria */}
          {(() => {
            // Group decks by subjectId
            const groupMap = new Map<string, { subjectName: string; decks: Deck[] }>();
            for (const deck of decks) {
              const key = deck.subjectId ?? "__sem-materia__";
              if (!groupMap.has(key)) {
                groupMap.set(key, { subjectName: deck.subjectName || deck.subjectId || "Sem matéria", decks: [] });
              }
              groupMap.get(key)!.decks.push(deck);
            }
            const groups = Array.from(groupMap.entries());

            return groups.map(([subjectId, group]) => {
              const totalPending = group.decks.reduce((s, d) => s + d.dueCount, 0);
              const totalCards = group.decks.reduce((s, d) => s + d.totalCards, 0);
              const doneCards = totalCards - group.decks.reduce((s, d) => s + d.dueCount, 0);
              const progressPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 100;
              const isExpanded = expandedSubject === subjectId;

              return (
                <div key={subjectId} className="rounded-xl border border-white/10 overflow-hidden">
                  {/* Subject header */}
                  <button
                    onClick={() => setExpandedSubject(isExpanded ? null : subjectId)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/8 transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{group.subjectName}</p>
                      <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden w-full">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {totalPending > 0 ? (
                        <span className="px-2 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
                          {totalPending} pendentes
                        </span>
                      ) : (
                        <span className="text-xs text-green-400 font-medium">✓ Em dia</span>
                      )}
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-500" />
                        : <ChevronRight className="w-4 h-4 text-gray-500" />
                      }
                    </div>
                  </button>

                  {/* Decks within subject */}
                  {isExpanded && (
                    <div className="border-t border-white/5">
                      {group.decks.map((deck, idx) => {
                        // Strip subject name prefix from deck name if it starts with it
                        let displayName = deck.name;
                        if (group.subjectName && deck.name.startsWith(group.subjectName)) {
                          displayName = deck.name.slice(group.subjectName.length).replace(/^[\s—\-–]+/, "").trim() || deck.name;
                        }
                        const isLast = idx === group.decks.length - 1;
                        return (
                          <button
                            key={deck.id}
                            onClick={() => openDeck(deck.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left",
                              !isLast && "border-b border-white/5"
                            )}
                          >
                            <span className="text-gray-600 text-xs w-4 flex-shrink-0">
                              {isLast ? "└" : "├"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-200 truncate">{displayName}</p>
                              <p className="text-xs text-gray-600">{deck.totalCards} cartas</p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                              {deck.dueCount > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
                                  {deck.dueCount} pendentes
                                </span>
                              ) : (
                                <span className="text-xs text-green-400 font-medium">✓ Em dia</span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>
    );
  }

  // ── Sessão concluída ───────────────────────────────────────────────────────
  if (done) {
    const total = sessionStats.lembrei + sessionStats.dificil + sessionStats.naoLembrei;
    const acc = total > 0 ? Math.round((sessionStats.lembrei / total) * 100) : 0;
    const remaining = activeDeck.dueCount - total;
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto text-white">
        <button onClick={() => { setActiveDeck(null); void loadDecks(); }}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Todos os decks
        </button>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <Trophy className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-1">Sessão concluída!</h2>
          <p className="text-gray-400 text-sm mb-6">{activeDeck.name}</p>
          {remaining > 0 && (
            <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 mb-4">
              Sessão concluída! Restam ainda {remaining} cards para revisar — volte em breve.
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-2xl font-black text-green-400">{sessionStats.lembrei}</p>
              <p className="text-xs text-gray-500 mt-1">Lembrei</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-2xl font-black text-amber-400">{sessionStats.dificil}</p>
              <p className="text-xs text-gray-500 mt-1">Difícil</p>
            </div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-2xl font-black text-red-400">{sessionStats.naoLembrei}</p>
              <p className="text-xs text-gray-500 mt-1">Não lembrei</p>
            </div>
          </div>
          <p className={cn("text-3xl font-black mb-6",
            acc >= 70 ? "text-green-400" : acc >= 50 ? "text-yellow-400" : "text-red-400"
          )}>{acc}%</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setActiveDeck(null); void loadDecks(); }}
              className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white">
              Todos os decks
            </button>
            <button onClick={() => openDeck(activeDeck.id)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium">
              <RotateCcw className="w-4 h-4" /> Revisar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sessão de estudo ───────────────────────────────────────────────────────
  const card = sessionCards[cardIdx];
  if (!card) return null;

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto text-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setActiveDeck(null); void loadDecks(); }}
          className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-sm truncate">{activeDeck.name}</p>
          <p className="text-xs text-gray-500">{cardIdx + 1} / {sessionCards.length}</p>
        </div>
        <div className="relative">
          {xpFlash && (
            <div className="absolute -top-7 right-0 text-yellow-400 font-bold text-sm animate-bounce flex items-center gap-1">
              <Zap className="w-4 h-4" /> +1 XP
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${(cardIdx / sessionCards.length) * 100}%` }} />
      </div>

      {/* Due badge */}
      {card.dueNow && (
        <div className="mb-3 text-center">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
            ⏰ Revisão vencida
          </span>
        </div>
      )}

      {/* Flip card */}
      <FlipCard
        front={card.front}
        back={card.back}
        flipped={flipped}
        onFlip={() => setFlipped(f => !f)}
      />

      {/* Intervalo atual */}
      {card.interval && (
        <p className="text-center text-xs text-gray-600 mt-3">
          Intervalo atual: {card.interval} dia{card.interval !== 1 ? "s" : ""}
        </p>
      )}

      {/* Botões de qualidade (aparecem após virar) */}
      {flipped ? (
        <div className="mt-5 space-y-2">
          <p className="text-xs text-gray-500 text-center mb-2">Como foi?</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => handleQuality("nao-lembrei")}
              className="py-3 rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-bold hover:bg-red-600/30 transition-all">
              😕 Não lembrei
            </button>
            <button onClick={() => handleQuality("dificil")}
              className="py-3 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-600/30 transition-all">
              😐 Difícil
            </button>
            <button onClick={() => handleQuality("lembrei")}
              className="py-3 rounded-xl bg-green-600/20 border border-green-500/30 text-green-300 text-xs font-bold hover:bg-green-600/30 transition-all">
              😄 Lembrei!
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="mt-5 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          Revelar resposta <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
