'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import './landing.css';

const Hero3D = dynamic(() => import('./hero-3d'), { ssr: false });

/* ────────────────────────────────────────────────────────
   REVEAL on scroll
   ──────────────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`lc-reveal ${shown ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   PARALLAX scroll hook
   Cada elemento com [data-px] se move a (scrollY × speed)px.
   Velocidade positiva → desce com o scroll (fundo profundo).
   Velocidade negativa → sobe mais rápido (elementos próximos).
   ──────────────────────────────────────────────────────── */
function useParallaxScroll() {
  useEffect(() => {
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const sy = window.scrollY;
        document.querySelectorAll<HTMLElement>('[data-px]').forEach(el => {
          const speed = parseFloat(el.dataset.px ?? '0');
          el.style.transform = `translateY(${sy * speed}px)`;
        });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);
}

/* ────────────────────────────────────────────────────────
   3D tilt hook
   ──────────────────────────────────────────────────────── */
function useTilt(intensity = 6) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf: number;
    const target = { rx: 0, ry: 0 };
    const current = { rx: 0, ry: 0 };
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      target.ry = (x - 0.5) * intensity;
      target.rx = (y - 0.5) * -intensity;
    };
    const onLeave = () => { target.rx = 0; target.ry = 0; };
    const loop = () => {
      current.rx += (target.rx - current.rx) * 0.1;
      current.ry += (target.ry - current.ry) * 0.1;
      el.style.transform = `perspective(1400px) rotateX(${current.rx}deg) rotateY(${current.ry}deg)`;
      raf = requestAnimationFrame(loop);
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [intensity]);
  return ref;
}

/* ════════════════════════════════════════════════════════
   NAV
   ════════════════════════════════════════════════════════ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <nav className={`lc-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lc-wrap lc-nav-inner">
        <a href="/" className="lc-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="AprovAI360" className="lc-logo-mark" style={{ background: 'transparent', boxShadow: 'none', borderRadius: 0 }} />
          <div className="lc-logo-text">
            Aprov<span>AI</span>360
          </div>
        </a>
        <div className="lc-nav-links">
          <a href="#como-funciona">Como funciona</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#demo">Plataforma</a>
          <a href="#precos">Preços</a>
          <a href="#faq">FAQ</a>
          <div className="lc-nav-sep" />
          <Link href="/instalar" className="lc-nav-pill">📲 Instalar app</Link>
          <Link href="/suporte" className="lc-nav-pill">Suporte</Link>
        </div>
        <div className="lc-nav-cta">
          <Link href="/login" className="lc-btn lc-btn-ghost" style={{ padding: '10px 16px', fontSize: 14 }}>
            Entrar
          </Link>
          <Link href="/cadastro" className="lc-btn lc-btn-primary" style={{ padding: '10px 18px', fontSize: 14 }}>
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ════════════════════════════════════════════════════════
   HERO — ATO 1: O CHAMADO
   ════════════════════════════════════════════════════════ */
function Hero() {
  useParallaxScroll();
  return (
    <section className="lc-hero">
      {/* 3D canvas como atmosfera de fundo — parallax lento, camada mais profunda */}
      <div className="lc-hero-canvas" data-px="0.32">
        <Hero3D />
      </div>

      {/* Overlay escuro — se move levemente com o canvas */}
      <div className="lc-hero-overlay" aria-hidden data-px="0.16" />

      {/* Chip esquerdo — aprovação — flutua para cima (camada frontal) */}
      <div className="lc-chip lc-chip-a" aria-hidden data-px="-0.14">
        <div className="lc-chip-icon" style={{ background: 'rgba(0,255,163,0.1)', border: '1px solid rgba(0,255,163,0.2)' }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3 3 7-7" stroke="#00ffa3" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <small>Redação corrigida</small>
          <strong>920 / 1000</strong>
        </div>
      </div>

      {/* Chip superior direito — trilha */}
      <div className="lc-chip lc-chip-b" aria-hidden data-px="-0.18">
        <div className="lc-chip-icon" style={{ background: 'rgba(10,181,189,0.1)', border: '1px solid rgba(10,181,189,0.2)' }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M2 12V4l5 4 5-4v8" stroke="#0ab5bd" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <small>Trilha de hoje</small>
          <strong>2h 40min · 38 questões</strong>
        </div>
      </div>

      {/* Chip inferior direito — domínio */}
      <div className="lc-chip lc-chip-c" aria-hidden data-px="-0.10">
        <div className="lc-chip-icon" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5l2-5z" fill="#f59e0b" />
          </svg>
        </div>
        <div>
          <small>Domínio da matéria</small>
          <strong>62% · subindo ↑</strong>
        </div>
      </div>

      {/* Conteúdo central */}
      <div className="lc-hero-body">
        <Reveal>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
            {[
              { label: 'Concurso Público', icon: '🏛️', color: '#6366f1' },
              { label: 'OAB', icon: '⚖️', color: '#f59e0b' },
              { label: 'ENEM', icon: '📋', color: '#8b5cf6' },
            ].map(m => (
              <div key={m.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 999,
                border: `1px solid ${m.color}40`,
                background: `${m.color}15`,
                fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                color: m.color,
              }}>
                <span>{m.icon}</span> {m.label}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="lc-hero-title">
            A <span className="lc-hero-title-teal">IA</span><br />
            QUE APROVA
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="lc-hero-sub-title">VOCÊ.</p>
        </Reveal>

        <Reveal delay={260}>
          <p className="lc-hero-desc">
            Sem horas de PDF. Sem cursinho caro. Você responde questões,
            a IA identifica seus gaps e entrega o conteúdo exato que vai cair na sua prova.
          </p>
        </Reveal>

        <Reveal delay={360}>
          <div className="lc-hero-ctas">
            <Link href="/cadastro" className="lc-btn lc-btn-primary" style={{ padding: '16px 36px', fontSize: 16 }}>
              Começar grátis — 7 dias →
            </Link>
            <a href="#como-funciona" className="lc-btn lc-btn-ghost" style={{ padding: '16px 28px', fontSize: 16 }}>
              Ver como funciona ↓
            </a>
          </div>
        </Reveal>

        <Reveal delay={480}>
          <div className="lc-hero-meta">
            <span>✓ Sem cartão de crédito</span>
            <div className="lc-hero-meta-sep" />
            <span>✓ Cancele quando quiser</span>
            <div className="lc-hero-meta-sep" />
            <span>✓ Setup em 2 minutos</span>
          </div>
        </Reveal>
      </div>

      {/* Scroll hint */}
      <div className="lc-scroll-hint" aria-hidden>
        <div className="lc-scroll-hint-line" />
        <span>scroll</span>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   STATS STRIP
   ════════════════════════════════════════════════════════ */
function StatsStrip() {
  const stats = [
    { num: '325.000', suf: '+', label: 'Questões reais de provas anteriores' },
    { num: '1.100',   suf: '+', label: 'Tópicos mapeados por banca e edital' },
    { num: '30',      suf: 's', label: 'Para corrigir sua redação com IA' },
    { num: '7',       suf: 'd', label: 'Grátis — sem cartão de crédito' },
  ];
  return (
    <section className="lc-stats">
      <div className="lc-wrap">
        <div className="lc-stats-grid">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 80} className="lc-stat">
              <div className="lc-stat-num">
                {s.num}<span>{s.suf}</span>
              </div>
              <div className="lc-stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   COMO FUNCIONA — ATO 2: O MENTOR
   ════════════════════════════════════════════════════════ */
function ComoFunciona() {
  const steps = [
    {
      num: '01',
      icon: '🎯',
      title: 'Você informa sua prova.',
      body: 'Cargo, banca, data, edital — ou só a modalidade. A IA extrai tudo que precisa saber sobre o que cai, o peso de cada matéria e o estilo da banca. Em 60 segundos, o plano está pronto.',
    },
    {
      num: '02',
      icon: '🧠',
      title: 'A IA monta seu cronograma.',
      body: 'Com base na curva de esquecimento, no edital e nas suas horas disponíveis, a AprovAI360 distribui as matérias dia a dia. Você abre o app e já sabe exatamente o que estudar hoje.',
    },
    {
      num: '03',
      icon: '⚡',
      title: 'Você estuda. A IA ajusta.',
      body: 'Cada questão respondida, cada redação corrigida, cada flashcard revisado alimenta o modelo. O cronograma se adapta ao seu ritmo — mais tempo nas fraquezas, menos no que você já domina.',
    },
  ];
  return (
    <section className="lc-section lc-dotgrid-bg" id="como-funciona">
      <div className="lc-wrap">
        <div className="lc-como-grid">
          <Reveal style={{ position: 'sticky', top: 100 }}>
            <div className="lc-section-eyebrow">Como funciona</div>
            <h2 className="lc-section-title">
              TRÊS<br />PASSOS.<br /><em>UMA</em><br />APROVAÇÃO.
            </h2>
            <p className="lc-section-desc">
              A IA é o mentor que conhece sua banca, monta seu cronograma e
              acompanha cada hora de estudo — sem achismo, sem desperdício.
            </p>
          </Reveal>

          <div className="lc-steps">
            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 140}>
                <div className="lc-step">
                  <div className="lc-step-bullet">
                    <span className="lc-step-num">{step.num}</span>
                  </div>
                  <span className="lc-step-deco">{step.num}</span>
                  <span className="lc-step-icon">{step.icon}</span>
                  <h3 className="lc-step-title">{step.title}</h3>
                  <p className="lc-step-body">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   ESTUDO REVERSO — a metodologia central
   ════════════════════════════════════════════════════════ */

const ESTUDO_REVERSO_FRAMES = [
  {
    id: 'question',
    step: '01',
    label: 'A questão aparece primeiro',
    sub: 'Você enfrenta a questão sem ter lido o assunto antes.',
    color: '#6366f1',
    screenContent: (
      <div className="er-screen-q">
        <div className="er-q-badge">Direito Constitucional · CESPE</div>
        <p className="er-q-text">
          Segundo o STF, a imunidade parlamentar material abrange manifestações
          proferidas fora do mandato?
        </p>
        <div className="er-q-opts">
          <div className="er-opt er-opt-a">A&nbsp;&nbsp;Sim, desde que conexas ao exercício futuro</div>
          <div className="er-opt er-opt-b">B&nbsp;&nbsp;Não, somente durante o mandato vigente</div>
          <div className="er-opt er-opt-c">C&nbsp;&nbsp;Sim, abrange qualquer manifestação pública</div>
          <div className="er-opt er-opt-d">D&nbsp;&nbsp;Depende da natureza do cargo</div>
        </div>
      </div>
    ),
  },
  {
    id: 'wrong',
    step: '02',
    label: 'Erra → IA identifica o gap',
    sub: 'O erro mostra exatamente onde está a lacuna. Sem adivinhar.',
    color: '#f59e0b',
    screenContent: (
      <div className="er-screen-wrong">
        <div className="er-wrong-header">
          <span className="er-wrong-badge">✕ Resposta incorreta</span>
          <span className="er-wrong-correct">Correta: B</span>
        </div>
        <div className="er-ai-box">
          <div className="er-ai-label">✦ IA identificou</div>
          <p className="er-ai-text">
            Você não domina <strong>imunidade parlamentar material × formal</strong>.
            A imunidade material (art. 53 CF) é restrita ao mandato em curso.
          </p>
          <div className="er-ai-tags">
            <span>Art. 53 CF/88</span>
            <span>STF RE 600.063</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'learn',
    step: '03',
    label: 'Conteúdo cirúrgico — só o que faltava',
    sub: 'Nenhum vídeo de 3h. Somente o ponto exato do erro, com jurisprudência.',
    color: '#0ab5bd',
    screenContent: (
      <div className="er-screen-learn">
        <div className="er-learn-chip">📖 Revisão direcionada · 4 min</div>
        <h4 className="er-learn-title">Imunidade Material (Art. 53 CF)</h4>
        <ul className="er-learn-list">
          <li>✓ Protege opiniões, palavras e votos <em>durante</em> o mandato</li>
          <li>✓ Não abrange período pré ou pós-mandato</li>
          <li>✓ RE 600.063: conexão com mandato deve ser direta</li>
        </ul>
        <div className="er-learn-bar">
          <div className="er-learn-fill" />
        </div>
        <span className="er-learn-pct">Domínio: 34% → subindo</span>
      </div>
    ),
  },
  {
    id: 'correct',
    step: '04',
    label: 'Acerta — e o domínio sobe',
    sub: 'A IA reforça o ponto na hora certa para fixar na memória de longo prazo.',
    color: '#00d97e',
    screenContent: (
      <div className="er-screen-correct">
        <div className="er-correct-badge">✓ Resposta correta!</div>
        <div className="er-correct-line">
          <span>Domínio do tópico</span>
          <span className="er-correct-pct">68%</span>
        </div>
        <div className="er-correct-bar">
          <div className="er-correct-fill" />
        </div>
        <div className="er-correct-msg">
          <span className="er-sparkle">✦</span>
          Este tópico entra na revisão espaçada em <strong>3 dias</strong>
        </div>
      </div>
    ),
  },
];

function EstudoReverso() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % ESTUDO_REVERSO_FRAMES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const frame = ESTUDO_REVERSO_FRAMES[active];

  return (
    <section className="lc-section lc-rev-section" id="estudo-reverso">
      <div className="lc-wrap">

        {/* Cabeçalho */}
        <Reveal style={{ textAlign: 'center', marginBottom: 72 }}>
          <div className="lc-section-eyebrow">Metodologia</div>
          <h2 className="lc-section-title">
            ESTUDO<br /><em>REVERSO.</em>
          </h2>
          <p className="lc-section-desc" style={{ margin: '20px auto 0', maxWidth: 600, textAlign: 'center' }}>
            A ciência mostra que praticar antes de estudar fixa 3× mais do que ler primeiro e testar depois.
            Na AprovAI360 você enfrenta as questões primeiro — e a IA usa seus erros para montar o conteúdo exato que falta.
          </p>
        </Reveal>

        {/* Comparativo */}
        <div className="lc-rev-compare">
          <Reveal className="lc-rev-method lc-rev-old">
            <div className="lc-rev-method-label">Estudo tradicional</div>
            <div className="lc-rev-flow">
              <div className="lc-rev-node lc-rev-node-gray">Lê teoria</div>
              <div className="lc-rev-arrow">→</div>
              <div className="lc-rev-node lc-rev-node-gray">Memoriza</div>
              <div className="lc-rev-arrow">→</div>
              <div className="lc-rev-node lc-rev-node-gray">Faz questões</div>
              <div className="lc-rev-arrow">→</div>
              <div className="lc-rev-node lc-rev-node-gray">Esquece</div>
            </div>
            <p className="lc-rev-method-note">Taxa de retenção média: <strong>~20%</strong> após 7 dias</p>
          </Reveal>

          <div className="lc-rev-vs">VS</div>

          <Reveal delay={120} className="lc-rev-method lc-rev-new">
            <div className="lc-rev-method-label lc-rev-method-label-teal">Estudo Reverso <span>✦ AprovAI360</span></div>
            <div className="lc-rev-flow">
              <div className="lc-rev-node lc-rev-node-teal">Enfrenta questão</div>
              <div className="lc-rev-arrow lc-rev-arrow-teal">→</div>
              <div className="lc-rev-node lc-rev-node-teal">IA mapeia gap</div>
              <div className="lc-rev-arrow lc-rev-arrow-teal">→</div>
              <div className="lc-rev-node lc-rev-node-teal">Conteúdo cirúrgico</div>
              <div className="lc-rev-arrow lc-rev-arrow-teal">→</div>
              <div className="lc-rev-node lc-rev-node-teal">Reforço na hora certa</div>
            </div>
            <p className="lc-rev-method-note">Taxa de retenção média: <strong style={{ color: 'var(--teal)' }}>~70%</strong> após 7 dias</p>
          </Reveal>
        </div>

        {/* Demo animado — o "vídeo" */}
        <div className="lc-rev-demo">
          {/* Painel de steps */}
          <Reveal className="lc-rev-steps-panel">
            <div className="lc-rev-steps-label">Como funciona na prática</div>
            {ESTUDO_REVERSO_FRAMES.map((f, i) => (
              <button
                key={f.id}
                className={`lc-rev-step-btn ${active === i ? 'active' : ''}`}
                style={{ '--rev-color': f.color } as React.CSSProperties}
                onClick={() => setActive(i)}
              >
                <span className="lc-rev-step-num">{f.step}</span>
                <div>
                  <div className="lc-rev-step-title">{f.label}</div>
                  <div className="lc-rev-step-sub">{f.sub}</div>
                </div>
              </button>
            ))}

            {/* Barra de progresso auto */}
            <div className="lc-rev-progress-track">
              <div
                className="lc-rev-progress-fill"
                style={{ width: `${((active + 1) / ESTUDO_REVERSO_FRAMES.length) * 100}%` }}
              />
            </div>
          </Reveal>

          {/* Tela animada */}
          <Reveal delay={100} className="lc-rev-screen-wrap">
            <div className="lc-rev-screen-chrome">
              <div className="lc-rev-screen-bar">
                <div className="lc-rev-screen-dots">
                  <span /><span /><span />
                </div>
                <div className="lc-rev-screen-url">app.aprovai360.com.br</div>
              </div>
              <div className="lc-rev-screen-body">
                <div
                  key={frame.id}
                  className="lc-rev-frame"
                  style={{ '--rev-color': frame.color } as React.CSSProperties}
                >
                  {frame.screenContent}
                </div>
              </div>
            </div>
          </Reveal>
        </div>

      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   MODALIDADES — ATO 3: O CAMPO DE BATALHA
   ════════════════════════════════════════════════════════ */
function Modalidades() {
  const mods = [
    {
      icon: '🏛️',
      name: 'Concurso Público',
      color: '#6366f1',
      desc: 'Do edital à aprovação. IA que conhece cada banca, cada cargo e o peso real de cada matéria. Simulados no estilo exato da sua prova.',
      tags: ['CESPE', 'FGV', 'FCC', 'VUNESP', 'IBFC', 'CEBRASPE'],
    },
    {
      icon: '⚖️',
      name: 'OAB',
      color: '#f59e0b',
      desc: 'Simulado oficial 80 questões / 5h com threshold de 50%. Correção de peças processuais com feedback por competência em 30 segundos.',
      tags: ['1ª Fase', '2ª Fase', 'FGV', 'Peças processuais'],
    },
    {
      icon: '📋',
      name: 'ENEM',
      color: '#8b5cf6',
      desc: 'Plano por área de conhecimento, treino de redação nas 5 competências e estratégia TRI. Do básico ao Redação Nota 1000.',
      tags: ['4 Áreas', 'Redação TRI', 'SISU', 'ProUni'],
    },
  ];

  return (
    <section className="lc-mods-section" id="modalidades">
      <div className="lc-wrap">
        <Reveal>
          <div className="lc-section-eyebrow">Para quem é</div>
          <h2 className="lc-section-title" style={{ maxWidth: 640 }}>
            UMA PLATAFORMA.<br /><em>3 MODALIDADES.</em>
          </h2>
          <p className="lc-section-desc" style={{ marginTop: 16 }}>
            Cada fluxo é adaptado às regras, bancas e matérias da sua prova.
            Você não precisa adaptar seu estudo à plataforma — ela se adapta a você.
          </p>
        </Reveal>

        <div className="lc-mods-grid">
          {mods.map((m, i) => (
            <Reveal key={m.name} delay={i * 120}>
              <div
                className="lc-mod-card"
                style={{ '--mod-color': m.color } as React.CSSProperties}
              >
                <div className="lc-mod-icon-wrap">
                  {m.icon}
                </div>
                <h3 className="lc-mod-name">{m.name}</h3>
                <p className="lc-mod-desc">{m.desc}</p>
                <div className="lc-mod-tags">
                  {m.tags.map(t => (
                    <span
                      key={t}
                      className="lc-mod-tag"
                      style={{
                        background: m.color + '18',
                        color: m.color,
                        border: `1px solid ${m.color}30`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   ARSENAL — tudo que o sistema oferece
   ════════════════════════════════════════════════════════ */
const ARSENAL = [
  {
    id: 'mentor',
    icon: '🧠',
    title: 'Mentor IA por modalidade',
    desc: 'Um mentor especializado em Concurso, OAB ou ENEM. Conhece sua banca, seu edital e aprende com cada resposta sua.',
    size: 'large',
    accent: '#0ab5bd',
  },
  {
    id: 'cronograma',
    icon: '📅',
    title: 'Cronograma adaptativo',
    desc: 'Plano de estudos gerado em 60 segundos com base no edital real, na curva de esquecimento e nas suas horas disponíveis.',
    size: 'large',
    accent: '#6366f1',
  },
  {
    id: 'reverso',
    icon: '⚡',
    title: 'Estudo reverso por questões',
    desc: 'Enfrenta a questão primeiro. A IA mapeia o gap e entrega só o conteúdo que falta.',
    size: 'medium',
    accent: '#f59e0b',
  },
  {
    id: 'redacao',
    icon: '📝',
    title: 'Correção de redação em 30s',
    desc: 'Feedback por competência (ENEM 5 comp. ou critérios das bancas) com nota e sugestão de reescrita.',
    size: 'medium',
    accent: '#8b5cf6',
  },
  {
    id: 'simulado',
    icon: '🎯',
    title: 'Simulados no estilo da banca',
    desc: 'Simulados com questões das provas anteriores no formato exato da sua banca. Com gabarito comentado pela IA.',
    size: 'medium',
    accent: '#0ab5bd',
  },
  {
    id: 'arena',
    icon: '⚔️',
    title: 'Prova em Prática — Arena',
    desc: 'Dispute uma prova ao vivo contra outros concurseiros em tempo real. Pressão de prova real, placar ao vivo e ranking imediato.',
    size: 'medium',
    accent: '#ef4444',
  },
  {
    id: 'mapa',
    icon: '📊',
    title: 'Mapa de domínio',
    desc: 'Visualize em quais tópicos você domina e onde ainda tem gap — atualizado a cada questão respondida.',
    size: 'small',
    accent: '#22c55e',
  },
  {
    id: 'flashcard',
    icon: '🗂️',
    title: 'Flashcards com revisão espaçada',
    desc: 'Sistema de repetição espaçada (SRS) que mostra o conteúdo certo na hora certa para fixação de longo prazo.',
    size: 'small',
    accent: '#6366f1',
  },
  {
    id: 'edital',
    icon: '📖',
    title: 'Análise de edital',
    desc: 'Cole o edital ou busque pelo cargo. A IA extrai matérias, pesos e histórico da banca automaticamente.',
    size: 'small',
    accent: '#f59e0b',
  },
  {
    id: 'historico',
    icon: '📈',
    title: 'Histórico de desempenho',
    desc: 'Evolução por matéria, taxa de acerto, tempo médio por questão e comparação com ciclos anteriores.',
    size: 'small',
    accent: '#8b5cf6',
  },
  {
    id: 'trilha',
    icon: '🔔',
    title: 'Trilha diária',
    desc: 'Abre o app e já sabe exatamente o que estudar hoje. Sem decidir, sem procrastinar.',
    size: 'small',
    accent: '#0ab5bd',
  },
  {
    id: 'comentadas',
    icon: '💬',
    title: 'Questões comentadas pela IA',
    desc: 'Cada alternativa explicada. Entende não só o gabarito, mas por que as erradas estão erradas.',
    size: 'small',
    accent: '#22c55e',
  },
  {
    id: 'ranking',
    icon: '🏆',
    title: 'Ranking e progresso',
    desc: 'Compare sua evolução, desbloqueie conquistas e mantenha a motivação durante a jornada.',
    size: 'small',
    accent: '#f59e0b',
  },
  {
    id: 'caderno',
    icon: '📓',
    title: 'Caderno de erros',
    desc: 'Todas as questões erradas organizadas por matéria. Revise com foco apenas onde você erra.',
    size: 'small',
    accent: '#ef4444',
  },
  {
    id: 'diagnostico',
    icon: '🩺',
    title: 'Diagnóstico inicial',
    desc: 'Análise completa dos seus pontos fortes e lacunas por matéria logo ao entrar. Começa certo desde o primeiro dia.',
    size: 'small',
    accent: '#0ab5bd',
  },
  {
    id: 'pomodoro',
    icon: '⏱️',
    title: 'Timer Pomodoro integrado',
    desc: 'Sessões de foco com pausas programadas. Registra horas automaticamente no seu histórico.',
    size: 'small',
    accent: '#22c55e',
  },
  {
    id: 'desafio',
    icon: '🔥',
    title: 'Desafio semanal',
    desc: 'Meta de questões e horas definida pela IA toda semana. Cumpra a sequência e suba no ranking.',
    size: 'small',
    accent: '#8b5cf6',
  },
  {
    id: 'metas',
    icon: '🎖️',
    title: 'Metas e conquistas',
    desc: 'Defina metas diárias e semanais, acompanhe sua sequência de dias e desbloqueie conquistas.',
    size: 'small',
    accent: '#6366f1',
  },
];

function Arsenal() {
  const large  = ARSENAL.filter(a => a.size === 'large');
  const medium = ARSENAL.filter(a => a.size === 'medium');
  const small  = ARSENAL.filter(a => a.size === 'small');

  return (
    <section className="lc-section lc-arsenal-section" id="funcionalidades">
      <div className="lc-wrap">
        <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="lc-section-eyebrow">Funcionalidades</div>
          <h2 className="lc-section-title">
            TUDO QUE VOCÊ<br /><em>PRECISA PARA PASSAR.</em>
          </h2>
          <p className="lc-section-desc" style={{ margin: '20px auto 0', maxWidth: 560, textAlign: 'center' }}>
            Do primeiro dia de estudo até a véspera da prova. Um ecossistema completo,
            integrado e guiado por IA — sem precisar de mais nada.
          </p>
        </Reveal>

        {/* Row 1 — cards grandes */}
        <div className="lc-arsenal-row lc-arsenal-row-large">
          {large.map((item, i) => (
            <Reveal key={item.id} delay={i * 100} className="lc-arsenal-card lc-arsenal-large"
              style={{ '--ac': item.accent } as React.CSSProperties}>
              <div className="lc-arsenal-icon">{item.icon}</div>
              <h3 className="lc-arsenal-title">{item.title}</h3>
              <p className="lc-arsenal-desc">{item.desc}</p>
              <div className="lc-arsenal-glow" />
            </Reveal>
          ))}
        </div>

        {/* Row 2 — cards médios */}
        <div className="lc-arsenal-row lc-arsenal-row-medium">
          {medium.map((item, i) => (
            <Reveal key={item.id} delay={i * 80} className="lc-arsenal-card lc-arsenal-medium"
              style={{ '--ac': item.accent } as React.CSSProperties}>
              <div className="lc-arsenal-icon">{item.icon}</div>
              <h3 className="lc-arsenal-title">{item.title}</h3>
              <p className="lc-arsenal-desc">{item.desc}</p>
              <div className="lc-arsenal-glow" />
            </Reveal>
          ))}
        </div>

        {/* Row 3 — cards pequenos */}
        <div className="lc-arsenal-row lc-arsenal-row-small">
          {small.map((item, i) => (
            <Reveal key={item.id} delay={i * 60} className="lc-arsenal-card lc-arsenal-small"
              style={{ '--ac': item.accent } as React.CSSProperties}>
              <div className="lc-arsenal-icon-sm">{item.icon}</div>
              <div>
                <h3 className="lc-arsenal-title-sm">{item.title}</h3>
                <p className="lc-arsenal-desc-sm">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   DEMO — painel interativo
   ════════════════════════════════════════════════════════ */
type DemoTab = 'trilha' | 'simulado' | 'redacao' | 'mapa' | 'historico';

function Demo() {
  const [tab, setTab] = useState<DemoTab>('trilha');
  const ref = useTilt(3);
  const urlMap: Record<DemoTab, string> = {
    trilha:    'app.aprovai360.com.br/hoje',
    simulado:  'app.aprovai360.com.br/simulado/oab-37',
    redacao:   'app.aprovai360.com.br/redacao/12048',
    mapa:      'app.aprovai360.com.br/mapa',
    historico: 'app.aprovai360.com.br/historico',
  };
  return (
    <section className="lc-demo-section" id="demo">
      <div className="lc-wrap">
        <Reveal className="" style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="lc-section-eyebrow">Veja por dentro</div>
          <h2 className="lc-section-title">
            O PAINEL QUE<br /><em>APROVADOS</em> ABREM TODO DIA.
          </h2>
          <p className="lc-section-desc" style={{ margin: '16px auto 0', textAlign: 'center' }}>
            Trilha diária, questões por banca, correção de redação e mapa de domínio — tudo conectado ao seu concurso.
          </p>
        </Reveal>
        <div ref={ref} className="lc-demo-frame">
          <div className="demo-window">
            <div className="demo-bar">
              <div className="dot" /><div className="dot" /><div className="dot" />
              <div className="url">{urlMap[tab]}</div>
            </div>
            <div className="app-mock">
              <aside className="side">
                <div className="side-h">Hoje</div>
                <SideLink k="trilha"    cur={tab} setTab={setTab} ico={<IconTrack />}  label="Trilha de hoje" />
                <SideLink k="simulado"  cur={tab} setTab={setTab} ico={<IconExam />}   label="Simulado adaptativo" />
                <SideLink k="redacao"   cur={tab} setTab={setTab} ico={<IconPen />}    label="Correção de redação" />
                <div className="side-h">Diagnóstico</div>
                <SideLink k="mapa"      cur={tab} setTab={setTab} ico={<IconMap />}    label="Mapa de domínio" />
                <SideLink k="historico" cur={tab} setTab={setTab} ico={<IconChart />}  label="Histórico" />
              </aside>
              <div className="main">
                {tab === 'trilha'    && <TrilhaView />}
                {tab === 'simulado'  && <SimuladoView />}
                {tab === 'redacao'   && <RedacaoView />}
                {tab === 'mapa'      && <MapaView />}
                {tab === 'historico' && <HistoricoView />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SideLink({ k, cur, setTab, ico, label }: {
  k: DemoTab; cur: DemoTab; setTab: (t: DemoTab) => void;
  ico: React.ReactNode; label: string;
}) {
  return (
    <a className={cur === k ? 'active' : ''} onClick={() => setTab(k)} style={{ cursor: 'pointer' }}>
      <span className="ico">{ico}</span> {label}
    </a>
  );
}

// Demo sub-views
function TrilhaView() {
  return (
    <>
      <div className="panel span2">
        <div className="panel-h">
          <h5>Sua trilha · quarta, 14 de maio</h5>
          <span className="tag">2h 40min restantes</span>
        </div>
        <TaskRow done   title="Revisão flash — Lei 8.112 (cap. 3)" sub="12 questões · 18 min" />
        <TaskRow done   title="Leitura ativa — Princípios da Adm. Pública" sub="6 cards · 14 min" />
        <TaskRow active title="Simulado focado — Direito Administrativo" sub="38 questões · 1h 10min" right="Continuar →" />
        <TaskRow        title="Redação — tema CESPE/2024 nº 8" sub="1 redação · 50 min" />
      </div>
      <div className="panel">
        <div className="panel-h"><h5>Foco da semana</h5></div>
        <RingProgress pct={62} label="62% dos tópicos críticos cobertos" />
      </div>
      <div className="panel">
        <div className="panel-h">
          <h5>Curva de esquecimento</h5>
          <span className="tag" style={{ background: 'rgba(255,209,102,0.15)', color: '#ffd166', borderColor: 'rgba(255,209,102,0.3)' }}>3 em risco</span>
        </div>
        <ForgettingCurve />
      </div>
    </>
  );
}

function SimuladoView() {
  return (
    <>
      <div className="panel span2">
        <div className="panel-h">
          <h5>Simulado OAB · XXXVII</h5>
          <span className="tag">Questão 24 / 80</span>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-2)' }}>
          A respeito do princípio da legalidade no direito administrativo, é correto afirmar que a Administração Pública pode atuar:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {['Apenas conforme expressa autorização legal.', 'Em desacordo com a lei, desde que motivada.', 'Com discricionariedade absoluta nos atos vinculados.', 'Sem necessidade de previsão legal nos atos públicos.'].map((t, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 10,
              border: i === 0 ? '1px solid rgba(0,255,163,0.4)' : '1px solid var(--border)',
              background: i === 0 ? 'rgba(0,255,163,0.06)' : 'rgba(255,255,255,0.02)',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                fontFamily: 'monospace', fontSize: 11, display: 'grid', placeItems: 'center',
                color: i === 0 ? '#00ffa3' : 'var(--text-3)',
                border: `1px solid ${i === 0 ? '#00ffa3' : 'var(--border-2)'}`,
              }}>{['A','B','C','D'][i]}</div>
              {t}
              {i === 0 && <span style={{ marginLeft: 'auto', color: '#00ffa3', fontSize: 11 }}>✓ correta</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="panel"><div className="panel-h"><h5>Dificuldade adaptativa</h5></div><AdaptiveBars /></div>
      <div className="panel"><div className="panel-h"><h5>Performance ao vivo</h5><span className="tag">+12pts</span></div><Sparkline /></div>
    </>
  );
}

function RedacaoView() {
  return (
    <>
      <div className="panel span2">
        <div className="panel-h">
          <h5>Tema · &quot;Desafios da longevidade no Brasil&quot;</h5>
          <span className="tag">Nota: 920/1000</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)', padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 10, marginTop: 8 }}>
          A expectativa de vida do brasileiro saltou de 45 para 76 anos em apenas três gerações.
          <span style={{ background: 'rgba(0,255,163,0.18)', padding: '2px 4px', borderRadius: 3, color: '#a8ffd6' }}>Tal avanço, ainda que celebrado, escancara uma sociedade despreparada</span> para
          atender uma população que envelhece em ritmo acelerado...
        </div>
      </div>
      <CompetencyBar n="I"   title="Domínio da norma"        score={180} />
      <CompetencyBar n="II"  title="Compreensão da proposta" score={200} />
      <CompetencyBar n="III" title="Argumentação"            score={180} />
      <CompetencyBar n="IV"  title="Mecanismos linguísticos" score={160} />
      <div className="panel span2">
        <div className="panel-h"><h5>Comentários do corretor IA</h5></div>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Comment color="#00ffa3">Excelente domínio do repertório sociocultural (IBGE). Mantenha esse padrão na conclusão.</Comment>
          <Comment color="#ffd166">Cuidado com a repetição de &ldquo;nesse sentido&rdquo; — ocorreu 3x. Sugiro variar com &ldquo;diante disso&rdquo;.</Comment>
          <Comment color="#ff5ea8">A competência IV pode subir com uso mais consistente de períodos compostos por subordinação.</Comment>
        </ul>
      </div>
    </>
  );
}

function MapaView() {
  const topics = ['Constitucional','Administrativo','Português','Raciocínio Lógico','Ética','Penal','Processo Civil','Tributário','Trabalho','Empresarial','Atualidades','Inglês','Informática','Redação','Estatística','Filosofia','História','Geografia','Sociologia','Matemática Fin.'];
  return (
    <div className="panel span2">
      <div className="panel-h">
        <h5>Mapa de domínio · todos os tópicos</h5>
        <span className="tag">62% médio</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 6 }}>
        {topics.map((t, i) => {
          const pct = (i * 17 + 23) % 100;
          const color = pct > 75 ? '#00ffa3' : pct > 50 ? '#0ab5bd' : pct > 25 ? '#ffd166' : '#ff5ea8';
          return (
            <div key={i} style={{ padding: '12px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{t}</div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoricoView() {
  return (
    <div className="panel span2">
      <div className="panel-h">
        <h5>Histórico · últimos 90 dias</h5>
        <span className="tag">+42% acerto</span>
      </div>
      <Sparkline big />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 18 }}>
        <MiniStat label="Horas estudadas"     val="142h 38min" />
        <MiniStat label="Questões resolvidas" val="3.847" />
        <MiniStat label="Redações corrigidas" val="28" />
      </div>
    </div>
  );
}

// Tiny sub-components
function TaskRow({ done, active, title, sub, right }: { done?: boolean; active?: boolean; title: string; sub: string; right?: string; }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: '1px solid var(--border)', opacity: done ? 0.5 : 1 }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, border: `1px solid ${active ? '#0ab5bd' : done ? '#00ffa3' : 'var(--border-2)'}`, background: done ? '#00ffa3' : active ? 'rgba(10,181,189,0.2)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {done   && <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" fill="none" stroke="#001a10" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {active && <div style={{ width: 8, height: 8, borderRadius: 2, background: '#0ab5bd' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{sub}</div>
      </div>
      {right && <div style={{ fontSize: 12, color: '#0ab5bd' }}>{right}</div>}
    </div>
  );
}

function RingProgress({ pct, label }: { pct: number; label: string }) {
  const r = 56, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0ab5bd" /><stop offset="100%" stopColor="#00ffa3" />
          </linearGradient>
        </defs>
        <circle cx="75" cy="75" r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="10" fill="none" />
        <circle cx="75" cy="75" r={r} stroke="url(#rg)" strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 75 75)" />
        <text x="75" y="80" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="700">{pct}<tspan fontSize="14">%</tspan></text>
      </svg>
      <div style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

function ForgettingCurve() {
  return (
    <svg viewBox="0 0 220 100" style={{ width: '100%', height: 100 }}>
      <defs>
        <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ab5bd" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0ab5bd" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 20 Q 40 10, 70 35 T 130 60 T 220 75 L 220 100 L 0 100 Z" fill="url(#fc)" />
      <path d="M0 20 Q 40 10, 70 35 T 130 60 T 220 75" fill="none" stroke="#0ab5bd" strokeWidth="1.5" />
      <path d="M0 30 Q 60 5, 130 22 T 220 30" fill="none" stroke="#00ffa3" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="70" cy="35" r="3" fill="#ffd166" />
      <circle cx="130" cy="60" r="3" fill="#ff5ea8" />
      <circle cx="180" cy="70" r="3" fill="#ff5ea8" />
    </svg>
  );
}

function AdaptiveBars() {
  const bars = [40,55,70,62,78,85,72,90];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, height: `${b}%`, borderRadius: 4, background: i === bars.length-1 ? 'linear-gradient(180deg,#00ffa3,rgba(0,255,163,0.3))' : 'linear-gradient(180deg,#0ab5bd,rgba(10,181,189,0.3))', opacity: i === bars.length-1 ? 1 : 0.6+(i/bars.length)*0.4 }} />
      ))}
    </div>
  );
}

function Sparkline({ big }: { big?: boolean }) {
  const pts = '0,30 20,28 40,32 60,22 80,25 100,18 120,20 140,10 160,12 180,6 200,8 220,2';
  return (
    <svg viewBox="0 0 220 40" style={{ width: '100%', height: big ? 140 : 80 }}>
      <defs>
        <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00ffa3" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`${pts} 220,40 0,40`} fill="url(#sp)" />
      <polyline points={pts} fill="none" stroke="#00ffa3" strokeWidth="1.5" />
      <circle cx="220" cy="2" r="3" fill="#00ffa3">
        <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function CompetencyBar({ n, title, score }: { n: string; title: string; score: number }) {
  const pct = (score / 200) * 100;
  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.18em' }}>COMP. {n}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{title}</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{score}<span style={{ fontSize: 14, color: 'var(--text-3)' }}>/200</span></div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct>=90?'#00ffa3':pct>=75?'#0ab5bd':'#ffd166', borderRadius: 999 }} />
      </div>
    </div>
  );
}

function Comment({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 12, padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: `2px solid ${color}`, fontSize: 13, color: 'var(--text-2)' }}>
      <span style={{ width: 6, height: 6, borderRadius: 50, background: color, marginTop: 6, flexShrink: 0 }} />
      <span>{children}</span>
    </li>
  );
}

function MiniStat({ label, val }: { label: string; val: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6, fontFamily: 'Barlow Condensed, sans-serif' }}>{val}</div>
    </div>
  );
}

// Icons
function IconTrack() { return <svg className="icon" viewBox="0 0 24 24"><path d="M4 7h10M4 12h16M4 17h7" /><circle cx="18" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></svg>; }
function IconExam()  { return <svg className="icon" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>; }
function IconPen()   { return <svg className="icon" viewBox="0 0 24 24"><path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z" /></svg>; }
function IconMap()   { return <svg className="icon" viewBox="0 0 24 24"><path d="M9 4l6 2 5-2v14l-5 2-6-2-5 2V6l5-2zM9 4v16M15 6v16" /></svg>; }
function IconChart() { return <svg className="icon" viewBox="0 0 24 24"><path d="M4 20V4M4 20h16M8 16V10M12 16V6M16 16v-4" /></svg>; }

/* ════════════════════════════════════════════════════════
   PRICING
   ════════════════════════════════════════════════════════ */
function Pricing() {
  const tiltTrial  = useTilt(3);
  const tiltFocado = useTilt(3);
  const tiltAprov  = useTilt(3);
  const tiltElite  = useTilt(3);
  const [anual, setAnual] = useState(false);
  const planos = {
    focado:    { mensal: 69,  anual: 59  },
    aprovacao: { mensal: 99,  anual: 84  },
    elite:     { mensal: 149, anual: 127 },
  };
  return (
    <section className="lc-pricing-section" id="precos">
      <div className="lc-wrap">
        <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="lc-section-eyebrow">Planos</div>
          <h2 className="lc-section-title">
            INVISTA MENOS<br />QUE UM <em>CURSINHO.</em>
          </h2>
          <p className="lc-section-desc" style={{ margin: '16px auto 0', textAlign: 'center' }}>
            Cancele quando quiser. 7 dias grátis sem cartão.
          </p>
        </Reveal>

        {/* Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 4, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {(['Mensal', 'Anual'] as const).map((label) => {
              const isActive = label === 'Anual' ? anual : !anual;
              return (
                <button key={label} onClick={() => setAnual(label === 'Anual')} style={{ padding: '8px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .2s', background: isActive ? 'var(--teal)' : 'transparent', color: isActive ? '#001f22' : 'var(--text-2)' }}>
                  {label}{label === 'Anual' && <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 7px', borderRadius: 20, fontWeight: 700, marginLeft: 8 }}>-15%</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pricing">
          <Reveal delay={0}>
            <div ref={tiltTrial} className="price-card">
              <div className="tier">Trial Gratuito</div>
              <div className="price">R$ 0<small>/7 dias</small></div>
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>7 dias grátis, sem cartão</p>
              <ul>
                <li>1 mentor IA especializado</li>
                <li>10 mensagens com mentor/semana</li>
                <li>200 questões por semana</li>
                <li>200 flashcards por semana</li>
                <li>Até 2 redações/semana</li>
                <li>Até 2 casos práticos/semana</li>
                <li>Relatório básico de desempenho</li>
              </ul>
              <Link href="/cadastro" className="lc-btn lc-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Começar grátis</Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div ref={tiltFocado} className="price-card">
              <div className="tier">Focado</div>
              <div className="price"><sup>R$</sup>{anual ? planos.focado.anual : planos.focado.mensal}<small>/mês</small></div>
              {anual && <p style={{ fontSize: 12, color: '#34d399', margin: '-4px 0 4px' }}>R$ {planos.focado.anual * 12} cobrado anualmente</p>}
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>1 concurso em foco total</p>
              <ul>
                <li>1 concurso-alvo principal</li>
                <li>1 mentor IA de área especializado</li>
                <li>80 mensagens com mentor/semana</li>
                <li>Questões ilimitadas por matéria</li>
                <li>Flashcards ilimitados com repetição espaçada (SM-2)</li>
                <li>Até 7 simulados/semana</li>
                <li>Redação oficial com correção por IA (7/sem)</li>
                <li>Estudo de casos práticos (7/sem)</li>
                <li>Cronograma adaptativo semanal</li>
                <li>Memória de longo prazo do mentor</li>
              </ul>
              <Link href="/cadastro" className="lc-btn lc-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Assinar Focado</Link>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div ref={tiltAprov} className="price-card featured">
              <div className="badge-top">Mais popular</div>
              <div className="tier">Aprovação</div>
              <div className="price"><sup>R$</sup>{anual ? planos.aprovacao.anual : planos.aprovacao.mensal}<small>/mês</small></div>
              {anual && <p style={{ fontSize: 12, color: '#34d399', margin: '-4px 0 4px' }}>R$ {planos.aprovacao.anual * 12} cobrado anualmente</p>}
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>Até 2 concursos simultâneos</p>
              <ul>
                <li>Até 2 concursos simultâneos</li>
                <li>Mentor de área + Mentor de banca (2 IAs)</li>
                <li>300 mensagens com mentor/semana</li>
                <li>Questões ilimitadas por matéria</li>
                <li>Flashcards ilimitados com repetição espaçada avançada</li>
                <li>Até 21 simulados/semana no estilo da banca</li>
                <li>Redação e casos práticos (21/sem cada)</li>
                <li>Biblioteca de PDFs + chat com documentos</li>
                <li>Arena de competição entre estudantes</li>
                <li>Modo Adaptativo por IA</li>
                <li>Cronograma adaptativo semanal</li>
                <li>Relatório completo + gráficos de evolução</li>
                <li>Memória de longo prazo do mentor</li>
              </ul>
              <Link href="/cadastro" className="lc-btn lc-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Assinar Aprovação</Link>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div ref={tiltElite} className="price-card">
              <div className="tier">Elite</div>
              <div className="price"><sup>R$</sup>{anual ? planos.elite.anual : planos.elite.mensal}<small>/mês</small></div>
              {anual && <p style={{ fontSize: 12, color: '#34d399', margin: '-4px 0 4px' }}>R$ {planos.elite.anual * 12} cobrado anualmente</p>}
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>Máxima performance para quem estuda de verdade</p>
              <ul>
                <li>Até 3 concursos simultâneos</li>
                <li>Até 3 mentores IA simultâneos</li>
                <li>600 mensagens com mentor por semana</li>
                <li>Questões, flashcards e simulados ilimitados</li>
                <li>40 redações e 40 casos práticos por semana</li>
                <li>Biblioteca de PDFs + chat com documentos</li>
                <li>Arena de competição entre estudantes</li>
                <li>Modo Adaptativo avançado por IA</li>
                <li>Cronograma adaptativo com IA avançada</li>
                <li>Memória de longo prazo do mentor</li>
                <li>Grupos de estudo ilimitados</li>
                <li>Suporte prioritário</li>
              </ul>
              <Link href="/cadastro" className="lc-btn lc-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Assinar Elite</Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   TESTIMONIALS — ATO 4: A TRANSFORMAÇÃO
   ════════════════════════════════════════════════════════ */
function Testimonials() {
  const data = [
    {
      quote: 'Estudei 3 anos sem passar. Em 5 meses com a AprovAI360 fui aprovado no Tribunal Regional. A trilha diária acabou com a paralisia de não saber o que estudar.',
      name: 'RODRIGO MENDES',
      role: 'TRF · Técnico Judiciário',
      initial: 'R',
      avatar: 'radial-gradient(circle at 30% 30%, #b0a8ff, #7c5cff 60%, #1a0040)',
    },
    {
      quote: 'A correção de redação é incrível. Feedback detalhado em menos de um minuto — estrutura, argumentação, tudo. Minha nota no CESPE subiu muito.',
      name: 'JULIANA COSTA',
      role: 'CESPE · Analista · Aprovada',
      initial: 'J',
      avatar: 'radial-gradient(circle at 30% 30%, #b6ffe5, #00ffa3 60%, #003323)',
    },
    {
      quote: 'Sou mãe, trabalho e estudo. O app entende que eu tenho 1h por dia e me entrega exatamente o que cabe nesse tempo. Aprovei na PCDF em primeiro lugar.',
      name: 'CAMILA ROCHA',
      role: 'PCDF · Agente · 1º lugar',
      initial: 'C',
      avatar: 'radial-gradient(circle at 30% 30%, #ffd0e3, #ff5ea8 60%, #4a0028)',
    },
  ];
  return (
    <section className="lc-testi-section" id="aprovados">
      <div className="lc-wrap">
        <Reveal style={{ textAlign: 'center' }}>
          <div className="lc-section-eyebrow">Aprovados</div>
          <h2 className="lc-section-title">
            MÉTODO, IA E<br /><em>DETERMINAÇÃO.</em>
          </h2>
          <p className="lc-section-desc" style={{ margin: '16px auto 0', textAlign: 'center', maxWidth: 480 }}>
            A AprovAI360 não faz milagre — organiza seu estudo, potencializa cada hora e
            te mantém no caminho certo até a aprovação.
          </p>
        </Reveal>
        <div className="lc-testi-grid">
          {data.map((t, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="lc-testi-card">
                <p className="lc-testi-quote">{t.quote}</p>
                <div className="lc-testi-who">
                  <div className="lc-testi-avatar" style={{ background: t.avatar }}>{t.initial}</div>
                  <div>
                    <span className="lc-testi-name">{t.name}</span>
                    <span className="lc-testi-role">{t.role}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════════════════ */
function FAQ() {
  const items = [
    { q: 'Para quais provas a AprovAI360 funciona?', a: 'A plataforma cobre 3 modalidades: Concursos Públicos (principais bancas como CESPE, FGV, FCC, VUNESP, CEBRASPE e IBFC), OAB 1ª e 2ª Fase, e ENEM. Cada modalidade tem fluxo, mentores IA e simulados adaptados.' },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Os planos mensais podem ser cancelados a qualquer momento com um clique no painel — a cobrança para no fim do ciclo atual, sem taxa de cancelamento.' },
    { q: 'A IA corrige redação no estilo das bancas de concurso?', a: 'Sim. A correção é feita com base nos critérios das principais bancas (CESPE, FGV, FCC) e também nas 5 competências do ENEM. Feedback detalhado em menos de 30 segundos.' },
    { q: 'O simulado da OAB tem o formato oficial?', a: 'Sim. O simulado modo OAB usa 80 questões, 5 horas de tempo e exibe APROVADO/REPROVADO com base no threshold de 50% (mínimo 40 acertos) — exatamente o critério da prova real da FGV.' },
    { q: 'Tem período de teste gratuito?', a: 'Sim. O plano Trial oferece 7 dias gratuitos sem precisar cadastrar cartão de crédito. Você tem acesso ao mentor IA, questões e flashcards para explorar a plataforma antes de decidir.' },
    { q: 'Meus dados e redações são privados?', a: 'Sim. Seus dados são exclusivamente seus — não são compartilhados com terceiros nem usados para treinar outros modelos de IA. Você pode solicitar exclusão completa a qualquer momento.' },
  ];
  return (
    <section className="lc-faq-section" id="faq">
      <div className="lc-wrap">
        <div className="lc-faq-grid">
          <Reveal className="lc-faq-sticky">
            <div className="lc-section-eyebrow">FAQ</div>
            <h2 className="lc-section-title">
              PERGUNTAS<br /><em>JUSTAS.</em>
            </h2>
            <p className="lc-section-desc" style={{ marginTop: 16 }}>
              Se faltou alguma, fale com a gente em{' '}
              <a href="mailto:oi@aprovai360.com.br" style={{ color: 'var(--teal)' }}>
                oi@aprovai360.com.br
              </a>
            </p>
          </Reveal>
          <Reveal>
            <div className="lc-faq-list">
              {items.map((it, i) => (
                <details key={i} className="lc-faq-item" open={i === 0}>
                  <summary>{it.q}</summary>
                  <p>{it.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   FINAL CTA
   ════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="lc-cta-section">
      <div className="lc-cta-line" />
      <div className="lc-cta-body">
        <Reveal>
          <span className="lc-cta-label">Sua hora chegou</span>
        </Reveal>
        <Reveal delay={100}>
          <h2 className="lc-cta-title">
            PARE DE<br />ESTUDAR<br />SEM <em>MÉTODO.</em>
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="lc-cta-desc">
            Comece grátis por 7 dias, sem cartão. Só você,
            o seu mentor IA e o seu próximo &ldquo;fui aprovado&rdquo;.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="lc-cta-btns">
            <Link href="/cadastro" className="lc-btn lc-btn-primary" style={{ padding: '18px 40px', fontSize: 17 }}>
              Começar grátis →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="lc-footer">
      <div className="lc-wrap lc-footer-inner">
        <Link href="/" className="lc-logo" style={{ textDecoration: 'none' }}>
          <div className="lc-logo-mark" style={{ width: 26, height: 26 }} />
          <div className="lc-logo-text" style={{ fontSize: 18 }}>
            Aprov<span>AI</span>360
          </div>
        </Link>
        <div className="lc-footer-links">
          <Link href="/instalar">📲 Instalar app</Link>
          <Link href="/suporte">Suporte</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
          <a href="mailto:oi@aprovai360.com.br">Contato</a>
        </div>
        <div className="lc-footer-copy">
          © 2026 AprovAI360 · Concurso Público · OAB · ENEM 🇧🇷
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════
   ROOT
   ════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="landing-root">
      <Nav />
      <Hero />
      <StatsStrip />
      <ComoFunciona />
      <EstudoReverso />
      <Modalidades />
      <Arsenal />
      <Demo />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
