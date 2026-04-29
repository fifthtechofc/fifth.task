import { NextResponse } from "next/server"
import { sendMail } from "@/lib/server/mailer"
import { getPendingEmailConfirmation } from "@/lib/server/pending-email-confirmations"
import { getClientIp, rateLimit } from "@/lib/server/rate-limit"

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function buildConfirmEmailHtml({ actionLink }: { actionLink: string }) {
  const logoUrl =
    "https://ryovcwvpeekcequwbpqn.supabase.co/storage/v1/object/public/Logo.fft/logo.png"
  const safeUrl = escapeHtml(actionLink)
  const plusPatternSvg =
    "data:image/svg+xml,%3Csvg%20width%3D%2760%27%20height%3D%2760%27%20viewBox%3D%270%200%2060%2060%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cg%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%3E%3Cg%20fill%3D%27%23ffffff22%27%20fill-opacity%3D%271%27%3E%3Cpath%20d%3D%27M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"

  return `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Confirme seu e-mail para ativar sua conta no Fifth Task.
  </div>
  <div style="background:#0b0d10;padding:34px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica,Arial;background-image:url('${plusPatternSvg}');background-repeat:repeat;background-size:60px 60px;">
    <div style="max-width:680px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:18px;">
        <img src="${escapeHtml(logoUrl)}" alt="Fifth Tech" width="72" height="72" style="display:inline-block;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 10px 26px rgba(255,255,255,0.18));" />
      </div>

      <div style="border:1px solid rgba(255,255,255,.10);border-radius:22px;background:rgba(16,18,20,.92);overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,0.55);">
        <div style="padding:22px 22px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);">
          <div style="letter-spacing:.30em;text-transform:uppercase;font-size:10px;color:rgba(255,255,255,.60);">Fifth Task</div>
          <div style="margin-top:8px;font-size:20px;font-weight:800;color:#ffffff;">Confirmar e-mail</div>
          <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,.72);">
            Para ativar sua conta, confirme seu e-mail clicando no botão abaixo.
          </div>
        </div>

        <div style="padding:22px 22px;color:#c7d1db;">
          <div style="margin-top:4px;text-align:center;">
            <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:14px;background:#ffffff;color:#000000;font-weight:800;text-decoration:none;">
              Confirmar e-mail
            </a>
            <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.55);">
              Se o botão não funcionar, copie e cole este link no navegador:<br />
              <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:rgba(255,255,255,.75);">${safeUrl}</span>
            </div>
          </div>
        </div>

        <div style="padding:16px 22px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;color:rgba(255,255,255,.45);text-align:center;">
          Se você não criou esta conta, pode ignorar este email com segurança.
        </div>
      </div>
    </div>
  </div>
  `
}

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`auth:resend-confirm:${ip}`, {
    limit: 6,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429 },
    )
  }

  let body: { email?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const email = body.email?.trim() ?? ""
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Informe seu e-mail." },
      { status: 400 },
    )
  }

  try {
    const entry = getPendingEmailConfirmation(email)
    if (entry?.actionLink) {
      await sendMail({
        to: email,
        subject: "Confirme seu e-mail — Fifth Task",
        html: buildConfirmEmailHtml({ actionLink: entry.actionLink }),
        text: `Confirme seu e-mail para ativar sua conta: ${entry.actionLink}`,
      })
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true })
}
