export const SENHAS_COMUNS = new Set([
  "123456", "123456789", "12345678", "12345", "1234567", "password", "senha", "qwerty",
  "abc123", "111111", "000000", "iloveyou", "admin", "letmein", "monkey", "dragon",
  "master", "sunshine", "princess", "welcome", "shadow", "superman", "michael",
  "football", "baseball", "696969", "123123", "654321", "batman",
  "concurso", "aprovai", "estudar", "passar", "aprovado", "gabarito",
]);

/** Mesma regra usada no frontend (cadastro/page.tsx) — mantém os dois em sincronia. */
export function validarSenha(s: string): { ok: boolean; erro?: string } {
  if (s.length < 8) return { ok: false, erro: "Mínimo 8 caracteres" };
  if (!/[a-zA-Z]/.test(s)) return { ok: false, erro: "Pelo menos 1 letra" };
  if (!/[0-9]/.test(s)) return { ok: false, erro: "Pelo menos 1 número" };
  if (SENHAS_COMUNS.has(s.toLowerCase())) return { ok: false, erro: "Senha muito comum — escolha outra" };
  return { ok: true };
}
