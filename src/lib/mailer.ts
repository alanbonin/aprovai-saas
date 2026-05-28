import nodemailer from "nodemailer";

/**
 * mailer.ts — Envio de e-mails via SMTP Titan (HostGator)
 * Substitui o Resend em todas as rotas de e-mail.
 */

function createTransport() {
  const host = process.env.SMTP_HOST ?? "smtp.titan.email";
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER e SMTP_PASS devem estar configurados no .env");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // TLS na 465, STARTTLS na 587
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Envia um e-mail via SMTP Titan.
 * Compatível com o padrão usado nas rotas (from, to, subject, html).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{ error: Error | null }> {
  try {
    const transport = createTransport();
    const defaultFrom = process.env.EMAIL_FROM ?? "Aprovai360 <contato@aprovai360.com.br>";

    await transport.sendMail({
      from: opts.from ?? defaultFrom,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
