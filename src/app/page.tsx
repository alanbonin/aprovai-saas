import Link from "next/link";
import { Trophy, Brain, Target, Layers, Check, ChevronRight, Star, Shield, Zap, BookOpen, ArrowRight } from "lucide-react";

const CATEGORIAS = [
  { icon: "🚔", label: "Policial", desc: "PF, PC, PM, PRF, Penal" },
  { icon: "🏛️", label: "Tributário", desc: "Receita Federal, SEFAZ, Auditor" },
  { icon: "⚖️", label: "Judiciário", desc: "TJ, TRF, TST, Escrevente" },
  { icon: "📋", label: "Ministério Público", desc: "MP Federal e Estadual" },
  { icon: "📜", label: "Procuradoria", desc: "AGU, PGE, PGM" },
  { icon: "📡", label: "Agências Reguladoras", desc: "ANATEL, ANVISA, ANS, ANEEL" },
  { icon: "🏦", label: "Banco Central", desc: "BCB, Analista e Técnico" },
  { icon: "🗂️", label: "Gestão Pública", desc: "Ministérios, Prefeituras" },
];

const BANCAS = ["CESPE", "FGV", "VUNESP", "FCC", "IBFC", "AOCP", "CESGRANRIO", "ESAF"];

const STEPS = [
  { num: "01", title: "Escolha seus mentores", desc: "Selecione 1 agente especialista no seu cargo (Policial, Tributário, Judiciário...) e 1 especialista na banca do seu concurso (CESPE, FGV...).", icon: Brain },
  { num: "02", title: "Configure seu plano de estudos", desc: "O mentor conversa com você, entende seu cargo, órgão e data da prova. Se já saiu o edital, cole o conteúdo programático — a IA extrai as matérias automaticamente.", icon: Target },
  { num: "03", title: "Estude com tudo integrado", desc: "Acesse questões, materiais e flashcards filtrados pela sua matéria. Tire dúvidas com seus mentores a qualquer hora, com contexto do seu concurso.", icon: Layers },
];

const FAQ = [
  { q: "Preciso saber qual banca antes de assinar?", a: "Não. Você pode trocar ou adicionar agentes a qualquer momento dentro do seu plano. Se a banca do seu concurso mudar, é só atualizar." },
  { q: "O que acontece se o edital ainda não saiu?", a: "Sem problema. O mentor sugere matérias com base em editais anteriores e no cargo pretendido. Quando sair o edital, você cola o conteúdo programático e o plano é atualizado automaticamente." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem multa e sem burocracia. Planos mensais cancelam no próximo ciclo. No Prova Marcada (pagamento único), o acesso fica ativo pelos 12 meses pagos." },
  { q: "Quantas mensagens posso enviar por semana?", a: "No Focado: 60 mensagens/semana. No Aprovação: 150/semana. No Elite: ilimitadas. Para a maioria dos alunos, 60 por semana é mais do que suficiente." },
  { q: "Os agentes realmente conhecem meu concurso?", a: "Sim. Cada agente tem treinamento especializado na área e no estilo da banca. Não é uma IA genérica — é um especialista no seu concurso." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080c18]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Aprovai</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#agentes" className="hover:text-white transition-colors">Agentes</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Entrar</Link>
            <Link href="/cadastro" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3 h-3" />
            IA especializada por cargo e banca
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            Seu mentor de concurso{" "}
            <span className="text-indigo-400">conhece seu edital</span>{" "}
            de cor.
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Escolha o agente especialista no seu cargo e na sua banca.
            A IA monta seu plano de estudos, filtra o conteúdo pelo edital
            e responde suas dúvidas com contexto do seu concurso.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/cadastro" className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-lg transition-all hover:scale-105">
              Montar meu plano de estudos
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#como-funciona" className="flex items-center gap-2 px-8 py-4 border border-white/10 hover:border-white/20 rounded-xl text-gray-300 hover:text-white transition-colors">
              Ver como funciona
            </a>
          </div>
          <p className="text-gray-600 text-sm mt-5">Sem cartão de crédito para começar</p>
        </div>
        <div className="relative max-w-3xl mx-auto mt-16">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">Especialistas nas principais bancas</p>
          <div className="flex flex-wrap justify-center gap-2">
            {BANCAS.map(b => (
              <span key={b} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Como funciona</h2>
            <p className="text-gray-400">Três passos para ter um plano de estudos personalizado</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc, icon: Icon }) => (
              <div key={num}>
                <div className="text-5xl font-black text-white/5 mb-4 leading-none">{num}</div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agentes */}
      <section id="agentes" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Um especialista para cada concurso</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Cada agente conhece o conteúdo programático, as pegadinhas e o perfil das questões da sua área.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {CATEGORIAS.map(({ icon, label, desc }) => (
              <div key={label} className="rounded-xl border border-white/5 bg-white/3 p-4 hover:border-indigo-500/30 hover:bg-indigo-600/5 transition-all">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-semibold text-sm mb-0.5">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-indigo-600/5 border border-indigo-500/20 p-6 text-center">
            <p className="text-indigo-300 font-medium mb-1">Combine 1 agente de cargo + 1 agente de banca</p>
            <p className="text-gray-500 text-sm">
              Ex: <span className="text-gray-300">Mentor Policial</span> + <span className="text-gray-300">Especialista CESPE</span> = plano focado na Polícia Federal com estilo CESPE
            </p>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Tudo que você precisa em um lugar</h2>
            <p className="text-gray-400">Conteúdo organizado pela matéria do seu edital</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: Brain, title: "Chat com mentores IA", desc: "Tire dúvidas sobre qualquer conteúdo com agentes que conhecem seu cargo e sua banca. Contexto do seu concurso em cada resposta." },
              { icon: Target, title: "Questões por matéria", desc: "Pratique com questões filtradas pela matéria que você está estudando. Gabarito, explicação e repetição espaçada automática." },
              { icon: BookOpen, title: "Materiais do edital", desc: "PDFs, apostilas e links organizados por matéria. Tudo alinhado com o conteúdo programático do seu concurso." },
              { icon: Layers, title: "Flashcards para revisar", desc: "Revise os pontos mais importantes com flashcards por matéria. Sistema de repetição espaçada para fixar o conteúdo." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-xl border border-white/5 bg-white/3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos resumo */}
      <section id="planos" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Planos simples e transparentes</h2>
            <p className="text-gray-400">Preços anuais. Cancele quando quiser.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {[
              { name: "Focado", price: "R$ 34", agents: "2 agentes", msgs: "60 msgs/semana", popular: false },
              { name: "Aprovação", price: "R$ 61", agents: "4 agentes", msgs: "150 msgs/semana", popular: true },
              { name: "Elite", price: "R$ 99", agents: "Ilimitados", msgs: "Msgs ilimitadas", popular: false },
            ].map(({ name, price, agents, msgs, popular }) => (
              <div key={name} className={`rounded-2xl border p-6 flex flex-col ${popular ? "border-orange-500 bg-orange-500/5" : "border-white/10 bg-white/3"}`}>
                {popular && <div className="text-xs font-bold text-orange-400 mb-3 flex items-center gap-1"><Star className="w-3 h-3" /> Mais popular</div>}
                <h3 className="text-lg font-bold mb-1">{name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black">{price}</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <div className={`rounded-lg p-2.5 text-center text-sm font-medium mb-4 ${popular ? "bg-orange-500/10 text-orange-400" : "bg-indigo-600/10 text-indigo-400"}`}>
                  {agents}
                </div>
                <p className="text-xs text-gray-500 text-center mb-5">{msgs}</p>
                <Link href="/cadastro" className={`w-full py-2.5 rounded-xl text-sm font-medium text-center transition-colors ${popular ? "bg-orange-500 hover:bg-orange-400 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}>
                  Começar agora
                </Link>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold">Prova Marcada — R$ 317 à vista</span>
                <span className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Pagamento único</span>
              </div>
              <p className="text-sm text-gray-400">2 agentes + 12 meses. Sem renovação. Equivale a R$ 26/mês — o mais barato de todos.</p>
            </div>
            <Link href="/cadastro" className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium whitespace-nowrap transition-colors">
              Quero esse <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-center text-gray-600 text-xs mt-5">
            <Link href="/planos" className="text-indigo-400 hover:underline">Ver comparação completa dos planos →</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Perguntas frequentes</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/5 bg-white/3 p-5">
                <p className="font-semibold mb-2 text-sm">{q}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl bg-indigo-600/10 border border-indigo-500/20 p-12">
            <h2 className="text-3xl font-bold mb-4">Pronto para estudar com um mentor que conhece seu concurso?</h2>
            <p className="text-gray-400 mb-8">Monte seu plano de estudos personalizado em minutos.</p>
            <Link href="/cadastro" className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-lg transition-all hover:scale-105">
              Começar agora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-gray-600 text-sm mt-4">Sem cartão de crédito para começar</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold">Aprovai</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link href="/planos" className="hover:text-white transition-colors">Planos</Link>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <p className="text-xs text-gray-600">© 2026 Aprovai. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
