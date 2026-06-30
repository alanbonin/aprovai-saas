import { resolveMx } from "node:dns/promises";

const TIMEOUT_MS = 3000;

/**
 * Verifica se o domínio do e-mail tem servidor de e-mail configurado (registro MX).
 * Fail-open: timeout ou falha de rede não bloqueiam o cadastro — só bloqueia quando
 * a consulta DNS confirma que o domínio não existe ou não tem MX configurado.
 */
export async function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return true;

  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "TIMEOUT" })), TIMEOUT_MS);
      }),
    ]);
    return records.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    // Domínio confirmadamente inexistente ou sem servidor de e-mail → bloqueia
    if (code === "ENOTFOUND" || code === "ENODATA") return false;
    // Timeout, falha de rede, resolver indisponível → não bloqueia (fail-open)
    return true;
  }
}
