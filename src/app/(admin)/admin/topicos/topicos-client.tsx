"use client";
import { useState, useMemo } from "react";
import { BookOpen, ChevronDown, ChevronRight, Plus, Pencil, Trash2, Hash, CheckCircle2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  slug: string;
  categoria: string | null;
}

interface Topic {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string | null;
  ordem: number;
  createdAt: string;
}

interface Props {
  subjects: Subject[];
  topics: Topic[];
  questoesPorTopico: Record<string, number>;
  questoesPorMateria: Record<string, number>;
}

// ─── Form de criação/edição de tópico ─────────────────────────────────────────
function TopicForm({
  subjectId,
  topic,
  onSave,
  onCancel,
}: {
  subjectId: string;
  topic?: Topic;
  onSave: (data: { name: string; slug: string; description: string; ordem: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(topic?.name ?? "");
  const [slug, setSlug] = useState(topic?.slug ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const [ordem, setOrdem] = useState(topic?.ordem ?? 1);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!topic);

  const toSlug = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (v: string) => {
    setName(v);
    if (autoSlug) setSlug(toSlug(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), slug: slug.trim(), description, ordem });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-white/10 bg-white/3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Nome do Tópico *</label>
          <input
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Ex: Lógica Proposicional"
            required
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={e => { setSlug(e.target.value); setAutoSlug(false); }}
            placeholder="logica-proposicional"
            required
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 font-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-1 block">Descrição (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Breve descrição do assunto..."
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Ordem</label>
          <input
            type="number"
            value={ordem}
            onChange={e => setOrdem(Number(e.target.value))}
            min={1}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          {saving ? "Salvando..." : topic ? "Salvar alterações" : "Criar tópico"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Linha de tópico ──────────────────────────────────────────────────────────
function TopicRow({
  topic,
  questoes,
  onEdit,
  onDelete,
}: {
  topic: Topic;
  questoes: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/2 group">
      <span className="w-6 text-center text-xs text-gray-600 font-mono">{topic.ordem}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-200">{topic.name}</span>
        {topic.description && (
          <span className="ml-2 text-xs text-gray-500">{topic.description}</span>
        )}
      </div>
      <span className="font-mono text-xs text-gray-600">{topic.slug}</span>
      <span className={cn(
        "text-xs px-2 py-0.5 rounded-full",
        questoes > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-gray-600"
      )}>
        {questoes} questões
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Grupo de matéria ─────────────────────────────────────────────────────────
function SubjectGroup({
  subject,
  topics,
  questoesPorTopico,
  questoesPorMateria,
  onTopicCreated,
  onTopicUpdated,
  onTopicDeleted,
}: {
  subject: Subject;
  topics: Topic[];
  questoesPorTopico: Record<string, number>;
  questoesPorMateria: Record<string, number>;
  onTopicCreated: (t: Topic) => void;
  onTopicUpdated: (t: Topic) => void;
  onTopicDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Total real de questões da matéria (incluindo sem tópico vinculado)
  const totalQ = questoesPorMateria[subject.id] ?? 0;
  // Quantas estão vinculadas a tópicos
  const qComTopico = topics.reduce((acc, t) => acc + (questoesPorTopico[t.id] ?? 0), 0);
  const qSemTopico = totalQ - qComTopico;

  const handleCreate = async (data: { name: string; slug: string; description: string; ordem: number }) => {
    const res = await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, subjectId: subject.id }),
    });
    if (res.ok) {
      const newTopic = await res.json();
      onTopicCreated(newTopic);
      setAdding(false);
    } else {
      const err = await res.json();
      alert("Erro ao criar: " + err.error);
    }
  };

  const handleUpdate = async (id: string, data: { name: string; slug: string; description: string; ordem: number }) => {
    const res = await fetch(`/api/admin/topics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      onTopicUpdated(updated);
      setEditingId(null);
    } else {
      const err = await res.json();
      alert("Erro ao atualizar: " + err.error);
    }
  };

  const handleDelete = async (id: string) => {
    const q = questoesPorTopico[id] ?? 0;
    if (!confirm(`Deletar tópico? ${q > 0 ? `⚠️ ${q} questões ficarão sem tópico.` : ""}`)) return;
    const res = await fetch(`/api/admin/topics/${id}`, { method: "DELETE" });
    if (res.ok) {
      onTopicDeleted(id);
    } else {
      alert("Erro ao deletar");
    }
  };

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden mb-3">
      {/* Header da matéria */}
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
        <BookOpen size={15} className="text-indigo-400" />
        <span className="text-sm font-medium text-gray-200 flex-1">{subject.name}</span>
        <span className="text-xs text-gray-500 font-mono mr-2">{subject.slug}</span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full mr-2",
          topics.length > 0 ? "bg-indigo-500/15 text-indigo-400" : "bg-white/5 text-gray-600"
        )}>
          {topics.length} tópicos
        </span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full",
          totalQ > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-gray-600"
        )}>
          {totalQ.toLocaleString("pt-BR")} questões
        </span>
        {qSemTopico > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 ml-1">
            {qSemTopico.toLocaleString("pt-BR")} sem tópico
          </span>
        )}
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div>
          {topics.length === 0 && !adding && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Nenhum tópico. Adicione o primeiro!
            </div>
          )}

          {[...topics].sort((a, b) => a.ordem - b.ordem).map(topic => (
            editingId === topic.id ? (
              <div key={topic.id} className="p-3 border-b border-white/5">
                <TopicForm
                  subjectId={subject.id}
                  topic={topic}
                  onSave={data => handleUpdate(topic.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <TopicRow
                key={topic.id}
                topic={topic}
                questoes={questoesPorTopico[topic.id] ?? 0}
                onEdit={() => { setEditingId(topic.id); setAdding(false); }}
                onDelete={() => handleDelete(topic.id)}
              />
            )
          ))}

          {adding && (
            <div className="p-3 border-t border-white/5">
              <TopicForm
                subjectId={subject.id}
                onSave={handleCreate}
                onCancel={() => setAdding(false)}
              />
            </div>
          )}

          <div className="px-4 py-2 border-t border-white/5">
            <button
              onClick={() => { setAdding(true); setEditingId(null); }}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={13} />
              Adicionar tópico
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function TopicosAdmin({ subjects, topics: initialTopics, questoesPorTopico, questoesPorMateria }: Props) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  // Categorias distintas
  const categorias = useMemo(() => {
    const cats = Array.from(new Set(subjects.map(s => s.categoria).filter(Boolean)));
    return cats.sort() as string[];
  }, [subjects]);

  // Filtra matérias
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      if (filterCat !== "all" && s.categoria !== filterCat) return false;
      if (search) {
        const q = search.toLowerCase();
        const subjectTopics = topics.filter(t => t.subjectId === s.id);
        const matchesSubject = s.name.toLowerCase().includes(q) || s.slug.includes(q);
        const matchesTopic = subjectTopics.some(t => t.name.toLowerCase().includes(q) || t.slug.includes(q));
        return matchesSubject || matchesTopic;
      }
      return true;
    });
  }, [subjects, topics, search, filterCat]);

  const getTopicsForSubject = (subjectId: string) =>
    topics.filter(t => t.subjectId === subjectId).sort((a, b) => a.ordem - b.ordem);

  const handleCreated = (t: Topic) => setTopics(prev => [...prev, t]);
  const handleUpdated = (t: Topic) => setTopics(prev => prev.map(p => p.id === t.id ? t : p));
  const handleDeleted = (id: string) => setTopics(prev => prev.filter(p => p.id !== id));

  const totalTopics = topics.length;
  const topicsComQuestoes = topics.filter(t => (questoesPorTopico[t.id] ?? 0) > 0).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total de Tópicos", value: totalTopics, color: "text-indigo-400" },
          { label: "Com Questões", value: topicsComQuestoes, color: "text-emerald-400" },
          { label: "Sem Questões", value: totalTopics - topicsComQuestoes, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar matéria ou tópico..."
            className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
        >
          <option value="all">Todas as categorias</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div>
        <div className="text-xs text-gray-500 mb-3">
          {filteredSubjects.length} matérias exibidas
        </div>
        {filteredSubjects.map(subject => (
          <SubjectGroup
            key={subject.id}
            subject={subject}
            topics={getTopicsForSubject(subject.id)}
            questoesPorTopico={questoesPorTopico}
            questoesPorMateria={questoesPorMateria}
            onTopicCreated={handleCreated}
            onTopicUpdated={handleUpdated}
            onTopicDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}
