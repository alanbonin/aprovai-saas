# Contexto de Sessão — AprovAI SaaS Admin Pages
**Data:** 2026-05-30

## O que foi feito nesta sessão

### Problema resolvido: `system-config.ts` importado em client component
- **Causa raiz:** `configuracoes-client.tsx` ("use client") importava `CONFIG_DEFAULTS` de `@/lib/system-config`, que por sua vez importa `db` com `SUPABASE_SERVICE_ROLE_KEY`. Em produção no Next.js, isso causa erro em runtime.
- **Solução aplicada:**
  1. Criado `src/lib/config-defaults.ts` — só as constantes, sem dependência server-only
  2. `configuracoes-client.tsx` agora importa de `@/lib/config-defaults` (seguro no cliente)
  3. `system-config.ts` re-exporta de `config-defaults` para não quebrar outras importações

### Status atual dos arquivos relevantes

| Arquivo | Status |
|---|---|
| `src/lib/config-defaults.ts` | ✅ Criado — só constantes, sem deps server |
| `src/lib/system-config.ts` | ✅ Re-exporta de config-defaults |
| `src/app/(admin)/admin/configuracoes/configuracoes-client.tsx` | ✅ Importa de config-defaults |
| `src/app/(admin)/admin/configuracoes/page.tsx` | ✅ Erro de tipo corrigido |

---

## Problemas AINDA NÃO RESOLVIDOS (próxima sessão começa aqui)

### 1. Página `/admin/configuracoes` — problema visual
- **Sintoma:** A página abre, mas está com cores ruins / ilegível
- **Causa:** Os componentes têm cores hardcoded dark (`bg-slate-800`, `text-slate-400`, etc.) sem suporte a light mode. O admin está em "Modo Claro", então os inputs ficam com contraste ruim.
- **Arquivo:** `src/app/(admin)/admin/configuracoes/configuracoes-client.tsx`
- **Solução sugerida:** Forçar dark mode na página inteira adicionando `dark` class no wrapper, ou adicionar `dark:` variants onde necessário. A abordagem mais simples é envolver o componente raiz com `<div className="dark bg-slate-900 min-h-screen">`.

### 2. Página `/admin/emails` — erro persistente
- **Sintoma:** Continua dando o mesmo erro após o deploy
- **Arquivo do cliente:** `src/app/(admin)/admin/emails/emails-client.tsx`
- **API:** `src/app/api/admin/email-templates/route.ts`
- **O que fazer:**
  1. Verificar o erro exato no Vercel (Runtime Logs) ou no console do browser
  2. A API usa `db.from("Note")` para armazenar templates com prefix `__EMAIL_TEMPLATE__:` — verificar se a tabela `Note` existe no banco e tem os campos `subjectId`, `content`, `updatedAt`
  3. A autenticação admin usa `requireAdmin()` que busca `User.role === "ADMIN"` — garantir que o usuário logado tem role ADMIN no banco
  4. O `emails-client.tsx` faz fetch em `/api/admin/email-templates` — verificar se o erro é 403 (sem permissão) ou 500 (erro server)

---

## Arquitetura do projeto

- **Projeto:** `/Users/alanbonin/aprovai-saas`
- **Stack:** Next.js (App Router) + Supabase + Prisma + Anthropic Claude API
- **Auth:** Supabase Auth
- **Deploy:** Vercel
- **Admin layout:** `src/app/(admin)/`
- **DB client:** `src/lib/db.ts` (usa SUPABASE_SERVICE_ROLE_KEY — server-only)
- **Supabase client (browser):** `src/lib/supabase/client.ts`
- **Supabase client (server):** `src/lib/supabase/server.ts`

## Próximos passos recomendados

1. **Fix visual configurações:** Abrir `configuracoes-client.tsx`, encontrar o wrapper raiz do JSX e adicionar `className="dark"` ou mudar para `bg-gray-950` com cores explícitas dark.
2. **Debug emails:** Abrir o browser no `/admin/emails`, ver o erro exato no console (F12), checar se é 403 ou 500, e investigar a rota API.
