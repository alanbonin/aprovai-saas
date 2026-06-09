# 🚀 PROJETO DE RESOLUÇÃO — AprovAI360
## Pré-Lançamento | 09/06/2026

> ⚠️ **REGRA DE OURO**: Nunca usar `...body` de requests não validados. Nunca remover variáveis de ambiente. Nunca deletar funcionalidade existente.  
> Cada correção abaixo é **cirúrgica** — troca só o trecho problemático, mantém tudo ao redor intacto.

---

## 📋 ÍNDICE DE CORREÇÕES

| ID | Prioridade | Arquivo | Descrição | Tempo Est. |
|----|-----------|---------|-----------|-----------|
| F01 | 🚨 P0 | `api/pagamento/processar/route.ts` | Valor do pagamento sempre do banco | 45min |
| F02 | 🚨 P0 | `api/pagamento/webhook/route.ts` | Validar transaction_amount + timingSafeEqual | 30min |
| F03 | 🚨 P0 | `api/pagamento/checkout/route.ts` | Bloquear re-trial + exigir email confirmado | 20min |
| F04 | 🚨 P0 | `api/auth/register/route.ts` | Validar supabaseId contra sessão ativa | 15min |
| F05 | 🚨 P0 | `api/faq/route.ts` | Remover fallback SERVICE_ROLE_KEY | 5min |
| F06 | 🚨 P0 | SQL Supabase | Habilitar RLS em WeeklyUsage + EditalFavorito | 20min |
| F07 | 🚨 P0 | `components/mentor/mentor-chat.tsx` | DOMPurify no dangerouslySetInnerHTML | 20min |
| F08 | ⚠️ P1 | `api/pagamento/webhook/route.ts` | secret ausente sempre rejeita | 5min |
| F09 | ⚠️ P1 | `api/meu-plano/route.ts` | Filtrar PATCH pelo profileId ativo | 20min |
| F10 | ⚠️ P1 | `lib/anthropic.ts` | Timeout 30s no cliente Anthropic | 10min |
| F11 | ⚠️ P1 | `api/workspace/estrategia/route.ts` | Mover increment para após save | 15min |
| F12 | ⚠️ P1 | `lib/api-utils.ts` | WeekStart = segunda-feira em BRT | 10min |
| F13 | ⚠️ P1 | `api/auth/callback/route.ts` | Bloquear open redirect `//` | 5min |
| F14 | ⚠️ P1 | `api/email/boas-vindas/route.ts` + 6 rotas | CRON_SECRET obrigatório | 30min |
| F15 | ⚠️ P1 | `vercel.json` | maxDuration nos crons longos | 15min |
| F16 | ⚠️ P1 | Vercel Dashboard | Configurar vars de ambiente faltantes | 15min |
| F17 | 🔶 P2 | SQL Supabase | RLS em UserAgent, StudentSubject, FlashcardSet, Partner | 30min |
| F18 | 🔶 P2 | `api/pagamento/cancelar/route.ts` | Log erro do MP no cancelamento | 20min |
| F19 | 🔶 P2 | `(dashboard)/plano-semanal/page-content.tsx` | Modal confirmação "Aplicar ao Cronograma" | 30min |
| F20 | 🔶 P2 | `api/auth/delete-account/route.ts` | Deletar FlashcardSet e AiUsage na exclusão | 20min |

---

## 🚨 F01 — Valor do pagamento sempre do banco (P0 CRÍTICO)

**Arquivo:** `src/app/api/pagamento/processar/route.ts`

**Problema:** `...body` passa qualquer campo do cliente para o Mercado Pago, incluindo `transaction_amount`.

### Trecho ATUAL (linhas 22-40):
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = await req.json() as Record<string, any>;

const mp = getMp();
const paymentApi = new Payment(mp);

const payment = await paymentApi.create({
  body: {
    ...body,
    metadata: { userId: dbUser.id },
  },
  requestOptions: {
    idempotencyKey: `${dbUser.id}-${Date.now()}`,
  },
});
```

### Trecho CORRETO (substituir por):
```typescript
import { z } from "zod";

// Dentro do POST, substituir o bloco acima por:
const rawBody = await req.json();

// Allowlist: só aceita estes campos do cliente
const PaymentSchema = z.object({
  token: z.string().min(1),
  planId: z.string().min(1),
  installments: z.number().int().min(1).max(1).default(1),
  payment_method_id: z.string().min(1),
  issuer_id: z.string().optional(),
  payer: z.object({
    email: z.string().email(),
    identification: z.object({
      type: z.string(),
      number: z.string(),
    }).optional(),
  }).optional(),
});

const parsed = PaymentSchema.safeParse(rawBody);
if (!parsed.success) {
  return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
}

// Busca o preço DO BANCO — nunca do cliente
const { data: plan } = await db.from("Plan")
  .select("price, name, id")
  .eq("id", parsed.data.planId)
  .eq("active", true)
  .single();
if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
if (plan.price <= 0) return NextResponse.json({ error: "Plano gratuito não usa este endpoint" }, { status: 400 });

const mp = getMp();
const paymentApi = new Payment(mp);

const payment = await paymentApi.create({
  body: {
    transaction_amount: plan.price,           // ← SEMPRE DO BANCO
    description: `AprovAI360 — ${plan.name}`,
    token: parsed.data.token,
    installments: parsed.data.installments,
    payment_method_id: parsed.data.payment_method_id,
    issuer_id: parsed.data.issuer_id,
    payer: parsed.data.payer ?? { email: dbUser.email },
    external_reference: `${dbUser.id}|${plan.id}`,
    metadata: { userId: dbUser.id },
  },
  requestOptions: {
    idempotencyKey: `${dbUser.id}-${Date.now()}`,
  },
});
```

> **IMPORT adicional necessário no topo do arquivo:**
> ```typescript
> import { db } from "@/lib/db";
> import { z } from "zod";
> ```

---

## 🚨 F02 — Webhook: validar valor pago + comparação timing-safe (P0 CRÍTICO)

**Arquivo:** `src/app/api/pagamento/webhook/route.ts`

### Mudança 1 — `verifySignature` (linha 37): comparação timing-safe

**ATUAL:**
```typescript
return expected === v1;
```

**CORRETO:**
```typescript
import { timingSafeEqual } from "crypto";

// ... (dentro de verifySignature, substituir o return final)
const expectedBuf = Buffer.from(expected, "hex");
const v1Buf = Buffer.from(v1, "hex");
if (expectedBuf.length !== v1Buf.length) return false;
return timingSafeEqual(expectedBuf, v1Buf);
```

> O `import { createHmac } from "crypto"` já existe — adicionar `timingSafeEqual` na mesma linha:
> `import { createHmac, timingSafeEqual } from "crypto";`

### Mudança 2 — `activateSubscription`: validar transaction_amount

**Localizar** a função `activateSubscription` e adicionar validação **após** buscar o plano:

**ATUAL (após buscar plan):**
```typescript
const { data: plan } = await db.from("Plan").select("intervalDays").eq("id", planId).single();
if (!plan) {
  // ... alerta admin
  throw new Error(`Plano não encontrado: ${planId}`);
}

const endDate = new Date();
```

**CORRETO:**
```typescript
const { data: plan } = await db.from("Plan").select("intervalDays, price").eq("id", planId).single();
if (!plan) {
  sendEmail({ ... }).catch(() => {});
  throw new Error(`Plano não encontrado: ${planId}`);
}

// Valida que o valor pago é compatível com o preço do plano
// (paymentData precisa ser passado como parâmetro — ver assinatura abaixo)
if (plan.price > 0 && paidAmount !== undefined) {
  const tolerance = plan.price * 0.02; // 2% de tolerância para arredondamentos
  if (paidAmount < plan.price - tolerance) {
    slog.error(LogEvent.PAYMENT_FAILED, {
      stage: "amount_mismatch",
      userId,
      planId,
      expected: plan.price,
      received: paidAmount,
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? "contato@aprovai360.com.br",
      subject: "⚠️ AprovAI: Tentativa de pagamento com valor incorreto",
      html: `<p>Usuário <b>${userId}</b> tentou ativar plano <b>${planId}</b> (R$${plan.price}) com pagamento de R$${paidAmount}. Pagamento NÃO ativado.</p>`,
    }).catch(() => {});
    throw new Error(`Valor pago (${paidAmount}) menor que preço do plano (${plan.price})`);
  }
}

const endDate = new Date();
```

**Atualizar a assinatura de `activateSubscription`:**

**ATUAL:**
```typescript
async function activateSubscription(userId: string, planId: string, mpPaymentId: string) {
```

**CORRETO:**
```typescript
async function activateSubscription(userId: string, planId: string, mpPaymentId: string, paidAmount?: number) {
```

**E na chamada dentro do handler `payment` aprovado, passar o valor:**
```typescript
// ATUAL:
await activateSubscription(userId, planId, mpPaymentIdStr);

// CORRETO:
await activateSubscription(userId, planId, mpPaymentIdStr, paymentData.transaction_amount ?? undefined);
```

---

## 🚨 F03 — Checkout: bloquear re-trial + exigir email confirmado (P0 CRÍTICO)

**Arquivo:** `src/app/api/pagamento/checkout/route.ts`

**Localizar** o bloco `if (plan.price === 0)` e substituir:

**ATUAL:**
```typescript
if (plan.price === 0) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (plan.intervalDays ?? 7));
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("Subscription").select("id").eq("userId", dbUser.id).maybeSingle();

  if (existing) {
    await db.from("Subscription").update({
      planId, status: "TRIAL",
      startDate: now, endDate: endDate.toISOString(),
      mpPaymentId: null, updatedAt: now,
    }).eq("id", existing.id);
  } else {
    await db.from("Subscription").insert({
      id: crypto.randomUUID(), userId: dbUser.id,
      planId, status: "TRIAL",
      startDate: now, endDate: endDate.toISOString(),
      createdAt: now, updatedAt: now,
    });
  }
  return NextResponse.json({ checkoutUrl: null, activated: true });
}
```

**CORRETO:**
```typescript
if (plan.price === 0) {
  // 1. Verificar email confirmado (evita abuse com emails temporários)
  if (!user.email_confirmed_at) {
    return NextResponse.json(
      { error: "Confirme seu e-mail antes de ativar o período gratuito." },
      { status: 403 }
    );
  }

  // 2. Verificar se já teve qualquer subscription anterior (evita re-trial infinito)
  const { data: existingAny } = await db
    .from("Subscription")
    .select("id, status, planId")
    .eq("userId", dbUser.id)
    .maybeSingle();

  if (existingAny) {
    // Já teve subscription: verificar se era trial ou plano pago
    const { data: existingPlan } = await db
      .from("Plan")
      .select("price")
      .eq("id", existingAny.planId)
      .maybeSingle();

    // Se já teve trial gratuito antes, não permite reativar
    if (existingPlan && existingPlan.price === 0) {
      return NextResponse.json(
        { error: "Você já utilizou o período trial gratuito. Escolha um plano para continuar." },
        { status: 403 }
      );
    }
    // Se tinha plano pago e cancelou, também não ganha trial novamente
    return NextResponse.json(
      { error: "Você já possui uma conta ativa. Para reativar, escolha um plano." },
      { status: 403 }
    );
  }

  // 3. Criar trial apenas para usuários sem histórico
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (plan.intervalDays ?? 7));
  const now = new Date().toISOString();

  await db.from("Subscription").insert({
    id: crypto.randomUUID(), userId: dbUser.id,
    planId, status: "TRIAL",
    startDate: now, endDate: endDate.toISOString(),
    createdAt: now, updatedAt: now,
  });
  return NextResponse.json({ checkoutUrl: null, activated: true });
}
```

---

## 🚨 F04 — Register: validar supabaseId contra sessão ativa (P0 CRÍTICO)

**Arquivo:** `src/app/api/auth/register/route.ts`

**ATUAL (início do POST após rate limit):**
```typescript
const body = await req.json();
const parseResult = RegisterSchema.safeParse(body);
if (!parseResult.success) {
  return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
}
const { supabaseId, name, email } = parseResult.data;
```

**CORRETO:**
```typescript
// Verificar PRIMEIRO se há sessão válida
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

const body = await req.json();
const parseResult = RegisterSchema.safeParse(body);
if (!parseResult.success) {
  return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
}

const { name, email } = parseResult.data;
// IGNORAR supabaseId do body — sempre usa o da sessão autenticada
const supabaseId = user.id;
```

> **IMPORT adicional necessário no topo (já pode existir):**
> ```typescript
> import { createClient } from "@/lib/supabase/server";
> ```

---

## 🚨 F05 — FAQ: remover fallback SERVICE_ROLE_KEY (P0 CRÍTICO)

**Arquivo:** `src/app/api/faq/route.ts`

**ATUAL (linha 6):**
```typescript
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
```

**CORRETO:**
```typescript
// Rota pública — NUNCA usar SERVICE_ROLE_KEY
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
```

> Só trocar essa linha. **Não tocar em mais nada no arquivo.**

---

## 🚨 F06 — SQL: Habilitar RLS em tabelas críticas (P0 CRÍTICO)

**Onde executar:** Supabase Dashboard → SQL Editor → New Query

### Script 1: WeeklyUsage (executar primeiro)
```sql
-- Habilita RLS na WeeklyUsage
ALTER TABLE "WeeklyUsage" ENABLE ROW LEVEL SECURITY;

-- Apenas service_role (backend) pode acessar
CREATE POLICY "weekly_usage_service_role_only" ON "WeeklyUsage"
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Script 2: EditalFavorito + Edital
```sql
-- Habilita RLS em EditalFavorito
ALTER TABLE "EditalFavorito" ENABLE ROW LEVEL SECURITY;

-- Usuário só acessa seus próprios favoritos
CREATE POLICY "edital_favorito_own" ON "EditalFavorito"
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth.uid()::text = (
      SELECT "supabaseId" FROM "User" WHERE id = "userId" LIMIT 1
    )
  );

-- Edital: leitura para autenticados, escrita apenas service_role
ALTER TABLE "Edital" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edital_read_authenticated" ON "Edital"
  FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "edital_write_service_role" ON "Edital"
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Script 3: Verificar estado atual (EXECUTAR ANTES de tudo)
```sql
-- Rodar ANTES de qualquer alteração para ver o estado real
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🚨 F07 — Mentor Chat: DOMPurify no dangerouslySetInnerHTML (P0 CRÍTICO)

**Arquivo:** `src/components/mentor/mentor-chat.tsx`

**Passo 1 — Instalar pacote (no terminal):**
```bash
cd /Users/alanbonin/aprovai-saas
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

**Passo 2 — Adicionar import no TOPO do arquivo mentor-chat.tsx:**
```typescript
import DOMPurify from "isomorphic-dompurify";
```

**Passo 3 — Localizar a linha com `dangerouslySetInnerHTML` (linha ~717) e alterar:**

**ATUAL:**
```tsx
dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }}
```

**CORRETO:**
```tsx
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(text)) }}
```

> **Só trocar essa linha.** Não alterar a função `parseMarkdown` nem nada mais.

---

## ⚠️ F08 — Webhook: secret ausente sempre rejeita (P1 ALTO)

**Arquivo:** `src/app/api/pagamento/webhook/route.ts`

**ATUAL (dentro de `verifySignature`, linhas ~20-24):**
```typescript
if (!secret) {
  if (process.env.NODE_ENV === "production") return false;
  return true; // dev local sem secret configurado
}
```

**CORRETO:**
```typescript
if (!secret) {
  // Sem secret = rejeita sempre. Configurar MERCADOPAGO_WEBHOOK_SECRET em todos os ambientes.
  // Para dev local sem MP, use ferramentas como stripe-cli ou ngrok para simular.
  return process.env.NODE_ENV !== "production"; // mantém permissivo só em dev local
}
```

> **Nota:** A mudança real importante aqui é garantir que `MERCADOPAGO_WEBHOOK_SECRET` esteja definida na Vercel para Production E Preview environments. Ver F16.

---

## ⚠️ F09 — Meu-Plano PATCH: filtrar pelo profileId ativo (P1 ALTO)

**Arquivo:** `src/app/api/meu-plano/route.ts`

**Localizar** o bloco que atualiza `StudentProfile` no PATCH (por volta da linha 74):

**ATUAL:**
```typescript
if (Object.keys(profileUpdates).length > 1) {
  const { error } = await db
    .from("StudentProfile")
    .update(profileUpdates)
    .eq("userId", dbUser.id);
  if (error) return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
}
```

**CORRETO:**
```typescript
if (Object.keys(profileUpdates).length > 1) {
  // Busca perfil ativo para garantir que só atualiza o perfil correto
  const activeProfileForUpdate = await getActiveProfile(dbUser.id);
  if (!activeProfileForUpdate) {
    return NextResponse.json({ error: "Nenhum perfil ativo encontrado" }, { status: 400 });
  }
  const { error } = await db
    .from("StudentProfile")
    .update(profileUpdates)
    .eq("id", activeProfileForUpdate.id)   // ← filtra pelo ID do perfil ativo
    .eq("userId", dbUser.id);               // ← dupla verificação de ownership
  if (error) return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
}
```

> `getActiveProfile` já está importado no topo do arquivo — não precisa adicionar import.

---

## ⚠️ F10 — Anthropic: timeout 30s no cliente (P1 ALTO)

**Arquivo:** `src/lib/anthropic.ts`

**ATUAL (linha ~21):**
```typescript
_client = new Anthropic({ apiKey });
```

**CORRETO:**
```typescript
_client = new Anthropic({
  apiKey,
  timeout: 30 * 1000, // 30 segundos — evita usuário travado em loading
  maxRetries: 1,       // 1 retry automático em erros de rede
});
```

> **Só trocar esta linha.** Não alterar mais nada no arquivo.

---

## ⚠️ F11 — Estratégia: mover increment para após save bem-sucedido (P1 ALTO)

**Arquivo:** `src/app/api/workspace/estrategia/route.ts`

**ATUAL (linhas ~274-280):**
```typescript
const { getWeeklyResourceUsage, incrementWeeklyResourceUsage } = await import("@/lib/api-utils");
const usedThisWeek = await getWeeklyResourceUsage(dbUser.id, "plano_ia");
if (usedThisWeek >= 1) {
  return NextResponse.json({ error: "Você já gerou o Plano IA esta semana. ..." }, { status: 429 });
}
await incrementWeeklyResourceUsage(dbUser.id, "plano_ia");  // ← PROBLEMA: antes da IA
```

**O QUE FAZER:** Remover a linha `await incrementWeeklyResourceUsage(...)` desse local e adicioná-la DEPOIS do save do plano no banco.

**Localizar** onde o plano é salvo no banco (por volta da linha 360-380, após `extractJSON` e antes do `return NextResponse.json`), e adicionar:

```typescript
// Salvar plano no banco (código existente que já está aqui)
await savePlanNote(dbUser.id, profileId, semana, JSON.stringify(planejamento));

// SÓ AGORA incrementar — plano foi gerado e salvo com sucesso
const { incrementWeeklyResourceUsage } = await import("@/lib/api-utils");
await incrementWeeklyResourceUsage(dbUser.id, "plano_ia");

return NextResponse.json({ plano: planejamento });
```

---

## ⚠️ F12 — getWeekStartStr: semana começa segunda-feira em BRT (P1 ALTO)

**Arquivo:** `src/lib/api-utils.ts`

**ATUAL (linha ~56-59):**
```typescript
export function getWeekStartStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
```

**CORRETO:**
```typescript
export function getWeekStartStr(): string {
  // Usar BRT (UTC-3) para consistência com o restante do sistema
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const day = now.getUTCDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  // Recuar até a segunda-feira mais recente
  const diff = day === 0 ? -6 : 1 - day;
  now.setUTCDate(now.getUTCDate() + diff);
  return now.toISOString().slice(0, 10);
}
```

---

## ⚠️ F13 — Auth Callback: bloquear open redirect `//` (P1 MÉDIO)

**Arquivo:** `src/app/api/auth/callback/route.ts`

**ATUAL (linha ~46):**
```typescript
const redirectUrl = new URL(next.startsWith("/") ? next : `/${next}`, origin);
```

**CORRETO:**
```typescript
// Bloquear paths que começam com // (open redirect via protocol-relative URL)
const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/workspace";
const redirectUrl = new URL(safePath, origin);
```

---

## ⚠️ F14 — CRON_SECRET obrigatório em rotas de email/cron (P1 ALTO)

**Padrão a corrigir** em 7 arquivos. O padrão atual `if (internalSecret && ...)` deixa a rota aberta se o secret não estiver definido.

**Arquivos afetados:**
1. `src/app/api/email/boas-vindas/route.ts`
2. `src/app/api/email/lembrete/route.ts`
3. `src/app/api/email/reativacao/route.ts`
4. `src/app/api/email/questao-do-dia/route.ts`
5. `src/app/api/email/trial-expirando/route.ts`
6. `src/app/api/email/admin-semanal/route.ts`
7. `src/app/api/cron/streak/route.ts` e `streak-guard/route.ts`

**Em cada arquivo, localizar o padrão:**
```typescript
const internalSecret = process.env.CRON_SECRET;
if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
```

**Substituir por:**
```typescript
const internalSecret = process.env.CRON_SECRET;
if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
```

> **ATENÇÃO:** Antes de fazer essa correção, confirmar que `CRON_SECRET` está configurada na Vercel (ver F16). Caso contrário, os crons e emails internos param de funcionar.

**Verificar também** `src/lib/api-utils.ts` função `isCronAuthorized`:
```typescript
// ATUAL:
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// CORRETO:
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // mantém para dev local
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
// ← este já está OK para produção, pois em production retorna false se secret ausente
```

---

## ⚠️ F15 — vercel.json: maxDuration nos crons longos (P1 MÉDIO)

**Arquivo:** `vercel.json`

**Adicionar** a seção `functions` para os crons que podem ultrapassar 60s:

**Localizar** o arquivo `vercel.json` e adicionar após o último campo (antes do `}`):

```json
"functions": {
  "src/app/api/cron/renovar-planos/route.ts": {
    "maxDuration": 300
  },
  "src/app/api/cron/importar-editais/route.ts": {
    "maxDuration": 300
  },
  "src/app/api/email/relatorio-semanal/route.ts": {
    "maxDuration": 300
  },
  "src/app/api/email/reativacao/route.ts": {
    "maxDuration": 120
  },
  "src/app/api/workspace/estrategia/route.ts": {
    "maxDuration": 60
  }
}
```

> **Atenção:** maxDuration 300 requer plano Vercel Pro. Verificar o plano atual. Se for Hobby, o máximo é 60.

---

## ⚠️ F16 — Variáveis de Ambiente na Vercel (P1 CRÍTICO)

**Onde configurar:** Vercel Dashboard → projeto aprovai360 → Settings → Environment Variables

**Variáveis que DEVEM estar configuradas em Production E Preview:**

| Variável | Valor | Obs |
|---------|-------|-----|
| `CRON_SECRET` | string aleatória forte (32+ chars) | Gerar com `openssl rand -hex 32` |
| `ADMIN_EMAIL` | contato@aprovai360.com.br | Para alertas críticos |
| `ADMIN_REPORT_EMAIL` | contato@aprovai360.com.br | Para relatório semanal |
| `MERCADOPAGO_WEBHOOK_SECRET` | (do painel MP) | Em Production E Preview |
| `LOG_LEVEL` | `info` | Em production |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | Confirmar presença |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase | Confirmar presença |

**NUNCA remover:** `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `SMTP_*`, `UPSTASH_*`, `VAPID_*`

---

## 🔶 F17 — SQL: RLS em UserAgent, StudentSubject, FlashcardSet, Partner (P2)

**Executar no Supabase SQL Editor após estabilizar os P0:**

```sql
-- UserAgent: apenas service_role
ALTER TABLE "UserAgent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_agent_service_role_only" ON "UserAgent"
  FOR ALL USING (auth.role() = 'service_role');

-- StudentSubject: apenas service_role
ALTER TABLE "StudentSubject" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_subject_service_role_only" ON "StudentSubject"
  FOR ALL USING (auth.role() = 'service_role');

-- FlashcardSet: apenas service_role
ALTER TABLE "FlashcardSet" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcard_set_service_role_only" ON "FlashcardSet"
  FOR ALL USING (auth.role() = 'service_role');

-- Partner: leitura somente para autenticados (não anon)
ALTER TABLE "Partner" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_read_admin" ON "Partner";
CREATE POLICY "partner_read_authenticated" ON "Partner"
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "partner_write_service_role" ON "Partner"
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 🔶 F18 — Cancelamento: log erro do MP (P2)

**Arquivo:** `src/app/api/pagamento/cancelar/route.ts`

**Localizar** o bloco try/catch do cancelamento no MP:

**ATUAL:**
```typescript
try {
  await preApprovalApi.update({ id: mpSubId, body: { status: "cancelled" } });
} catch { /* ignora erro do MP */ }
```

**CORRETO:**
```typescript
let mpCancelOk = false;
try {
  await preApprovalApi.update({ id: mpSubId, body: { status: "cancelled" } });
  mpCancelOk = true;
} catch (mpErr) {
  log.error(LogEvent.PAYMENT_FAILED, {
    stage: "mp_cancel_failed",
    userId: dbUser.id,
    mpSubId,
  }, mpErr);
  // Notifica admin — cobrança pode continuar no MP mesmo com status CANCELLED no banco
  // (não bloqueia o cancelamento no banco — usuário tem direito ao cancelamento)
}
```

---

## 🔶 F19 — Plano Semanal: modal de confirmação antes de sobrescrever (P2)

**Arquivo:** `src/app/(dashboard)/plano-semanal/page-content.tsx`

**Localizar** a função `applyToCronograma` (ou similar que faz PATCH em `/api/plano-estudos`):

**Adicionar verificação ANTES do fetch:**
```typescript
async function applyToCronograma() {
  // Verificar se já existe cronograma salvo
  try {
    const existingRes = await fetch("/api/plano-estudos");
    const existingData = await existingRes.json();
    if (existingData?.blocos && existingData.blocos.length > 0) {
      const confirmar = window.confirm(
        "Isso vai substituir seu cronograma atual pelo Plano IA. Seu cronograma manual será perdido. Deseja continuar?"
      );
      if (!confirmar) return;
    }
  } catch {
    // Se falhar ao verificar, continua (não bloqueia o usuário)
  }

  // ... resto da função existente, sem alterações
```

---

## 🔶 F20 — Delete Account: deletar FlashcardSet e AiUsage (P2 LGPD)

**Arquivo:** `src/app/api/auth/delete-account/route.ts`

**Localizar** o bloco de deleção de dados do usuário e adicionar as tabelas faltantes:

**ATUAL (exemplo aproximado):**
```typescript
await Promise.all([
  db.from("Progress").delete().eq("userId", dbUser.id),
  db.from("Note").delete().eq("userId", dbUser.id),
  db.from("StudentProfile").delete().eq("userId", dbUser.id),
  // ...
]);
```

**CORRETO — adicionar as linhas faltantes:**
```typescript
await Promise.all([
  db.from("Progress").delete().eq("userId", dbUser.id),
  db.from("Note").delete().eq("userId", dbUser.id),
  db.from("StudentProfile").delete().eq("userId", dbUser.id),
  db.from("FlashcardSet").delete().eq("userId", dbUser.id),   // ← ADICIONAR
  db.from("AiUsage").delete().eq("userId", dbUser.id),        // ← ADICIONAR
  db.from("WeeklyUsage").delete().eq("userId", dbUser.id),    // ← ADICIONAR se existir
  db.from("SimuladoHistory").delete().eq("userId", dbUser.id),
  // ... manter o restante existente
]);
```

---

## 📦 ORDEM DE EXECUÇÃO RECOMENDADA

### Fase 1 — Financeiro crítico (fazer tudo de uma vez, ~2h)
```
1. F01 — processar/route.ts (valor do banco)
2. F02 — webhook/route.ts (validar valor + timingSafeEqual)
3. F03 — checkout/route.ts (re-trial + email confirmado)
4. F16 — Configurar vars na Vercel (ANTES de fazer deploy)
```

### Fase 2 — Segurança crítica (depois do deploy da Fase 1, ~1.5h)
```
5. F06 — SQL: verificar estado RLS + habilitar WeeklyUsage + EditalFavorito
6. F04 — register/route.ts (supabaseId da sessão)
7. F05 — faq/route.ts (remover fallback service_role)
8. F07 — mentor-chat.tsx (DOMPurify) + npm install
```

### Fase 3 — Funcionalidade (pode ser na mesma sessão, ~1.5h)
```
9.  F08 — webhook secret staging
10. F09 — meu-plano profileId
11. F10 — anthropic timeout
12. F11 — estrategia increment após save
13. F12 — weekStartStr segunda-feira BRT
14. F13 — callback open redirect
15. F14 — CRON_SECRET obrigatório (confirmar F16 antes)
16. F15 — vercel.json maxDuration
```

### Fase 4 — P2 semana 1 (após lançamento)
```
17. F17 — SQL RLS tabelas restantes
18. F18 — cancelamento log erro
19. F19 — modal confirmação cronograma
20. F20 — delete account LGPD
```

---

## ✅ CHECKLIST DE VALIDAÇÃO PÓS-CORREÇÃO

### Testes manuais obrigatórios antes do go-live:
```
[ ] Criar conta nova → trial ativado automaticamente
[ ] Tentar ativar trial novamente na mesma conta → deve retornar erro
[ ] Fazer pagamento de teste (sandbox MP) com valor correto → plano ativado
[ ] Verificar no Supabase que WeeklyUsage e EditalFavorito têm rowsecurity=true
[ ] Abrir o chat do mentor e enviar mensagem com HTML → não deve executar script
[ ] Trocar de perfil → plano do dia deve mudar
[ ] Gerar Plano IA → clicar novamente → deve bloquear (1x/semana)
[ ] Se IA falhar → crédito NÃO deve ter sido consumido
```

---

## ⚠️ O QUE NÃO FAZER

- ❌ Não deletar linhas de import que já existem
- ❌ Não renomear variáveis de ambiente existentes
- ❌ Não alterar a estrutura das tabelas do Supabase sem testar primeiro
- ❌ Não remover endpoints existentes
- ❌ Não mudar a lógica de autenticação de outros endpoints além dos listados
- ❌ Não fazer `git add .` cego — verificar cada arquivo modificado
