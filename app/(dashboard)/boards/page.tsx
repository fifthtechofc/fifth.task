import { BoardsHome } from "@/components/kanban/boards-home"

export default function BoardsPage() {
  return (
    <section className="relative min-h-full p-6">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Boards</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie tarefas e acompanhe o fluxo do time.
          </p>
        </div>

        <BoardsHome />
      </div>
    </section>
  )
}
