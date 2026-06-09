'use client';

import Link from 'next/link';
import { useState } from 'react';
import './instalar.css';

type OS = 'android' | 'ios' | 'desktop';

const STEPS: Record<OS, { icon: string; title: string; steps: { num: string; title: string; desc: string; tip?: string }[] }> = {
  android: {
    icon: '🤖',
    title: 'Android (Chrome)',
    steps: [
      {
        num: '01',
        title: 'Abra o Chrome',
        desc: 'Acesse aprovai360.com.br pelo navegador Chrome no seu Android. Certifique-se de estar logado na sua conta.',
        tip: 'Funciona no Chrome, Edge e Samsung Internet',
      },
      {
        num: '02',
        title: 'Toque nos 3 pontinhos',
        desc: 'No canto superior direito do Chrome, toque no ícone de menu (⋮). O menu de opções vai aparecer.',
      },
      {
        num: '03',
        title: 'Toque em "Instalar aplicativo"',
        desc: 'Procure a opção "Instalar aplicativo" ou "Adicionar à tela inicial" e toque nela.',
        tip: 'Em alguns aparelhos aparece como "Adicionar à tela inicial"',
      },
      {
        num: '04',
        title: 'Confirme a instalação',
        desc: 'Uma janela vai aparecer mostrando o nome "AprovAI360". Toque em "Instalar" para confirmar.',
      },
      {
        num: '05',
        title: 'Pronto! App instalado',
        desc: 'O ícone do AprovAI360 vai aparecer na sua tela inicial. Abra e estude como um app nativo, sem precisar do navegador.',
      },
    ],
  },
  ios: {
    icon: '🍎',
    title: 'iPhone / iPad',
    steps: [
      {
        num: '01',
        title: 'Abra o Safari ou Chrome',
        desc: 'Acesse aprovai360.com.br pelo Safari ou Chrome no seu iPhone/iPad. Certifique-se de estar logado na sua conta.',
        tip: 'Funciona no Safari e no Chrome',
      },
      {
        num: '02',
        title: 'Toque em Compartilhar',
        desc: 'Na barra inferior do Safari, toque no ícone de compartilhamento — é o quadrado com uma seta para cima (⬆).',
      },
      {
        num: '03',
        title: 'Role até "Adicionar à Tela de Início"',
        desc: 'No menu que abrir, role para baixo até encontrar a opção "Adicionar à Tela de Início" com um ícone de mais (+).',
      },
      {
        num: '04',
        title: 'Confirme o nome e instale',
        desc: 'O nome "AprovAI360" já vem preenchido. Toque em "Adicionar" no canto superior direito para confirmar.',
      },
      {
        num: '05',
        title: 'Pronto! App na tela inicial',
        desc: 'O ícone do AprovAI360 vai aparecer na sua tela inicial. Abra como qualquer outro app — sem barra do Safari.',
      },
    ],
  },
  desktop: {
    icon: '💻',
    title: 'Computador (Chrome / Edge)',
    steps: [
      {
        num: '01',
        title: 'Abra o Chrome ou Edge',
        desc: 'Acesse aprovai360.com.br pelo Chrome ou Microsoft Edge no seu computador.',
        tip: 'Não funciona no Firefox ou Safari no Mac',
      },
      {
        num: '02',
        title: 'Clique no ícone de instalação',
        desc: 'Na barra de endereços, procure o ícone de instalar (um monitor com seta ↓ ou um "+" no canto direito da barra). Clique nele.',
        tip: 'Se não aparecer, use o menu ⋮ → "Instalar AprovAI360"',
      },
      {
        num: '03',
        title: 'Confirme a instalação',
        desc: 'Uma janela vai aparecer perguntando se deseja instalar o AprovAI360. Clique em "Instalar".',
      },
      {
        num: '04',
        title: 'Pronto! App no desktop',
        desc: 'O AprovAI360 abre em janela própria, sem abas do navegador. Pode fixar na barra de tarefas para acesso rápido.',
      },
    ],
  },
};

const BENEFITS = [
  { icon: '⚡', title: 'Carregamento instantâneo', desc: 'O app carrega mesmo com conexão lenta — conteúdo fica em cache.' },
  { icon: '🚀', title: 'Carrega mais rápido', desc: 'App instalado abre direto, sem digitar URL, com carregamento otimizado.' },
  { icon: '🔔', title: 'Notificações de estudo', desc: 'Receba lembretes diários da sua trilha de estudos.' },
  { icon: '🖥️', title: 'Sem barra do navegador', desc: 'Tela cheia, foco total — igual a um app nativo.' },
  { icon: '🏠', title: 'Acesso direto', desc: 'Ícone na tela inicial. Um toque e já está estudando.' },
  { icon: '🔒', title: 'Seguro como app nativo', desc: 'Usa HTTPS e dados ficam no seu dispositivo.' },
];

export default function InstalarPage() {
  const [os, setOs] = useState<OS>('android');
  const current = STEPS[os];

  return (
    <div className="inst-root">
      {/* Nav mínima */}
      <nav className="inst-nav">
        <Link href="/" className="inst-logo">
          Aprov<span>AI</span>360
        </Link>
        <Link href="/cadastro" className="inst-cta-btn">
          Criar conta grátis →
        </Link>
      </nav>

      {/* Hero */}
      <header className="inst-hero">
        <div className="inst-wrap">
          <div className="inst-eyebrow">Instalar o App</div>
          <h1 className="inst-title">
            LEVE O <span>APROVAI360</span><br />
            NO SEU CELULAR
          </h1>
          <p className="inst-subtitle">
            Instale como app nativo — sem precisar de App Store ou Play Store.
            Funciona no iPhone, Android e computador em menos de 1 minuto.
          </p>
        </div>
      </header>

      {/* Benefícios */}
      <section className="inst-section">
        <div className="inst-wrap">
          <p className="inst-sec-label">Por que instalar?</p>
          <div className="inst-benefits">
            {BENEFITS.map(b => (
              <div key={b.icon} className="inst-benefit">
                <span className="inst-benefit-icon">{b.icon}</span>
                <div>
                  <strong>{b.title}</strong>
                  <span>{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guia de instalação */}
      <section className="inst-section">
        <div className="inst-wrap">
          <p className="inst-sec-label">Passo a passo</p>
          <h2 className="inst-sec-title">Escolha seu dispositivo</h2>

          {/* Seletor de OS */}
          <div className="inst-os-tabs">
            {(Object.keys(STEPS) as OS[]).map(key => (
              <button
                key={key}
                className={`inst-os-tab ${os === key ? 'active' : ''}`}
                onClick={() => setOs(key)}
              >
                <span>{STEPS[key].icon}</span>
                <span>{STEPS[key].title}</span>
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="inst-steps">
            {current.steps.map((step, i) => (
              <div key={step.num} className="inst-step" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="inst-step-num">{step.num}</div>
                <div className="inst-step-body">
                  <h3 className="inst-step-title">{step.title}</h3>
                  <p className="inst-step-desc">{step.desc}</p>
                  {step.tip && (
                    <div className="inst-step-tip">
                      <span>💡</span> {step.tip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="inst-cta-section">
        <div className="inst-wrap inst-cta-inner">
          <h2 className="inst-cta-title">Não tem conta ainda?</h2>
          <p className="inst-cta-desc">Crie sua conta grátis em 2 minutos e já instale o app.</p>
          <div className="inst-cta-btns">
            <Link href="/cadastro" className="inst-btn-primary">Criar conta grátis →</Link>
            <Link href="/login" className="inst-btn-ghost">Já tenho conta</Link>
          </div>
        </div>
      </section>

      {/* Footer simples */}
      <footer className="inst-footer">
        <div className="inst-wrap">
          <Link href="/">← Voltar para o site</Link>
          <span>·</span>
          <Link href="/suporte">Preciso de ajuda</Link>
        </div>
      </footer>
    </div>
  );
}
