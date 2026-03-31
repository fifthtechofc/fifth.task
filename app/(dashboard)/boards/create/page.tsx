import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { BoardCreateMultistepForm } from "@/components/ui/multistep-form"

export default function CreateBoardProjectPage() {
  return (
    <section className="min-h-full px-6 pb-6 pt-0">
      <div className="mx-auto max-w-6xl -mt-4">
        <Link
          href="/boards"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos boards
        </Link>

        <BoardCreateMultistepForm />
      </div>
    </section>
  )
}
