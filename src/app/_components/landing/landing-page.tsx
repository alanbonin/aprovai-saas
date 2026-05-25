'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import './landing.css';

// Three.js scene only on the client
const Hero3D = dynamic(() => import('./hero-3d'), { ssr: false });

/* ────────────────────────────────────────────────────────
   Reveal on scroll
   ──────────────────────────────────────────────────────── */
function Reveal({
  children, delay = 0, className = '',
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
    <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`}
         style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   3D tilt hook
   ──────────────────────────────────────────────────────── */
function useTilt(intensity = 8) {
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
      const y = (e.clientY - rect.top)  / rect.height;
      target.ry = (x - 0.5) *  intensity;
      target.rx = (y - 0.5) * -intensity;
    };
    const onLeave = () => { target.rx = 0; target.ry = 0; };
    const loop = () => {
      current.rx += (target.rx - current.rx) * 0.12;
      current.ry += (target.ry - current.ry) * 0.12;
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

/* ────────────────────────────────────────────────────────
   NAV
   ──────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`top ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link href="/" className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="AprovAI360" width={36} height={36} style={{ objectFit: 'contain' }} />
          <b>AprovAI<i>360</i></b>
        </Link>
        <div className="nav-links">
          <a href="#produto">Produto</a>
          <a href="#demo">Como funciona</a>
          <a href="#precos">Preços</a>
          <a href="#aprovados">Aprovados</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-cta">
          <Link href="/login" className="btn btn-ghost" style={{ padding: '10px 16px', fontSize: 14 }}>Entrar</Link>
          <Link href="/cadastro" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 14 }}>Começar grátis</Link>
        </div>
      </div>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────
   HERO
   ──────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="hero">
      <Hero3D />
      <div className="container hero-grid">
        <div className="hero-copy">
          <Reveal>
            <div className="eyebrow">Concurso · ENEM · OAB · Vestibular · REVALIDA · CFC</div>
          </Reveal>
          <Reveal delay={100}>
            <h1>
              A <span className="stamp">IA</span><br />
              que aprova <i>você</i>.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="sub">
              Mentor de IA especializado na sua prova, plano de estudos adaptativo,
              simulados com gabarito comentado e correção de redação em 30 segundos.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="hero-ctas">
              <Link href="/cadastro" className="btn btn-primary">Começar grátis →</Link>
              <a href="#modalidades" className="btn btn-ghost">Ver modalidades ↓</a>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="hero-meta">
              <span>🏛️ Concurso</span>
              <div className="dot" /><span>📋 ENEM</span>
              <div className="dot" /><span>🎓 Vestibular</span>
              <div className="dot" /><span>⚖️ OAB</span>
              <div className="dot" /><span>🩺 REVALIDA</span>
              <div className="dot" /><span>📊 CFC</span>
            </div>
          </Reveal>
        </div>

        <div className="hero-art" aria-hidden>
          <div className="chip-card" style={{ top: '8%', right: '55%' }}>
            <div className="iconbox green">
              <svg width="18" height="18" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" stroke="#00ffa3" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            </div>
            <div><small>Redação corrigida</small><strong>920 / 1000</strong></div>
          </div>
          <div className="chip-card" style={{ top: '55%', right: '5%', animationDelay: '1.2s' }}>
            <div className="iconbox">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 8l3 3 4-6" stroke="#7ad8df" strokeWidth="1.6" strokeLinecap="round" /><path d="M10 13l2-2" stroke="#7ad8df" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </div>
            <div><small>Trilha de hoje</small><strong>2h 40min · 38 questões</strong></div>
          </div>
          <div className="chip-card" style={{ top: '82%', right: '40%', animationDelay: '2.4s' }}>
            <div className="iconbox gold">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5l2-5z" fill="#ffd166" stroke="#ffd166" strokeWidth="0.6" strokeLinejoin="round" /></svg>
            </div>
            <div><small>Mapa de domínio</small><strong>62% · subindo</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────
   STATS STRIP
   ──────────────────────────────────────────────────────── */
function StatsStrip() {
  const stats = [
    { num: '200',   suffix: '+', label: 'Bancas cobertas no banco de questões' },
    { num: '800',   suffix: '+', label: 'Tópicos de concurso mapeados pela IA' },
    { num: '30',    suffix: 's', label: 'Para corrigir sua redação' },
    { num: '24',    suffix: 'h', label: 'Cronograma atualizado toda madrugada' },
  ];
  return (
    <section className="stats">
      <div className="container">
        <div className="stats-grid">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 80} className="stat">
              <div className="num">
                {s.num}
                {s.suffix && <span className="small">{s.suffix}</span>}
              </div>
              <div className="label">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────
   FEATURES
   ──────────────────────────────────────────────────────── */
function FeatureCard({
  num, title, body, children, delay,
}: {
  num: string;
  title: React.ReactNode;
  body: string;
  children?: React.ReactNode;
  delay: number;
}) {
  const ref = useTilt(6);
  return (
    <Reveal delay={delay}>
      <div ref={ref} className="feature-card tilt">
        <div className="num">{num}</div>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="feature-3d">{children}</div>
      </div>
    </Reveal>
  );
}

function Features() {
  return (
    <section className="block" id="produto">
      <div className="container">
        <Reveal className="section-head">
          <div className="eyebrow">Como funciona</div>
          <h2>Três pilares. <i>Zero</i> achismo. Só aprovação.</h2>
          <p>A AprovAI360 entende o seu concurso, monta seu cronograma e corrige sua redação no tempo do café. Especializada em concursos públicos.</p>
        </Reveal>
        <div className="features">
          <FeatureCard
            num="01 / MENTOR IA"
            title={<>Seu <i>mentor especializado</i> no concurso.</>}
            body="A IA é treinada no edital do seu concurso e no estilo da sua banca — CESPE, FGV, FCC e mais. Responde dúvidas, explica questões e acompanha seu progresso em tempo real."
            delay={0}
          >
            <div className="orb-mini" />
          </FeatureCard>
          <FeatureCard
            num="02 / TRILHA"
            title={<>Sua <i>rotina diária</i>, montada pela IA.</>}
            body="A AprovAI360 monta seu cronograma com base na curva de esquecimento, no edital e no tempo que você tem. Você abre o app e já sabe o que estudar hoje."
            delay={120}
          >
            <div className="cardstack">
              <div className="lc"><small>Ontem</small><h6>Lei 8.112</h6></div>
              <div className="lc"><small>Amanhã</small><h6>Direito Constitucional</h6></div>
              <div className="lc">
                <small>Hoje · 2h 40min</small>
                <h6>Direito Administrativo</h6>
                <span className="pill">38 questões · 1 redação</span>
              </div>
            </div>
          </FeatureCard>
          <FeatureCard
            num="03 / REDAÇÃO"
            title={<>Correção <i>fiel ao estilo CESPE/FGV</i> em 30s.</>}
            body="A IA corrige sua dissertação argumentativa nos critérios das principais bancas — estrutura, argumentação, coesão e adequação ao tema. Feedback detalhado em segundos."
            delay={240}
          >
            <div className="stamp3d">Aprovado</div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────
   DEMO — interactive app mock
   ──────────────────────────────────────────────────────── */
type DemoTab = 'trilha' | 'simulado' | 'redacao' | 'mapa' | 'historico';

function Demo() {
  const [tab, setTab] = useState<DemoTab>('trilha');
  const ref = useTilt(4);

  const urlMap: Record<DemoTab, string> = {
    trilha:   'app.aprovai360.com.br/hoje',
    simulado: 'app.aprovai360.com.br/simulado/oab-37',
    redacao:  'app.aprovai360.com.br/redacao/12048',
    mapa:     'app.aprovai360.com.br/mapa',
    historico:'app.aprovai360.com.br/historico',
  };

  return (
    <section className="block" id="demo" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal className="section-head">
          <div className="eyebrow">Veja por dentro</div>
          <h2>O painel que <i>milhares</i> de aprovados abrem todo dia.</h2>
          <p>Trilha diária, questões por banca, correção de redação e mapa de domínio — tudo conectado ao seu concurso.</p>
        </Reveal>
        <div ref={ref} className="demo-frame tilt">
          <div className="demo-window">
            <div className="demo-bar">
              <div className="dot" /><div className="dot" /><div className="dot" />
              <div className="url">{urlMap[tab]}</div>
            </div>
            <div className="app-mock">
              <aside className="side">
                <div className="logo" style={{ fontSize: 16, marginBottom: 16, padding: '0 8px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-icon.svg" alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
                  <b>AprovAI<i>360</i></b>
                </div>
                <div className="side-h">Hoje</div>
                <SideLink k="trilha"   cur={tab} setTab={setTab} ico={<IconTrack />} label="Trilha de hoje" />
                <SideLink k="simulado" cur={tab} setTab={setTab} ico={<IconExam />}  label="Simulado adaptativo" />
                <SideLink k="redacao"  cur={tab} setTab={setTab} ico={<IconPen />}   label="Correção de redação" />
                <div className="side-h">Diagnóstico</div>
                <SideLink k="mapa"     cur={tab} setTab={setTab} ico={<IconMap />}   label="Mapa de domínio" />
                <SideLink k="historico" cur={tab} setTab={setTab} ico={<IconChart />} label="Histórico" />
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
  k: DemoTab; cur: DemoTab;
  setTab: (t: DemoTab) => void;
  ico: React.ReactNode; label: string;
}) {
  return (
    <a className={cur === k ? 'active' : ''} onClick={() => setTab(k)} style={{ cursor: 'pointer' }}>
      <span className="ico">{ico}</span> {label}
    </a>
  );
}

// — Demo views —
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
          <span className="tag" style={{ background: 'rgba(255,209,102,0.15)', color: '#ffd166', borderColor: 'rgba(255,209,102,0.3)' }}>3 tópicos em risco</span>
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
              border: i === 0 ? '1px solid rgba(0,255,163,0.4)' : '1px solid var(--line)',
              background: i === 0 ? 'rgba(0,255,163,0.06)' : 'rgba(255,255,255,0.02)',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, border: '1px solid var(--line-2)',
                fontFamily: 'monospace', fontSize: 11, display: 'grid', placeItems: 'center',
                color: i === 0 ? '#00ffa3' : 'var(--muted)',
                borderColor: i === 0 ? '#00ffa3' : 'var(--line-2)',
              }}>{['A','B','C','D'][i]}</div>
              {t}
              {i === 0 && <span style={{ marginLeft: 'auto', color: '#00ffa3', fontSize: 11 }}>✓ correta</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-h"><h5>Dificuldade adaptativa</h5></div>
        <AdaptiveBars />
      </div>
      <div className="panel">
        <div className="panel-h"><h5>Performance ao vivo</h5><span className="tag">+12pts</span></div>
        <Sparkline />
      </div>
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
  const topics = [
    'Constitucional','Administrativo','Português','Raciocínio Lógico','Ética',
    'Penal','Processo Civil','Tributário','Trabalho','Empresarial',
    'Atualidades','Inglês','Informática','Redação','Estatística',
    'Filosofia','História','Geografia','Sociologia','Matemática Fin.',
  ];
  return (
    <div className="panel span2">
      <div className="panel-h">
        <h5>Mapa de domínio · todos os tópicos</h5>
        <span className="tag">62% médio</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 6 }}>
        {topics.map((t, i) => {
          const pct = (i * 17 + 23) % 100;
          const color = pct > 75 ? '#00ffa3' : pct > 50 ? '#7ad8df' : pct > 25 ? '#ffd166' : '#ff5ea8';
          return (
            <div key={i} style={{ padding: '12px 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{t}</div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>{pct}%</div>
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
        <MiniStat label="Horas estudadas"   val="142h 38min" />
        <MiniStat label="Questões resolvidas" val="3.847" />
        <MiniStat label="Redações corrigidas" val="28" />
      </div>
    </div>
  );
}

// Tiny sub-components
function TaskRow({ done, active, title, sub, right }: {
  done?: boolean; active?: boolean; title: string; sub: string; right?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: '1px solid var(--line)', opacity: done ? 0.55 : 1 }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, border: `1px solid ${active ? 'var(--violet)' : done ? '#00ffa3' : 'var(--line-2)'}`, background: done ? '#00ffa3' : active ? 'rgba(10,181,189,0.2)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {done && <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" fill="none" stroke="#001a10" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {active && <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--violet)' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{sub}</div>
      </div>
      {right && <div style={{ fontSize: 12, color: 'var(--violet)' }}>{right}</div>}
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
        <circle cx="75" cy="75" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <circle cx="75" cy="75" r={r} stroke="url(#rg)" strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 75 75)" />
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
  const bars = [40, 55, 70, 62, 78, 85, 72, 90];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, height: `${b}%`, borderRadius: 4, background: i === bars.length - 1 ? 'linear-gradient(180deg, #00ffa3, rgba(0,255,163,0.3))' : 'linear-gradient(180deg, #0ab5bd, rgba(10,181,189,0.3))', opacity: i === bars.length - 1 ? 1 : 0.6 + (i / bars.length) * 0.4 }} />
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
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.18em' }}>COMP. {n}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{title}</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{score}<span style={{ fontSize: 14, color: 'var(--muted)' }}>/200</span></div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#00ffa3' : pct >= 75 ? '#0ab5bd' : '#ffd166', borderRadius: 999 }} />
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
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>{val}</div>
    </div>
  );
}

// Sidebar icons
function IconTrack() { return <svg className="icon" viewBox="0 0 24 24"><path d="M4 7h10M4 12h16M4 17h7" /><circle cx="18" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></svg>; }
function IconExam()  { return <svg className="icon" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>; }
function IconPen()   { return <svg className="icon" viewBox="0 0 24 24"><path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z" /></svg>; }
function IconMap()   { return <svg className="icon" viewBox="0 0 24 24"><path d="M9 4l6 2 5-2v14l-5 2-6-2-5 2V6l5-2zM9 4v16M15 6v16" /></svg>; }
function IconChart() { return <svg className="icon" viewBox="0 0 24 24"><path d="M4 20V4M4 20h16M8 16V10M12 16V6M16 16v-4" /></svg>; }

/* ────────────────────────────────────────────────────────
   PRICING
   ──────────────────────────────────────────────────────── */
function Pricing() {
  const tiltTrial   = useTilt(4);
  const tiltFocado  = useTilt(4);
  const tiltAprov   = useTilt(4);
  const tiltElite   = useTilt(4);
  const [anual, setAnual] = useState(false);

  const planos = {
    focado:    { mensal: 49,  anual: 39  },
    aprovacao: { mensal: 89,  anual: 71  },
    elite:     { mensal: 149, anual: 119 },
  };

  return (
    <section className="block" id="precos">
      <div className="container">
        <Reveal className="section-head">
          <div className="eyebrow">Planos</div>
          <h2>Invista menos que um <i>curso preparatório</i>. Estude mais inteligente.</h2>
          <p>Cancele quando quiser. Teste grátis por 7 dias sem precisar de cartão.</p>
        </Reveal>

        {/* Toggle Mensal / Anual */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setAnual(false)}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all .2s',
                background: !anual ? 'var(--violet)' : 'transparent',
                color: !anual ? '#fff' : 'var(--text-2)',
              }}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnual(true)}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
                background: anual ? 'var(--violet)' : 'transparent',
                color: anual ? '#fff' : 'var(--text-2)',
              }}
            >
              Anual
              <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: 20, fontWeight: 700 }}>
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="pricing" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {/* Trial */}
          <Reveal delay={0}>
            <div ref={tiltTrial} className="price-card tilt">
              <div className="tier">Trial Gratuito</div>
              <div className="price">R$ 0<small>/7 dias</small></div>
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>Sem cartão. Explore a plataforma por 7 dias.</p>
              <ul>
                <li>7 dias grátis, sem cartão</li>
                <li>20 questões por dia</li>
                <li>Flashcards</li>
                <li>1 mentor IA — 10 msgs/semana</li>
              </ul>
              <Link href="/cadastro" className="btn btn-ghost">Começar grátis</Link>
            </div>
          </Reveal>

          {/* Focado */}
          <Reveal delay={80}>
            <div ref={tiltFocado} className="price-card tilt">
              <div className="tier">Focado</div>
              <div className="price">
                <sup>R$</sup>{anual ? planos.focado.anual : planos.focado.mensal}<small>/mês</small>
              </div>
              {anual && (
                <p style={{ fontSize: 12, color: '#34d399', margin: '-4px 0 4px' }}>
                  R$ {planos.focado.anual * 12} cobrado anualmente
                </p>
              )}
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>1 concurso, foco total.</p>
              <ul>
                <li>1 concurso-alvo principal</li>
                <li>1 mentor IA especializado</li>
                <li>50 mensagens com mentor/semana</li>
                <li>Questões ilimitadas por matéria</li>
                <li>Flashcards com repetição espaçada (SM-2)</li>
                <li>Simulados no estilo da banca</li>
              </ul>
              <Link href="/cadastro" className="btn btn-ghost">Assinar Focado</Link>
            </div>
          </Reveal>

          {/* Aprovação */}
          <Reveal delay={160}>
            <div ref={tiltAprov} className="price-card featured tilt">
              <div className="badge-top">Mais popular</div>
              <div className="tier">Aprovação</div>
              <div className="price">
                <sup>R$</sup>{anual ? planos.aprovacao.anual : planos.aprovacao.mensal}<small>/mês</small>
              </div>
              {anual && (
                <p style={{ fontSize: 12, color: '#34d399', margin: '-4px 0 4px' }}>
                  R$ {planos.aprovacao.anual * 12} cobrado anualmente
                </p>
              )}
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>Dois concursos simultâneos, dois mentores IA.</p>
              <ul>
                <li>Até 2 concursos simultâneos</li>
                <li>Mentor de área + Mentor de banca</li>
                <li>80 mensagens com mentor/semana</li>
                <li>Questões ilimitadas por matéria</li>
                <li>Correção de redação por IA · 30s</li>
                <li>Simulados no estilo da banca</li>
                <li>Cronograma adaptativo semanal</li>
              </ul>
              <Link href="/cadastro" className="btn btn-primary">Assinar Aprovação</Link>
            </div>
          </Reveal>

          {/* Elite */}
          <Reveal delay={240}>
            <div ref={tiltElite} className="price-card tilt">
              <div className="tier">Elite</div>
              <div className="price">
                <sup>R$</sup>{anual ? planos.elite.anual : planos.elite.mensal}<small>/mês</small>
              </div>
              {anual && (
                <p style={{ fontSize: 12, color: '#34d399', margin: '-4px 0 4px' }}>
                  R$ {planos.elite.anual * 12} cobrado anualmente
                </p>
              )}
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '12px 0 20px' }}>Concursos ilimitados. Mentores ilimitados.</p>
              <ul>
                <li>Concursos ilimitados</li>
                <li>Até 5 mentores IA simultâneos</li>
                <li>Mensagens ilimitadas com mentor</li>
                <li>Decodificador de edital (PDF → plano)</li>
                <li>Biblioteca de PDFs + chat com docs</li>
                <li>Memória de longo prazo do mentor</li>
                <li>Suporte prioritário</li>
              </ul>
              <Link href="/cadastro" className="btn btn-ghost">Assinar Elite</Link>
            </div>
          </Reveal>
        </div>

      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────
   TESTIMONIALS
   ──────────────────────────────────────────────────────── */
function Testimonials() {
  const data = [
    { q: 'Estudei 3 anos sem passar. Em 5 meses com a AprovAI360 fui aprovado no Tribunal Regional. A trilha diária acabou com a paralisia de não saber o que estudar.', name: 'Rodrigo Mendes', role: 'TRF · Técnico Judiciário', initial: 'R', bg: undefined },
    { q: 'A correção de redação é incrível. Recebi o feedback detalhado em menos de um minuto — estrutura, argumentação, tudo. Minha nota na dissertação do CESPE subiu muito.', name: 'Juliana Costa', role: 'CESPE · Analista · Aprovada', initial: 'J', bg: 'radial-gradient(circle at 30% 30%, #b6ffe5, #00ffa3 60%, #003323)' },
    { q: 'Sou mãe, trabalho e estudo. O app entende que eu tenho 1h e me entrega exatamente o que cabe. Aprovei na PCDF em primeiro lugar.', name: 'Camila Rocha', role: 'PCDF · Agente · 1º lugar', initial: 'C', bg: 'radial-gradient(circle at 30% 30%, #ffd0e3, #ff5ea8 60%, #4a0028)' },
  ];
  return (
    <section className="block" id="aprovados">
      <div className="container">
        <Reveal className="section-head">
          <div className="eyebrow">Aprovados</div>
          <h2>Método, IA e <i>determinação</i>.</h2>
          <p>A AprovAI360 não faz milagre — ela organiza o seu estudo, potencializa cada hora disponível e te mantém no caminho certo até a aprovação.</p>
        </Reveal>
        <div className="testimonials">
          {data.map((t, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="testi">
                <q>{t.q}</q>
                <div className="who">
                  <div className="avatar" style={t.bg ? { background: t.bg } : undefined}>{t.initial}</div>
                  <div className="who-info"><b>{t.name}</b><small>{t.role}</small></div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────
   FAQ
   ──────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────
   MODALIDADES
   ──────────────────────────────────────────────────────── */
function Modalidades() {
  const mods = [
    {
      icon: '🏛️',
      name: 'Concurso Público',
      color: '#6366f1',
      tags: ['CESPE', 'FGV', 'FCC', 'VUNESP', '+200 bancas'],
      desc: 'Do edital à aprovação. IA que conhece cada banca, cargo e peso de matéria.',
    },
    {
      icon: '📋',
      name: 'ENEM',
      color: '#f97316',
      tags: ['Redação nota 1000', 'TRI', '4 áreas', 'SISU/ProUni'],
      desc: 'Plano por área, treino de redação com as 5 competências e estratégia TRI.',
    },
    {
      icon: '🎓',
      name: 'Vestibular',
      color: '#ec4899',
      tags: ['FUVEST', 'UNICAMP', 'UNESP', 'UERJ', 'ITA'],
      desc: 'Mentores específicos para Medicina, Engenharia e Direito/Humanas.',
    },
    {
      icon: '⚖️',
      name: 'OAB',
      color: '#8b5cf6',
      tags: ['1ª Fase', '2ª Fase', 'FGV', 'Peças processuais'],
      desc: 'Simulado oficial 80q/5h com threshold de aprovação. Correção de peças.',
    },
    {
      icon: '🩺',
      name: 'REVALIDA',
      color: '#10b981',
      tags: ['Etapa 1', 'OSCE', 'SUS', 'PCDT', 'INEP/MEC'],
      desc: 'Raciocínio clínico no padrão SUS. Simulação de estações OSCE.',
    },
    {
      icon: '📊',
      name: 'CFC',
      color: '#f59e0b',
      tags: ['Bacharel', 'Técnico', 'NBC', 'CPC/IFRS'],
      desc: 'Exame de Suficiência completo. Normas, CPCs e questões comentadas.',
    },
  ];

  return (
    <section className="block" id="modalidades" style={{ background: 'rgba(99,102,241,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="container">
        <Reveal>
          <div className="eyebrow">Para quem é?</div>
          <h2 style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 12px', lineHeight: 1.1 }}>
            Uma plataforma. <i style={{ color: 'var(--violet)', fontStyle: 'italic' }}>6 modalidades.</i>
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: 16, maxWidth: 540, margin: '0 0 48px' }}>
            Do ENEM ao REVALIDA, do concurso público ao OAB — cada fluxo é adaptado às regras, bancas e matérias da sua prova.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {mods.map((m, i) => (
            <Reveal key={m.name} delay={i * 60}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '24px',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = m.color + '55')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {m.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{m.name}</h3>
                </div>
                <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>{m.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {m.tags.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: m.color + '15', color: m.color, fontWeight: 600 }}>
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

function FAQ() {
  const items = [
    { q: 'Para quais provas a AprovAI360 funciona?', a: 'A plataforma cobre 6 modalidades: Concursos Públicos (200+ bancas como CESPE, FGV, FCC, VUNESP), ENEM, Vestibulares (FUVEST, UNICAMP, ITA, UERJ), OAB 1ª e 2ª Fase, REVALIDA e Exame de Suficiência CFC. Cada modalidade tem fluxo, mentores IA e simulados adaptados.' },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Os planos mensais podem ser cancelados a qualquer momento com um clique no painel — a cobrança para no fim do ciclo atual, sem taxa de cancelamento.' },
    { q: 'A IA corrige redação no estilo das bancas de concurso?', a: 'Sim. A correção é feita com base nos critérios das principais bancas (CESPE, FGV, FCC) e também nas competências do ENEM (C1–C5). Você recebe feedback detalhado sobre estrutura, argumentação, coesão e adequação ao tema em menos de 30 segundos.' },
    { q: 'O simulado da OAB tem o formato oficial?', a: 'Sim. O simulado modo OAB usa 80 questões, 5 horas de tempo e exibe APROVADO/REPROVADO com base no threshold de 50% (mínimo 40 acertos) — exatamente o critério da prova real da FGV.' },
    { q: 'Tem período de teste gratuito?', a: 'Sim! O plano Trial oferece 7 dias gratuitos sem precisar cadastrar cartão de crédito. Você tem acesso ao mentor IA, questões e flashcards para explorar a plataforma antes de decidir.' },
    { q: 'Meus dados e redações são privados?', a: 'Sim. Seus dados e conteúdos de estudo são exclusivamente seus — não são compartilhados com terceiros e não são usados para treinar outros modelos de IA. Você pode solicitar a exclusão completa da sua conta e dados a qualquer momento.' },
  ];
  return (
    <section className="block" id="faq">
      <div className="container">
        <div className="faq-grid" style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: 60, alignItems: 'start' }}>
          <Reveal style={{ position: 'sticky', top: 100 }}>
            <div className="eyebrow">FAQ</div>
            <h2 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 16px', lineHeight: 1.1 }}>Perguntas <i style={{ color: 'var(--violet)', fontStyle: 'italic' }}>justas</i>.</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 15 }}>Se faltou alguma, fale com a gente em <a href="mailto:oi@aprovai360.com.br" style={{ color: 'var(--violet)' }}>oi@aprovai360.com.br</a>.</p>
          </Reveal>
          <Reveal>
            <div className="faq">
              {items.map((it, i) => (
                <details key={i} open={i === 0}>
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

/* ────────────────────────────────────────────────────────
   FINAL CTA
   ──────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="container">
        <div className="final-cta-inner">
          <Reveal><div className="eyebrow">Sua hora chegou</div></Reveal>
          <Reveal delay={100}><h2>Pare de estudar sem método. <i>Aprove.</i></h2></Reveal>
          <Reveal delay={200}>
            <p>Comece grátis por 7 dias, sem cartão. Só você, o seu mentor IA e o seu próximo &ldquo;fui aprovado&rdquo;.</p>
          </Reveal>
          <Reveal delay={300}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/cadastro" className="btn btn-primary" style={{ padding: '18px 28px', fontSize: 16 }}>Começar grátis →</Link>
              <a href="mailto:oi@aprovai360.com.br" className="btn btn-ghost" style={{ padding: '18px 28px', fontSize: 16 }}>Falar com humano</a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────
   FOOTER
   ──────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="AprovAI360" width={30} height={30} style={{ objectFit: 'contain' }} />
          <b>AprovAI<i>360</i></b>
        </div>
        <div className="legal">
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
          <a href="mailto:imprensa@aprovai360.com.br">Imprensa</a>
          <a href="mailto:oi@aprovai360.com.br">Contato</a>
          <span>© 2026 AprovAI360 · Concurso · ENEM · OAB · Vestibular · REVALIDA · CFC 🇧🇷</span>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────
   ROOT EXPORT
   ──────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing-root">
      <Nav />
      <Hero />
      <StatsStrip />
      <Modalidades />
      <Features />
      <Demo />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
