import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { BoardCreateMultistepForm } from "@/components/ui/multistep-form"

export default function CreateBoardProjectPage() {
  return (
    <section className="min-h-full p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/boards"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos boards
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Criar quadro</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Em três etapas: nome do quadro, colunas iniciais e confirmação. O padrão segue a estrutura
            shadcn + animações (framer-motion).
          </p>
        </div>

        <BoardCreateMultistepForm />
      </div>
    </section>
  )
}
