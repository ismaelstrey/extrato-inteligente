import nodemailer from "nodemailer";

function getSmtpTransport() {
  const url = process.env["SMTP_URL"];
  if (url) return nodemailer.createTransport(url);

  const host = process.env["SMTP_HOST"];
  const port = process.env["SMTP_PORT"] ? Number(process.env["SMTP_PORT"]) : null;
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const secure = process.env["SMTP_SECURE"] ? process.env["SMTP_SECURE"] === "true" : null;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: secure ?? port === 465,
    auth: { user, pass },
  });
}

export async function sendTwoFactorCodeEmail(input: { to: string; code: string }) {
  const transport = getSmtpTransport();
  if (!transport) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  const from = process.env["SMTP_FROM"] ?? "no-reply@extrato.local";

  await transport.sendMail({
    from,
    to: input.to,
    subject: "Código de verificação",
    text: `Seu código de verificação é: ${input.code}\n\nEle expira em 10 minutos.`,
  });
}
