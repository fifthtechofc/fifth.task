import { CalendarWorkspaceView } from "@/components/calendar/calendar-workspace-view"

export default function CalendarPage() {
  return (
    <section className="relative min-h-full p-6 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Calendario
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
            Agenda mensal do workspace
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Acompanhe reunioes, reviews, planejamentos e eventos importantes
            do time em uma visao unica.
          </p>
        </div>

        <div className="min-h-[720px]">
          <CalendarWorkspaceView />
        </div>
      </div>
    </section>
  )
}
