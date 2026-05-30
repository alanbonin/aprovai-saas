import { db } from "@/lib/db";

const TEMPLATE_PREFIX = "__EMAIL_TEMPLATE__:";

export interface EmailTemplate {
  assunto: string;
  html: string;
  variaveis: string[];
  updatedAt: string;
}

export const TEMPLATE_NOMES: Record<string, string> = {
  "trial-expirando": "Trial Expirando",
  "boas-vindas": "Boas-vindas",
  "lembrete": "Lembrete Diário",
  "reativacao": "Reativação",
  "relatorio-semanal": "Relatório Semanal",
  "questao-do-dia": "Questão do Dia",
  "admin-semanal": "Relatório Admin Semanal",
};

/** Templates padrão (fallback quando não há template salvo no banco) */
export const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
  "trial-expirando": {
    assunto: "⏰ Seu trial gratuito expira em {{daysLeft}} dias — garanta seu acesso",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1629;color:#e2e8f0;padding:32px;border-radius:12px">
  <h1 style="color:#0ab5bd;margin-bottom:8px">⏰ Seu trial está acabando</h1>
  <p>Olá, <strong>{{nome}}</strong>!</p>
  <p>Seu acesso gratuito ao AprovAI360 expira em <strong>{{daysLeft}} dia(s)</strong>.</p>
  <p>Para continuar tendo acesso a:</p>
  <ul>
    <li>✅ Simulados ilimitados por banca</li>
    <li>✅ Mentores IA especializados</li>
    <li>✅ Questões adaptativas com IA</li>
    <li>✅ Relatório completo de desempenho</li>
  </ul>
  <a href="{{planos_url}}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Escolher meu plano →</a>
  <p style="margin-top:24px;font-size:12px;color:#64748b">AprovAI360 · Sua aprovação em concursos públicos</p>
</div>`,
    variaveis: ["nome", "daysLeft", "planos_url"],
    updatedAt: new Date().toISOString(),
  },
  "boas-vindas": {
    assunto: "🎉 Bem-vindo ao AprovAI360, {{nome}}!",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1629;color:#e2e8f0;padding:32px;border-radius:12px">
  <h1 style="color:#0ab5bd">🎉 Bem-vindo, {{nome}}!</h1>
  <p>Sua conta foi criada com sucesso. Você tem <strong>7 dias gratuitos</strong> para explorar tudo.</p>
  <p>Comece por:</p>
  <ul>
    <li>📚 Responder questões da sua matéria</li>
    <li>🎓 Conversar com seu mentor IA</li>
    <li>🎯 Fazer um simulado completo</li>
  </ul>
  <a href="{{app_url}}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Começar agora →</a>
</div>`,
    variaveis: ["nome", "app_url"],
    updatedAt: new Date().toISOString(),
  },
  "lembrete": {
    assunto: "📚 {{nome}}, não esqueça de estudar hoje!",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1629;color:#e2e8f0;padding:32px;border-radius:12px">
  <h1 style="color:#0ab5bd">📚 Hora de estudar!</h1>
  <p>Olá, <strong>{{nome}}</strong>!</p>
  <p>Você tem <strong>{{flashcardsDue}} flashcards</strong> para revisar hoje e não estudou ainda.</p>
  <p>Mantenha seu streak e continue no caminho da aprovação! 🔥</p>
  <a href="{{app_url}}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Estudar agora →</a>
</div>`,
    variaveis: ["nome", "flashcardsDue", "app_url"],
    updatedAt: new Date().toISOString(),
  },
  "reativacao": {
    assunto: "Sentimos sua falta, {{nome}}! 👋",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1629;color:#e2e8f0;padding:32px;border-radius:12px">
  <h1 style="color:#0ab5bd">Sentimos sua falta! 👋</h1>
  <p>Olá, <strong>{{nome}}</strong>!</p>
  <p>Você não estuda há alguns dias. Que tal voltar hoje?</p>
  <p>Sua jornada de aprovação continua te esperando.</p>
  <a href="{{app_url}}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Voltar a estudar →</a>
</div>`,
    variaveis: ["nome", "app_url"],
    updatedAt: new Date().toISOString(),
  },
  "relatorio-semanal": {
    assunto: "📊 Seu resumo semanal, {{nome}}",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1629;color:#e2e8f0;padding:32px;border-radius:12px">
  <h1 style="color:#0ab5bd">📊 Seu resumo da semana</h1>
  <p>Olá, <strong>{{nome}}</strong>! Veja como foi sua semana:</p>
  <ul>
    <li>✅ {{questoes}} questões respondidas</li>
    <li>🎯 {{acertos}}% de acerto</li>
    <li>🔥 {{streak}} dias de streak</li>
  </ul>
  <a href="{{app_url}}/relatorio" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Ver relatório completo →</a>
</div>`,
    variaveis: ["nome", "questoes", "acertos", "streak", "app_url"],
    updatedAt: new Date().toISOString(),
  },
  "questao-do-dia": {
    assunto: "⚡ Questão do dia para {{nome}}",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1629;color:#e2e8f0;padding:32px;border-radius:12px">
  <h1 style="color:#0ab5bd">⚡ Sua questão do dia chegou!</h1>
  <p>Olá, <strong>{{nome}}</strong>!</p>
  <p>Responda a questão do dia e mantenha seu streak de estudos.</p>
  <a href="{{app_url}}/desafio" style="display:inline-block;background:#f59e0b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Responder agora →</a>
</div>`,
    variaveis: ["nome", "app_url"],
    updatedAt: new Date().toISOString(),
  },
  "admin-semanal": {
    assunto: "📊 Relatório Semanal Aprovai — {{semana}}",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d1117;color:#e2e8f0;padding:32px;border-radius:12px">
  <h1 style="color:#818cf8;text-align:center">📊 Relatório Semanal</h1>
  <p style="color:#6b7280;text-align:center;font-size:13px">{{semana}}</p>
  <table width="100%" cellpadding="0" cellspacing="8" style="margin:24px 0">
    <tr>
      <td style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#818cf8">{{novos_alunos}}</div>
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Novos alunos</div>
      </td>
      <td style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#10b981">{{questoes_respondidas}}</div>
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Questões respondidas</div>
      </td>
    </tr>
    <tr>
      <td style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#f59e0b">{{simulados}}</div>
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Simulados</div>
      </td>
      <td style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.2);border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#8b5cf6">{{novas_assinaturas}}</div>
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Novas assinaturas</div>
      </td>
    </tr>
  </table>
  <p style="font-size:13px;color:#9ca3af">Total de alunos: <strong style="color:#e2e8f0">{{total_alunos}}</strong> &nbsp;|&nbsp; Assinaturas ativas: <strong style="color:#10b981">{{assinaturas_ativas}}</strong></p>
  <div style="text-align:center;margin-top:24px">
    <a href="{{app_url}}/admin" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Acessar painel admin →</a>
  </div>
  <p style="font-size:11px;color:#374151;text-align:center;margin-top:24px">Aprovai · Relatório automático semanal</p>
</div>`,
    variaveis: ["semana", "novos_alunos", "questoes_respondidas", "simulados", "novas_assinaturas", "total_alunos", "assinaturas_ativas", "app_url"],
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Busca template do banco (com fallback para o default).
 * Busca por subjectId = "__EMAIL_TEMPLATE__:slug" sem filtrar por userId.
 */
export async function getEmailTemplate(slug: string): Promise<EmailTemplate> {
  try {
    const key = `${TEMPLATE_PREFIX}${slug}`;
    const { data } = await db
      .from("Note")
      .select("content")
      .eq("subjectId", key)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.content) {
      const parsed = JSON.parse(data.content) as EmailTemplate;
      if (parsed.assunto && parsed.html) return parsed;
    }
  } catch {
    // usa default
  }

  return DEFAULT_TEMPLATES[slug] ?? DEFAULT_TEMPLATES["boas-vindas"];
}

/**
 * Substitui variáveis no template: {{nome}} → "João"
 */
export function renderTemplate(
  template: EmailTemplate,
  vars: Record<string, string>
): { assunto: string; html: string } {
  let assunto = template.assunto;
  let html = template.html;

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    assunto = assunto.replace(regex, value);
    html = html.replace(regex, value);
  }

  return { assunto, html };
}
