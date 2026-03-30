import NeuralBackground from "@/components/ui/flow-field-background"
import { Board } from "@/components/kanban/board"

export default function BoardsPage() {
  return (
    <section className="relative min-h-full overflow-hidden">
      <NeuralBackground
        className="absolute inset-0 z-0"
        color="#c7d1db"
        trailOpacity={0.2}
        particleCount={650}
        speed={0.85}
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-black/55 via-black/25 to-black/55" />

      <div className="pointer-events-none absolute -top-32 -left-32 z-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 z-10 h-96 w-96 translate-x-1/4 translate-y-1/4 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-20 min-h-full p-6">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Boards</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie tarefas e acompanhe o fluxo do time.
            </p>
          </div>

          <Board />
        </div>
      </div>
    </section>
  )
}
