import Link from "next/link";
import {
  Brain,
  Target,
  Layers,
  Check,
  Star,
  Shield,
  Zap,
  BookOpen,
  ArrowRight,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Clock,
  Repeat2,
  Calendar,
  Trophy,
} from "lucide-react";

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
  {
    num: "01",
    title: "Escolha seus mentores",
    desc: "Selecione 1 agente especialista no seu cargo (Policial, Tributário, Judiciário...) e 1 especialista na banca do seu concurso (CESPE, FGV...).",
    icon: Brain,
  },
  {
    num: "02",
    title: "Configure seu plano de estudos",
    desc: "O mentor conversa com você, entende seu cargo, órgão e data da prova. Se já saiu o edital, cole o conteúdo programático — a IA extrai as matérias automaticamente.",
    icon: Target,
  },
  {
    num: "03",
    title: "Estude com tudo integrado",
    desc: "Acesse questões, materiais e flashcards filtrados pela sua matéria. Tire dúvidas com seus mentores a qualquer hora, com contexto do seu concurso.",
    icon: Layers,
  },
];

const FAQ = [
  {
    q: "Preciso saber qual banca antes de assinar?",
    a: "Não. Você pode trocar ou adicionar agentes a qualquer momento dentro do seu plano. Se a banca do seu concurso mudar, é só atualizar.",
  },
  {
    q: "O que acontece se o edital ainda não saiu?",
    a: "Sem problema. O mentor sugere matérias com base em editais anteriores e no cargo pretendido. Quando sair o edital, você cola o conteúdo programático e o plano é atualizado automaticamente.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa e sem burocracia. Planos mensais cancelam no próximo ciclo. No Prova Marcada (pagamento único), o acesso fica ativo pelos 12 meses pagos.",
  },
  {
    q: "Quantas mensagens posso enviar por semana?",
    a: "No Focado: 60 mensagens/semana. No Aprovação: 150/semana. No Elite: ilimitadas. Para a maioria dos alunos, 60 por semana é mais do que suficiente.",
  },
  {
    q: "Os agentes realmente conhecem meu concurso?",
    a: "Sim. Cada agente tem treinamento especializado na área e no estilo da banca. Não é uma IA genérica — é um especialista no seu concurso.",
  },
];

const RECURSOS = [
  {
    icon: MessageSquare,
    title: "Chat com mentores IA",
    desc: "Tire dúvidas sobre qualquer conteúdo com agentes que conhecem seu cargo e sua banca. Contexto do seu concurso em cada resposta.",
  },
  {
    icon: Target,
    title: "Questões adaptativas SM-2",
    desc: "Pratique com questões filtradas pela matéria do seu edital. Algoritmo de repetição espaçada SM-2 para fixar o que você ainda não domina.",
  },
  {
    icon: Clock,
    title: "Simulados cronometrados",
    desc: "Simule a prova com questões no estilo da sua banca, dentro do tempo real. Resultado detalhado por matéria ao final.",
  },
  {
    icon: Repeat2,
    title: "Flashcards + revisão espaçada",
    desc: "Revise os pontos mais importantes com flashcards gerados pelo mentor. Sistema SM-2 prioriza o que você mais precisa revisar.",
  },
  {
    icon: Calendar,
    title: "Cronograma personalizado",
    desc: "A IA monta um cronograma semanal baseado na data da sua prova e nas matérias do edital. Ajusta conforme seu progresso.",
  },
  {
    icon: BarChart3,
    title: "Relatório de desempenho",
    desc: "Acompanhe sua evolução por matéria, taxa de acerto por banca e tempo médio de estudo. Dados para estudar com estratégia.",
  },
];

const TESTIMONIALS = [
  {
    name: "Rafaela Mendonça",
    cargo: "Candidata a Analista da Receita Federal",
    text: "Eu tentei estudar sozinha por dois anos e não saía do lugar. Com o AprovAI360 eu finalmente entendi por onde começar. O mentor tributário sabe exatamente quais matérias o CESPE cobra mais e me ajuda a montar um plano real, não genérico.",
    stars: 5,
  },
  {
    name: "Lucas Ferreira",
    cargo: "Candidato a Delegado da PC-BA",
    text: "O diferencial é a profundidade. Não é um chatbot que responde qualquer coisa — o Mentor Policial conhece o perfil da banca AOCP, as pegadinhas do Direito Penal e os temas que repetem nos editais. Minha taxa de acerto em questões subiu 30% em dois meses.",
    stars: 5,
  },
  {
    name: "Camila Rocha",
    cargo: "Candidata a Escrevente do TJ-SP",
    text: "Colei o edital do concurso e em segundos o mentor já tinha organizado tudo por matéria com prioridade. Ele ainda me lembra o que revisar antes da prova. Nunca estudei tão organizada na vida.",
    stars: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080c18]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo-full.svg" alt="AprovAI360" className="h-7" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#como-funciona" className="hover:text-white transition-colors">
              Como funciona
            </a>
            <a href="#mentores" className="hover:text-white transition-colors">
              Mentores
            </a>
            <a href="#planos" className="hover:text-white transition-colors">
              Planos
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="px-4 py-2 bg-[#0ab5bd] hover:bg-[#0ab5bd]/80 rounded-lg text-sm font-medium transition-colors text-white"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#0ab5bd]/8 blur-3xl animate-pulse pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#0ab5bd]/10 border border-[#0ab5bd]/20 text-[#0ab5bd] text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <span>✦</span>
            IA especializada por cargo e banca
          </div>

          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            Seu mentor de concurso{" "}
            <span className="text-[#0ab5bd]">conhece seu edital</span>{" "}
            de cor.
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Escolha o agente especialista no seu cargo e na sua banca.
            A IA monta seu plano de estudos, filtra o conteúdo pelo edital
            e responde suas dúvidas com contexto do seu concurso.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/cadastro"
              className="flex items-center gap-2 px-8 py-4 bg-[#0ab5bd] hover:bg-[#0ab5bd]/80 rounded-xl font-semibold text-lg transition-all hover:scale-105 text-white"
            >
              Montar meu plano
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#como-funciona"
              className="flex items-center gap-2 px-8 py-4 border border-white/10 hover:border-white/20 rounded-xl text-gray-300 hover:text-white transition-colors"
            >
              Ver como funciona
            </a>
          </div>

          <p className="text-gray-600 text-sm mt-5">Sem cartão de crédito para começar</p>

          {/* Bancas pills */}
          <div className="relative max-w-3xl mx-auto mt-10">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">
              Especialistas nas principais bancas
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {BANCAS.map((b) => (
                <span
                  key={b}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Mock UI card */}
        <div className="relative max-w-lg mx-auto mt-16">
          <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-5 text-left shadow-2xl">
            {/* Card header */}
            <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-white/5">
              <div className="w-8 h-8 rounded-full bg-[#0ab5bd]/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-[#0ab5bd]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Mentor CESPE</p>
                <p className="text-xs text-gray-500">Especialista em questões CESPE/Cebraspe</p>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            {/* User bubble */}
            <div className="flex justify-end mb-3">
              <div className="bg-[#0ab5bd]/15 border border-[#0ab5bd]/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-white">Quais matérias priorizar para o CESPE?</p>
              </div>
            </div>
            {/* Mentor bubble */}
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#0ab5bd]/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Brain className="w-3 h-3 text-[#0ab5bd]" />
              </div>
              <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
                <p className="text-sm text-gray-200 leading-relaxed">
                  Para o CESPE, foque em{" "}
                  <span className="text-[#0ab5bd] font-medium">Direito Constitucional</span> e{" "}
                  <span className="text-[#0ab5bd] font-medium">Português</span> — juntos correspondem a ~40% das questões. Eles adoram assertivas com{" "}
                  <span className="text-white font-medium">Certo/Errado</span> baseadas em jurisprudência recente. Quer que eu monte um cronograma?
                </p>
              </div>
            </div>
            {/* Typing indicator */}
            <div className="flex gap-1.5 mt-3 ml-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ab5bd]/60 animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ab5bd]/60 animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ab5bd]/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-10 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-black text-[#0ab5bd]">800+</p>
              <p className="text-xs text-gray-500 mt-1">Questões comentadas</p>
            </div>
            <div>
              <p className="text-3xl font-black text-[#0ab5bd]">8</p>
              <p className="text-xs text-gray-500 mt-1">Bancas especializadas</p>
            </div>
            <div>
              <p className="text-3xl font-black text-[#0ab5bd]">5 dias</p>
              <p className="text-xs text-gray-500 mt-1">Trial gratuito</p>
            </div>
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
                <div className="w-10 h-10 rounded-xl bg-[#0ab5bd]/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#0ab5bd]" />
                </div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mentores/Agentes */}
      <section id="mentores" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Um especialista para cada concurso</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Cada agente conhece o conteúdo programático, as pegadinhas e o perfil das questões da sua área.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {CATEGORIAS.map(({ icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-white/5 bg-white/3 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#0ab5bd]/30 hover:bg-[#0ab5bd]/5"
              >
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-semibold text-sm mb-0.5">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
          {/* Combination tip */}
          <div className="rounded-2xl bg-[#0ab5bd]/5 border border-[#0ab5bd]/20 p-6 text-center">
            <p className="text-[#0ab5bd] font-medium mb-1">
              Combine 1 agente de cargo + 1 agente de banca
            </p>
            <p className="text-gray-500 text-sm">
              Ex:{" "}
              <span className="text-gray-300">Mentor Policial</span> +{" "}
              <span className="text-gray-300">Especialista CESPE</span> = plano focado na Polícia Federal com estilo CESPE
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
          <div className="grid md:grid-cols-3 gap-5">
            {RECURSOS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3 p-5 rounded-xl border border-white/5 bg-white/3">
                <div className="w-10 h-10 rounded-xl bg-[#0ab5bd]/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#0ab5bd]" />
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

      {/* Planos */}
      <section id="planos" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Planos simples e transparentes</h2>
            <p className="text-gray-400">Preços anuais. Cancele quando quiser.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {[
              {
                name: "Focado",
                price: "R$ 34",
                agents: "2 agentes",
                msgs: "60 msgs/semana",
                popular: false,
                features: ["2 mentores IA", "60 mensagens/semana", "Questões comentadas", "Flashcards", "Trial 5 dias"],
              },
              {
                name: "Aprovação",
                price: "R$ 61",
                agents: "4 agentes",
                msgs: "150 msgs/semana",
                popular: true,
                features: ["4 mentores IA", "150 mensagens/semana", "Simulados cronometrados", "Cronograma IA", "Trial 5 dias"],
              },
              {
                name: "Elite",
                price: "R$ 99",
                agents: "Agentes ilimitados",
                msgs: "Msgs ilimitadas",
                popular: false,
                features: ["Mentores ilimitados", "Mensagens ilimitadas", "Relatório de desempenho", "Prioridade no suporte", "Trial 5 dias"],
              },
            ].map(({ name, price, agents, msgs, popular, features }) => (
              <div
                key={name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  popular
                    ? "border-[#0ab5bd] bg-[#0ab5bd]/5"
                    : "border-white/10 bg-white/3"
                }`}
              >
                {popular && (
                  <div className="text-xs font-bold text-[#0ab5bd] mb-3 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Mais popular
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1">{name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black">{price}</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <div
                  className={`rounded-lg p-2.5 text-center text-sm font-medium mb-4 ${
                    popular ? "bg-[#0ab5bd]/15 text-[#0ab5bd]" : "bg-[#0ab5bd]/10 text-[#0ab5bd]"
                  }`}
                >
                  {agents}
                </div>
                <p className="text-xs text-gray-500 text-center mb-5">{msgs}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                      <Check className="w-3.5 h-3.5 text-[#0ab5bd] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/cadastro"
                  className={`w-full py-2.5 rounded-xl text-sm font-medium text-center transition-colors ${
                    popular
                      ? "bg-[#0ab5bd] hover:bg-[#0ab5bd]/80 text-white"
                      : "bg-white/8 hover:bg-white/12 text-white border border-white/10"
                  }`}
                >
                  Começar agora
                </Link>
              </div>
            ))}
          </div>

          {/* Prova Marcada */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold">Prova Marcada — R$ 317 à vista</span>
                <span className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                  Pagamento único
                </span>
              </div>
              <p className="text-sm text-gray-400">
                2 agentes + 12 meses. Sem renovação. Equivale a R$ 26/mês — o mais barato de todos.
              </p>
            </div>
            <Link
              href="/cadastro"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
            >
              Quero esse <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-center text-gray-600 text-xs mt-5">
            <Link href="/planos" className="text-[#0ab5bd] hover:underline">
              Ver todos os planos →
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Perguntas frequentes</h2>
          </div>
          <style>{`
            details > summary { list-style: none; cursor: pointer; }
            details > summary::-webkit-details-marker { display: none; }
            details[open] summary .faq-chevron { transform: rotate(90deg); }
            .faq-chevron { transition: transform 0.2s ease; }
          `}</style>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="rounded-xl border border-white/5 bg-white/3 group">
                <summary className="p-5 flex items-center justify-between gap-3 select-none">
                  <span className="font-semibold text-sm">{q}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 faq-chevron" />
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">O que dizem nossos alunos</h2>
            <p className="text-gray-400">Candidatos reais, resultados reais</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, cargo, text, stars }) => (
              <div key={name} className="rounded-2xl border border-white/5 bg-white/3 p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed flex-1">&ldquo;{text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm text-white">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cargo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl bg-gradient-to-br from-[#0ab5bd]/15 to-[#0ab5bd]/5 border border-[#0ab5bd]/20 p-12">
            <h2 className="text-3xl font-bold mb-4">Pronto para estudar com IA?</h2>
            <p className="text-gray-400 mb-8">Monte seu plano de estudos personalizado em minutos. Grátis por 5 dias.</p>
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0ab5bd] hover:bg-[#0ab5bd]/80 rounded-xl font-semibold text-lg transition-all hover:scale-105 text-white"
            >
              Começar grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-gray-600 text-sm mt-4">Sem cartão de crédito para começar</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/logo-full.svg" alt="AprovAI360" className="h-6" />
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <Link href="/planos" className="hover:text-white transition-colors">
              Planos
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Entrar
            </Link>
          </div>
          <p className="text-xs text-gray-600">© 2026 AprovAI360 Tecnologia Ltda.</p>
        </div>
      </footer>
    </div>
  );
}
