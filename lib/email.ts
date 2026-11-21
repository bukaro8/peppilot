import "server-only";

import nodemailer from "nodemailer";

type MagicLinkEmail = {
  to: string;
  url: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

type SmtpEnvironment = Partial<Record<"SMTP_HOST" | "SMTP_PASSWORD" | "SMTP_PORT" | "SMTP_SECURE" | "SMTP_USER", string>>;

export function getSmtpTransportOptions(environment: SmtpEnvironment = process.env as SmtpEnvironment) {
  const host = environment.SMTP_HOST;
  const port = Number(environment.SMTP_PORT ?? "587");

  if (!host || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_HOST and a valid SMTP_PORT are required to send sign-in emails.");
  }

  const secureValue = environment.SMTP_SECURE ?? "false";
  if (secureValue !== "true" && secureValue !== "false") {
    throw new Error("SMTP_SECURE must be either true or false.");
  }

  const user = environment.SMTP_USER;
  const pass = environment.SMTP_PASSWORD;

  if ((user && !pass) || (!user && pass)) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together.");
  }

  return {
    host,
    port,
    secure: secureValue === "true",
    auth: user && pass ? { user, pass } : undefined,
    tls: { minVersion: "TLSv1.2" as const },
  };
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport(getSmtpTransportOptions());

  return transporter;
}

export async function sendMagicLinkEmail({ to, url }: MagicLinkEmail) {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is required to send sign-in emails.");
  }

  const safeUrl = escapeHtml(url);

  await getTransporter().sendMail({
    from,
    to,
    subject: "Sign in to PepPilot",
    text: `Use this secure link to sign in to PepPilot. It expires in 10 minutes:\n\n${url}\n\nIf you did not request this email, you can ignore it.`,
    html: `<p>Use the secure link below to sign in to PepPilot. It expires in 10 minutes.</p><p><a href="${safeUrl}">Sign in to PepPilot</a></p><p>If you did not request this email, you can ignore it.</p>`,
  });
}
