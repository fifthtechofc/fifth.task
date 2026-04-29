import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sendMail } from "@/lib/server/mailer"
import { savePendingEmailConfirmation } from "@/lib/server/pending-email-confirmations"
import { getClientIp, rateLimit } from "@/lib/server/rate-limit"
import { getSupabaseAdmin } from "@/lib/server/supabase-admin"

function signupProfileUsername(email: string, userId: string): string {
  const raw = email.split("@")[0] ?? "user"
  const sanitized = raw.replace(/[^a-zA-Z0-9_]/g, "_") || "user"
  const suffix = userId.replace(/-/g, "").slice(0, 8)
  const combined = `${sanitized}_${suffix}`
  return combined.length > 64 ? combined.slice(0, 64) : combined
}

function isSchemaMissingColumnError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    (m.includes("column") && m.includes("does not exist")) ||
    m.includes("schema cache") ||
    m.includes("could not find")
  )
}

function isProfileRpcUnavailable(err: {
  message?: string
  code?: string
}): boolean {
  const m = (err.message ?? "").toLowerCase()
  const c = String((err as { code?: string }).code ?? "")
  return (
    c === "PGRST202" ||
    c === "42883" ||
    (m.includes("signup_ensure_profile") &&
      (m.includes("could not find") || m.includes("does not exist"))) ||
    (m.includes("function") &&
      m.includes("signup_ensure_profile") &&
      m.includes("not find"))
  )
}

function isWorkspaceFkFailure(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes("workspace_members") &&
    m.includes("foreign key constraint") &&
    (m.includes("workspace_id") || m.includes("workspaces"))
  )
}

/** Preferência: RPC security definer em SQL (supabase/profiles.sql). Fallback: upsert REST. */
async function ensureProfileAfterSignup(
  admin: SupabaseClient,
  params: { userId: string; email: string; name: string; jobTitle: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: rpcError } = await admin.rpc("signup_ensure_profile", {
    p_user_id: params.userId,
    p_email: params.email,
    p_full_name: params.name,
    p_job_title: params.jobTitle,
  })
  if (!rpcError) return { ok: true }
  if (isProfileRpcUnavailable(rpcError)) {
    return upsertProfileAfterSignup(admin, params)
  }
  return {
    ok: false,
    error: rpcError.message ?? "signup_ensure_profile falhou.",
  }
}

/** Cria/atualiza public.profiles com service role. Usado só se a RPC signup_ensure_profile não existir. */
async function upsertProfileAfterSignup(
  admin: SupabaseClient,
  params: { userId: string; email: string; name: string; jobTitle: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, email, name, jobTitle } = params
  const username = signupProfileUsername(email, userId)
  const attempts: Record<string, unknown>[] = [
    {
      id: userId,
      email,
      full_name: name,
      job_title: jobTitle,
      display_name: name,
      username,
    },
    {
      id: userId,
      email,
      full_name: name,
      job_title: jobTitle,
      display_name: name,
    },
    { id: userId, email, full_name: name, job_title: jobTitle },
    { id: userId, email },
  ]

  let lastMessage = ""
  for (const payload of attempts) {
    const { error } = await admin
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
    if (!error) return { ok: true }
    lastMessage = error.message ?? "Erro ao gravar perfil."
    if (!isSchemaMissingColumnError(lastMessage)) {
      return { ok: false, error: lastMessage }
    }
  }
  return { ok: false, error: lastMessage }
}

function getBaseUrl(req: Request) {
  const h = req.headers
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    h.get("host")?.split(",")[0]?.trim() ||
    ""
  if (!host) return ""
  return `${proto}://${host}`
}

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
  const rl = rateLimit(`auth:signup:${ip}`, { limit: 6, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429 },
    )
  }

  let body: {
    email?: string
    password?: string
    name?: string
    jobTitle?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const email = body.email?.trim() ?? ""
  const password = body.password ?? ""
  const name = body.name?.trim() ?? ""
  const jobTitle = body.jobTitle?.trim() ?? ""

  if (!email || !password || !name || !jobTitle) {
    return NextResponse.json(
      { ok: false, error: "Preencha todos os campos." },
      { status: 400 },
    )
  }

  try {
    const admin = getSupabaseAdmin()
    const baseUrl = getBaseUrl(req)
    const redirectTo = baseUrl ? `${baseUrl}/confirm-email` : undefined

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: name,
          job_title: jobTitle,
        },
      })

    if (createErr) {
      const msg = String(createErr.message || "")
      console.error("[auth/signup] createUser failed", {
        message: msg,
        status: (createErr as { status?: number }).status,
        code: (createErr as { code?: string }).code,
      })
      const already =
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("exists") ||
        msg.toLowerCase().includes("registered")
      return NextResponse.json(
        {
          ok: false,
          error: already
            ? "Este e-mail já está em uso."
            : msg || "Não foi possível criar a conta.",
        },
        { status: 400 },
      )
    }

    const userId = created.user?.id ?? null
    if (userId) {
      const profileResult = await ensureProfileAfterSignup(admin, {
        userId,
        email,
        name,
        jobTitle,
      })
      if (!profileResult.ok) {
        console.error(
          "[auth/signup] ensure profile failed",
          profileResult.error,
        )
        await admin.auth.admin.deleteUser(userId)
        if (isWorkspaceFkFailure(profileResult.error)) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Falha ao criar o perfil porque o banco tentou inserir em workspace_members com workspace_id inválido (FK). Isso normalmente vem de um trigger em public.profiles ou de uma política/rotina de workspace. Ajuste/remova esse trigger ou crie um workspace default válido antes do insert.",
            },
            { status: 500 },
          )
        }
        return NextResponse.json(
          {
            ok: false,
            error:
              "Não foi possível criar o perfil. No Supabase, abre o SQL Editor, executa o ficheiro supabase/profiles.sql do repositório (função signup_ensure_profile + colunas em falta) e tenta de novo.",
          },
          { status: 500 },
        )
      }
    }

    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: redirectTo ? { redirectTo } : undefined,
      })

    if (!linkErr && linkData?.properties?.action_link) {
      const actionLink = linkData.properties.action_link
      savePendingEmailConfirmation(email, actionLink)
      await sendMail({
        to: email,
        subject: "Confirme seu e-mail — Fifth Task",
        html: buildConfirmEmailHtml({ actionLink }),
        text: `Confirme seu e-mail para ativar sua conta: ${actionLink}`,
      })
    }

    return NextResponse.json({
      ok: true,
      data: { userId: created.user?.id ?? null, needsEmailConfirmation: true },
    })
  } catch (err) {
    console.error("[auth/signup] unexpected", err)
    return NextResponse.json(
      { ok: false, error: "Erro interno ao processar o cadastro." },
      { status: 500 },
    )
  }
}
