import nodemailer from "nodemailer"

function required(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`${name} não configurada.`)
  return v
}

export type SendMailArgs = {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail({ to, subject, html, text }: SendMailArgs) {
  const host = required("SMTP_HOST")
  const port = Number(required("SMTP_PORT"))
  const user = required("SMTP_USER")
  const pass = required("SMTP_PASS")
  const from = required("SMTP_FROM")

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  })
}
