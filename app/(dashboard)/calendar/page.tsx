import { add, setDate, setHours, setMinutes, startOfMonth } from "date-fns"

import {
  FullScreenCalendar,
  type CalendarData,
} from "@/components/ui/fullscreen-calendar"

const monthStart = startOfMonth(new Date())

const calendarEvents: CalendarData[] = [
  {
    day: setDate(monthStart, 2),
    events: [
      {
        id: 1,
        name: "Q1 Planning Session",
        time: "10:00 AM",
        datetime: setHours(setMinutes(setDate(monthStart, 2), 0), 10).toISOString(),
      },
      {
        id: 2,
        name: "Team Sync",
        time: "2:00 PM",
        datetime: setHours(setMinutes(setDate(monthStart, 2), 0), 14).toISOString(),
      },
    ],
  },
  {
    day: setDate(monthStart, 7),
    events: [
      {
        id: 3,
        name: "Product Launch Review",
        time: "2:00 PM",
        datetime: setHours(setMinutes(setDate(monthStart, 7), 0), 14).toISOString(),
      },
      {
        id: 4,
        name: "Marketing Sync",
        time: "11:00 AM",
        datetime: setHours(setMinutes(setDate(monthStart, 7), 0), 11).toISOString(),
      },
      {
        id: 5,
        name: "Vendor Meeting",
        time: "4:30 PM",
        datetime: setHours(setMinutes(setDate(monthStart, 7), 30), 16).toISOString(),
      },
    ],
  },
  {
    day: setDate(monthStart, 10),
    events: [
      {
        id: 6,
        name: "Team Building Workshop",
        time: "11:00 AM",
        datetime: setHours(setMinutes(setDate(monthStart, 10), 0), 11).toISOString(),
      },
    ],
  },
  {
    day: add(setDate(monthStart, 13), { days: 1 }),
    events: [
      {
        id: 7,
        name: "Budget Analysis Meeting",
        time: "3:30 PM",
        datetime: setHours(setMinutes(add(setDate(monthStart, 13), { days: 1 }), 30), 15).toISOString(),
      },
      {
        id: 8,
        name: "Sprint Planning",
        time: "9:00 AM",
        datetime: setHours(setMinutes(add(setDate(monthStart, 13), { days: 1 }), 0), 9).toISOString(),
      },
      {
        id: 9,
        name: "Design Review",
        time: "1:00 PM",
        datetime: setHours(setMinutes(add(setDate(monthStart, 13), { days: 1 }), 0), 13).toISOString(),
      },
    ],
  },
  {
    day: setDate(monthStart, 16),
    events: [
      {
        id: 10,
        name: "Client Presentation",
        time: "10:00 AM",
        datetime: setHours(setMinutes(setDate(monthStart, 16), 0), 10).toISOString(),
      },
      {
        id: 11,
        name: "Team Lunch",
        time: "12:30 PM",
        datetime: setHours(setMinutes(setDate(monthStart, 16), 30), 12).toISOString(),
      },
      {
        id: 12,
        name: "Project Status Update",
        time: "2:00 PM",
        datetime: setHours(setMinutes(setDate(monthStart, 16), 0), 14).toISOString(),
      },
    ],
  },
]

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
          <FullScreenCalendar data={calendarEvents} />
        </div>
      </div>
    </section>
  )
}
