import { NextResponse } from "next/server"
import { getClientIp, rateLimit } from "@/lib/server/rate-limit"
import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  const rl = rateLimit(`auth:signin:${ip}`, { limit: 12, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429 },
    )
  }

  let body: { email?: string; password?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const email = body.email?.trim() ?? ""
  const password = body.password ?? ""
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Informe e-mail e senha." },
      { status: 400 },
    )
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 401 },
    )
  }

  // best-effort audit (doesn't fail request)
  try {
    await supabase.rpc("log_audit_event", {
      p_action: "auth.login",
      p_metadata: { method: "password", source: "api" },
      p_ip: ip,
      p_user_agent: req.headers.get("user-agent") ?? null,
    })
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, data })
}
