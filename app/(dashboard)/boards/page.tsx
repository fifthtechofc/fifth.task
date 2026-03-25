import { Board } from "@/components/kanban/board"

export default function BoardsPage() {
  return (
    <section className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Boards</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie tarefas e acompanhe o fluxo do time.
          </p>
        </div>

        <Board />
      </div>
    </section>
  )
}
