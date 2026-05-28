'use client';

import Link from 'next/link';
import { useState } from 'react';
import './suporte.css';

const FAQS = [
  {
    cat: 'Conta e acesso',
    items: [
      {
        q: 'Não consigo fazer login. O que faço?',
        a: 'Tente redefinir sua senha clicando em "Esqueci minha senha" na tela de login. Se o problema persistir, verifique se o e-mail está correto ou entre em contato conosco pelo e-mail suporte@aprovai360.com.br.',
      },
      {
        q: 'Posso usar em mais de um dispositivo?',
        a: 'Sim! Sua conta funciona em todos os seus dispositivos — celular, tablet e computador. Basta fazer login com o mesmo e-mail.',
      },
      {
        q: 'Como cancelo minha assinatura?',
        a: 'Acesse Configurações → Plano → Cancelar assinatura. O cancelamento é imediato e você continua com acesso até o fim do período pago.',
      },
      {
        q: 'Posso mudar meu e-mail?',
        a: 'Sim. Acesse Configurações → Perfil → E-mail e solicite a alteração. Você receberá um link de confirmação no novo endereço.',
      },
    ],
  },
  {
    cat: 'Planos e pagamento',
    items: [
      {
        q: 'Quais formas de pagamento são aceitas?',
        a: 'Aceitamos cartão de crédito (Visa, Mastercard, Elo, American Express), Pix e boleto bancário. O pagamento é processado com segurança pelo Mercado Pago.',
      },
      {
        q: 'Meu pagamento foi recusado. O que acontece?',
        a: 'Verifique os dados do cartão e o limite disponível. Você pode tentar novamente em Configurações → Plano → Renovar. Em caso de dúvida, entre em contato com seu banco ou use outra forma de pagamento.',
      },
      {
        q: 'O plano gratuito tem limite de questões?',
        a: 'O plano gratuito dá acesso a funcionalidades básicas com limite de questões por dia. Para acesso ilimitado, upgrade para o plano Pro ou Elite.',
      },
      {
        q: 'Há desconto para estudantes?',
        a: 'Temos ofertas especiais periodicamente. Siga nossas redes sociais ou cadastre-se na newsletter para ser avisado das promoções.',
      },
    ],
  },
  {
    cat: 'Funcionalidades',
    items: [
      {
        q: 'Como funciona o Estudo Reverso?',
        a: 'Você enfrenta as questões primeiro, sem ter lido o conteúdo antes. Quando erra, a IA identifica exatamente o gap e entrega só o conteúdo que faltou. Isso fixa 3× mais do que ler e depois praticar.',
      },
      {
        q: 'A IA corrige redação de concurso público também?',
        a: 'Sim! Além do ENEM (5 competências), corrigimos redações no estilo das principais bancas como CESPE, FGV e FCC. O feedback é entregue em menos de 30 segundos.',
      },
      {
        q: 'Como funciona a Arena — Prova em Prática?',
        a: 'A Arena é um modo de duelo ao vivo onde você compete com outros concurseiros em tempo real. Funciona como uma prova real com placar ao vivo. Acesse pelo menu → Arena.',
      },
      {
        q: 'O cronograma funciona para qualquer concurso?',
        a: 'Sim. Você informa o cargo, a banca e a data da prova. A IA analisa o edital real e monta um plano de estudos personalizado com base nas matérias e no peso de cada uma.',
      },
    ],
  },
  {
    cat: 'App e instalação',
    items: [
      {
        q: 'Precisa de App Store ou Play Store?',
        a: 'Não! O AprovAI360 é um PWA (Progressive Web App). Você instala diretamente pelo navegador, sem precisar de loja de apps. Veja o guia completo em aprovai360.com.br/instalar.',
      },
      {
        q: 'Preciso de internet para usar o app?',
        a: 'Sim. O AprovAI360 é conectado ao banco de dados em tempo real, então é necessária conexão com internet para acessar questões, simulados, redações e todo o conteúdo da plataforma.',
      },
      {
        q: 'Como instalo no iPhone?',
        a: 'Abra o Safari em aprovai360.com.br → toque no botão de compartilhar (⬆) → "Adicionar à Tela de Início". Veja o passo a passo completo em aprovai360.com.br/instalar.',
      },
    ],
  },
];

const CHANNELS = [
  {
    icon: '📧',
    title: 'E-mail',
    desc: 'Resposta em até 24h úteis',
    action: 'suporte@aprovai360.com.br',
    href: 'mailto:suporte@aprovai360.com.br',
    label: 'Enviar e-mail',
  },
  {
    icon: '💬',
    title: 'WhatsApp',
    desc: 'Atendimento de seg–sex, 9h–18h',
    action: '+55 (xx) xxxxx-xxxx',
    href: 'https://wa.me/55',
    label: 'Abrir WhatsApp',
  },
  {
    icon: '📖',
    title: 'Central de ajuda',
    desc: 'Artigos e tutoriais completos',
    action: 'Acesse a base de conhecimento',
    href: '#',
    label: 'Acessar artigos',
  },
];

export default function SuportePage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="sup-root">
      {/* Nav */}
      <nav className="sup-nav">
        <Link href="/" className="sup-logo">
          Aprov<span>AI</span>360
        </Link>
        <div className="sup-nav-right">
          <Link href="/instalar" className="sup-nav-link">Instalar app</Link>
          <Link href="/login" className="sup-nav-link">Entrar</Link>
          <Link href="/cadastro" className="sup-cta-btn">Criar conta →</Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="sup-hero">
        <div className="sup-wrap">
          <div className="sup-eyebrow">Central de Suporte</div>
          <h1 className="sup-title">
            COMO PODEMOS<br /><span>AJUDAR?</span>
          </h1>
          <p className="sup-subtitle">
            Encontre respostas rápidas nas perguntas frequentes ou fale com a gente diretamente.
          </p>
        </div>
      </header>

      {/* Canais de contato */}
      <section className="sup-section">
        <div className="sup-wrap">
          <p className="sup-sec-label">Fale com a gente</p>
          <div className="sup-channels">
            {CHANNELS.map(c => (
              <a key={c.icon} href={c.href} target="_blank" rel="noopener noreferrer" className="sup-channel">
                <div className="sup-channel-icon">{c.icon}</div>
                <div className="sup-channel-body">
                  <strong>{c.title}</strong>
                  <span className="sup-channel-desc">{c.desc}</span>
                  <span className="sup-channel-action">{c.action}</span>
                </div>
                <div className="sup-channel-arrow">→</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sup-section">
        <div className="sup-wrap">
          <p className="sup-sec-label">Perguntas frequentes</p>
          <h2 className="sup-sec-title">Respostas rápidas</h2>

          {FAQS.map(cat => (
            <div key={cat.cat} className="sup-faq-cat">
              <h3 className="sup-faq-cat-title">{cat.cat}</h3>
              <div className="sup-faq-list">
                {cat.items.map(item => {
                  const id = `${cat.cat}-${item.q}`;
                  const isOpen = open === id;
                  return (
                    <div key={id} className={`sup-faq-item ${isOpen ? 'open' : ''}`}>
                      <button
                        className="sup-faq-q"
                        onClick={() => setOpen(isOpen ? null : id)}
                        aria-expanded={isOpen}
                      >
                        <span>{item.q}</span>
                        <span className="sup-faq-chevron">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="sup-faq-a">
                          <p>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Guia de instalação CTA */}
      <section className="sup-install-cta">
        <div className="sup-wrap sup-install-inner">
          <div>
            <strong>Quer instalar o app?</strong>
            <p>Guia passo a passo para iPhone, Android e computador.</p>
          </div>
          <Link href="/instalar" className="sup-install-btn">
            Ver guia de instalação →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="sup-footer">
        <div className="sup-wrap sup-footer-inner">
          <Link href="/">← Voltar para o site</Link>
          <div className="sup-footer-links">
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/instalar">Instalar app</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
