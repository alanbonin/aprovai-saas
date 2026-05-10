"use client";
import { useState, useEffect } from "react";
import { Check, Plus, X, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject { id: string; name: string; slug: string; description?: string; }
interface Profile { cargo: string | null; orgao: string | null; }

interface Props {
  userId: string;
  profile: Profile;
  onConfirm: (subjects: Subject[]) => void;
}

export function SubjectSelector({ userId, profile, onConfirm }: Props) {
  const [suggested, setSuggested] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/materias")
      .then(r => r.json())
      .then(d => {
        setSuggested(d.subjects ?? []);
        setSelected((d.subjects ?? []).map((s: Subject) => s.id));
        setLoading(false);
      });
  }, []);

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  async function confirm() {
    setSaving(true);
    const res = await fetch("/api/workspace/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectIds: selected }),
    });
    const data = await res.json();
    onConfirm(data.subjects ?? suggested.filter(s => selected.includes(s.id)));
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-400">Montando seu plano de estudos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-4">
          <BookOpen className="w-6 h-6 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Seu plano de estudos</h1>
        <p className="text-gray-400">
          {profile.cargo
            ? `Com base no cargo de <strong>${profile.cargo}</strong>, selecionei as matérias mais importantes para você.`
            : "Selecione as matérias que quer estudar."
          } Ajuste como quiser.
        </p>
      </div>

      {suggested.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-white/3 border border-white/5">
          <BookOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma matéria encontrada</p>
          <p className="text-gray-600 text-sm mt-1">O admin ainda não cadastrou matérias para essa categoria.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {suggested.map(subject => {
            const isSelected = selected.includes(subject.id);
            return (
              <button
                key={subject.id}
                onClick={() => toggle(subject.id)}
                className={cn(
                  "w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-all",
                  isSelected
                    ? "border-indigo-500/50 bg-indigo-600/10"
                    : "border-white/5 bg-white/3 hover:bg-white/5"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                  isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-600"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{subject.name}</p>
                  {subject.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{subject.description}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{selected.length} matéria{selected.length !== 1 ? "s" : ""} selecionada{selected.length !== 1 ? "s" : ""}</p>
        <button
          onClick={confirm}
          disabled={saving || selected.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Confirmar plano
        </button>
      </div>
    </div>
  );
}
