"use client"

import * as React from "react"
import Link from "next/link"
import { Mail, CheckCircle, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card"

type Props = {
  email?: string
  initialVerified?: boolean
}

export default function EmailVerificationBlock({ email, initialVerified }: Props) {
  const [isResending, setIsResending] = React.useState(false)
  const [resendSuccess, setResendSuccess] = React.useState(false)
  const [isVerified, setIsVerified] = React.useState(Boolean(initialVerified))

  async function handleResendEmail() {
    if (!email) return
    setIsResending(true)
    setResendSuccess(false)
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setResendSuccess(true)
        window.setTimeout(() => setResendSuccess(false), 3000)
      }
    } finally {
      setIsResending(false)
    }
  }

  const verifiedHref = `/check-email?verified=1${email ? `&email=${encodeURIComponent(email)}` : ""}`

  if (isVerified) {
    return (
      <Card className="w-full max-w-md mx-auto rounded-2xl border border-white/10 bg-black/35 text-white shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        <CardHeader className="text-center flex flex-col gap-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-emerald-400" />
          </div>
          <CardTitle className="text-xl font-extrabold text-[var(--color-heading)]">
            Perfeito.
          </CardTitle>
          <CardDescription className="text-[var(--color-text-secondary)]">
            Se você já confirmou seu e-mail, pode entrar.
          </CardDescription>
        </CardHeader>

        <CardFooter className="pt-2">
          <Button
            asChild
            className="w-full h-12 rounded-md bg-[var(--color-border)] text-white hover:bg-[var(--color-border)]/90"
          >
            <Link href="/login">Ir para o Login</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto rounded-2xl border border-white/10 bg-black/35 text-white shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <CardHeader className="text-center flex flex-col gap-4">
        <div className="flex justify-center">
          <div className="p-3 rounded-full border border-white/10 bg-white/5">
            <Mail className="h-8 w-8 text-[var(--color-text-primary)]" />
          </div>
        </div>
        <CardTitle className="text-xl font-extrabold text-[var(--color-heading)]">
          Confirme seu e-mail
        </CardTitle>
        <CardDescription className="flex flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
          Enviamos um e-mail de confirmação para você.
          {email ? (
            <span className="font-medium text-[var(--color-text-primary)] break-words">
              {email}
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {resendSuccess && (
          <div className="p-3 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
            E-mail enviado com sucesso!
          </div>
        )}

        <div className="text-center text-sm text-[var(--color-text-secondary)]">
          <button
            onClick={handleResendEmail}
            disabled={isResending || !email}
            className="text-[var(--color-text-primary)] hover:opacity-80 disabled:opacity-50 font-medium"
          >
            {isResending ? "Enviando..." : "Reenviar e-mail"}
          </button>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button
          asChild
          className="w-full h-12 rounded-md bg-[var(--color-border)] text-white hover:bg-[var(--color-border)]/90"
        >
          <Link href={verifiedHref}>Já confirmei meu e-mail</Link>
        </Button>

        <Button
          variant="ghost"
          asChild
          className="w-full h-11 flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white"
        >
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Login
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

