/**
 * Cliente Anthropic centralizado com prompt caching.
 *
 * Prompt caching reduz custo em ~80% e latência em ~20% quando o mesmo
 * system prompt é reutilizado em múltiplas chamadas (TTL: 5 minutos).
 *
 * Uso:
 *   import { getAnthropic, cachedSystem, withCache } from "@/lib/anthropic";
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";

// ── Singleton ────────────────────────────────────────────────────────────────
let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ── Modelos ──────────────────────────────────────────────────────────────────
export const MODELS = {
  sonnet: "claude-sonnet-4-5",
  haiku:  "claude-haiku-4-5-20251001",
  opus:   "claude-opus-4-5",
} as const;

// ── Restrições globais da plataforma ─────────────────────────────────────────
/**
 * Regras obrigatórias injetadas automaticamente em TODOS os system prompts.
 * Garantem que a IA nunca sugira recursos que não existem na plataforma.
 *
 * Para adicionar novas restrições, basta incluir aqui — todas as rotas
 * herdam automaticamente sem nenhuma alteração individual.
 */
export const PLATFORM_CONSTRAINTS = `

## RESTRIÇÕES OBRIGATÓRIAS DA PLATAFORMA APROVAI
Estas regras têm prioridade máxima e nunca podem ser ignoradas:

1. NUNCA sugira assistir vídeos, videoaulas, YouTube, cursos em vídeo ou qualquer conteúdo audiovisual. A plataforma Aprovai é 100% baseada em texto: questões, flashcards, resumos e materiais escritos.
2. Quando recomendar estudo de conteúdo, direcione SEMPRE para: questões comentadas, flashcards, resumos escritos, artigos, materiais em PDF ou leitura de legislação — NUNCA vídeos.
3. NUNCA mencione outras plataformas, aplicativos ou sites externos (Gran Cursos, Estratégia, Qconcursos, etc.).
4. Todas as sugestões de estudo devem ser executáveis DENTRO da plataforma Aprovai.
`;

/**
 * Combina o system prompt da rota com as restrições globais.
 * Chamado internamente — não precisa ser usado diretamente nas rotas.
 */
function applyConstraints(systemPrompt: string): string {
  return systemPrompt + PLATFORM_CONSTRAINTS;
}

// ── Helpers de cache ─────────────────────────────────────────────────────────

/**
 * Converte uma string de system prompt em bloco com cache_control.
 * Use quando o system prompt é grande e reutilizado (>1024 tokens).
 */
export function cachedSystem(text: string): TextBlockParam[] {
  return [
    {
      type: "text",
      text,
      cache_control: { type: "ephemeral" },
    } as TextBlockParam,
  ];
}

/**
 * Cria um bloco de user message com cache_control para contexto estático grande
 * (ex: conteúdo programático, banco de dados de matérias).
 * Só vale a pena se o bloco tiver >1024 tokens e for reutilizado.
 */
export function cachedUserBlock(text: string): TextBlockParam {
  return {
    type: "text",
    text,
    cache_control: { type: "ephemeral" },
  } as TextBlockParam;
}

// ── Wrappers de chamada ──────────────────────────────────────────────────────

export interface CachedCreateOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt: string;
  messages: MessageParam[];
  /** Se true, marca o system prompt com cache_control */
  cacheSystem?: boolean;
}

/**
 * messages.create com prompt caching no system prompt.
 * Equivalente a anthropic.messages.create() mas com cache no system.
 */
export async function createWithCache(opts: CachedCreateOptions) {
  const anthropic = getAnthropic();
  const {
    model = MODELS.sonnet,
    maxTokens = 2048,
    systemPrompt,
    messages,
    cacheSystem = true,
  } = opts;

  const fullPrompt = applyConstraints(systemPrompt);

  return anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: cacheSystem ? cachedSystem(fullPrompt) : fullPrompt,
    messages,
  });
}

/**
 * messages.stream com prompt caching no system prompt.
 * Para respostas em streaming (chat ao vivo).
 */
export function streamWithCache(opts: CachedCreateOptions) {
  const anthropic = getAnthropic();
  const {
    model = MODELS.sonnet,
    maxTokens = 2048,
    systemPrompt,
    messages,
    cacheSystem = true,
  } = opts;

  const fullPrompt = applyConstraints(systemPrompt);

  return anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: cacheSystem ? cachedSystem(fullPrompt) : fullPrompt,
    messages,
  });
}

// ── Extração de JSON da resposta ─────────────────────────────────────────────

/**
 * Extrai o primeiro objeto JSON válido do texto de resposta do Claude.
 * Robusto a markdown, explicações extras, etc.
 */
export function extractJSON<T = unknown>(text: string): T {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("Nenhum JSON encontrado na resposta do Claude");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1)) as T;
    }
  }
  throw new Error("JSON incompleto na resposta do Claude");
}

/**
 * Extrai o primeiro array JSON válido do texto de resposta do Claude.
 */
export function extractJSONArray<T = unknown>(text: string): T[] {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("Nenhum array JSON encontrado na resposta do Claude");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1)) as T[];
    }
  }
  throw new Error("Array JSON incompleto na resposta do Claude");
}

/**
 * Extrai texto da primeira content block de texto.
 */
export function extractText(response: { content: Array<{ type: string; text?: string }> }): string {
  const block = response.content.find(b => b.type === "text");
  return block?.text ?? "";
}
