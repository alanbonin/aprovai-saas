# Handoff — AprovAI360 (aprovai360.com.br)

## Stack
- **Next.js 16.2.6** com flag `--webpack` (Turbopack causa bug no Vercel)
- **Supabase** (SSR via `@supabase/ssr@0.10.3`)
- **Vercel** (projeto `aprovai-saas`, domínio `aprovai360.com.br`)
- **Claude API** (Anthropic), **Mercado Pago**, **Resend**
- Repo local: `/Users/alanbonin/aprovai-saas`

---

## Estado atual do sistema
- ✅ App funcionando em produção
- ✅ Login funcionando
- ✅ Bottom nav mobile ativo (Hoje / Semana / Estudar / Simulado / Mais)
- ✅ Links "Questões" na página /hoje apontam para /workspace
- ✅ Pomodoro float com altura limitada (não corta no topo)
- Commit atual: `main` no GitHub, último deploy no Vercel via CLI

---

## Variáveis de ambiente no Vercel (produção)
Todas configuradas e funcionando:
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (ver Vercel Dashboard)
- `SUPABASE_ANON_KEY` = mesmo valor acima
- `SUPABASE_SERVICE_ROLE_KEY` = (ver Vercel Dashboard — nunca commitar)
- `ANTHROPIC_API_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `VAPID_*`, `SMTP_*`, `EMAIL_FROM`, `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`

---

## Arquivos-chave

| Arquivo | Descrição |
|---|---|
| `src/proxy.ts` | Middleware real — auth, cron, security headers. **Sem** subscription redirect (removido) |
| `src/middleware.ts` | Só re-exporta: `export { proxy as middleware } from "@/proxy"` |
| `src/app/(dashboard)/layout.tsx` | Layout do dashboard — busca user, plano, onboarding, AI credits |
| `src/components/layout/sidebar.tsx` | Sidebar desktop + bottom nav mobile |
| `src/components/layout/pomodoro-float.tsx` | Botão flutuante do pomodoro |
| `src/app/(dashboard)/hoje/page.tsx` | Página principal — links apontam para /workspace |
| `src/lib/db.ts` | Supabase REST client (não Prisma em runtime) |

---

## Decisões técnicas importantes

1. **`--webpack` no build**: O `package.json` tem `"build": "next build --webpack"`. Sem essa flag o Turbopack omite o `middleware.js.nft.json` e o middleware não funciona no Vercel.

2. **Chaves Supabase novas**: O projeto migrou para o formato `sb_publishable_` / `sb_secret_`. As chaves JWT antigas (`eyJ...`) não estão mais disponíveis.

3. **Subscription redirect removido**: O bloco que verificava assinatura ativa no `proxy.ts` foi removido. A verificação de plano fica no `layout.tsx` do dashboard.

4. **`middleware.ts` não estava no git** na manhã de 04/06 — foi adicionado ao repo posteriormente.

5. **`DATABASE_URL`** só é necessário para `prisma migrate`. Em runtime o app usa Supabase REST diretamente via `src/lib/db.ts`.

---

## Como fazer deploy
```bash
cd /Users/alanbonin/aprovai-saas
git add . && git commit -m "mensagem"
git push
vercel deploy --prod
```

---

## Obsidian Wiki
- Hub: `~/Documents/Obsidian Vault/`
- Tópico AprovAI: `~/Documents/Obsidian Vault/topics/aprovai/`
- Índice: `~/Documents/Obsidian Vault/aprovai.md`
- Log: `~/Documents/Obsidian Vault/topics/aprovai/log.md`

---

## O que pode precisar de atenção
- Fundo branco no iOS light mode (visual, não funcional) — usuário preferiu deixar por ora
- Pomodoro float: confirmar se o fix de altura resolveu o corte no topo
