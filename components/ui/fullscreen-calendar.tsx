"use client"

import * as React from "react"
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Search,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Event {
  id: number
  name: string
  time: string
  datetime: string
}

export interface CalendarData {
  day: Date
  events: Event[]
}

interface FullScreenCalendarProps {
  data: CalendarData[]
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
]

export function FullScreenCalendar({ data }: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDay, setSelectedDay] = React.useState(today)
  const [currentMonth, setCurrentMonth] = React.useState(format(today, "MMM-yyyy"))
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  })

  function previousMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 })
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"))
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"))
    setSelectedDay(today)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/35 backdrop-blur-sm">
      <div className="flex flex-col space-y-4 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-0.5 md:flex">
              <h1 className="p-1 text-xs uppercase text-muted-foreground">
                {format(today, "MMM")}
              </h1>
              <div className="flex w-full items-center justify-center rounded-lg border border-white/10 bg-background p-0.5 text-lg font-bold">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                {format(firstDayCurrentMonth, "MMMM, yyyy")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(firstDayCurrentMonth, "MMM d, yyyy")} -{" "}
                {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <Button variant="outline" size="icon" className="hidden lg:flex">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="hidden h-6 lg:block" />

          <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
            <Button
              onClick={previousMonth}
              className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="Navigate to previous month"
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button
              onClick={goToToday}
              className="w-full rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 md:w-auto"
              variant="outline"
            >
              Today
            </Button>
            <Button
              onClick={nextMonth}
              className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="Navigate to next month"
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>

          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <Separator orientation="horizontal" className="block w-full md:hidden" />

          <Button className="w-full gap-2 md:w-auto">
            <PlusCircle size={16} strokeWidth={2} aria-hidden="true" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      <div className="lg:flex lg:flex-auto lg:flex-col">
        <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-white/6 text-center text-xs font-semibold leading-6 lg:flex-none">
          <div className="bg-black/25 py-2.5">Sun</div>
          <div className="bg-black/25 py-2.5">Mon</div>
          <div className="bg-black/25 py-2.5">Tue</div>
          <div className="bg-black/25 py-2.5">Wed</div>
          <div className="bg-black/25 py-2.5">Thu</div>
          <div className="bg-black/25 py-2.5">Fri</div>
          <div className="bg-black/25 py-2.5">Sat</div>
        </div>

        <div className="flex text-xs leading-6 lg:flex-auto">
          <div className="hidden w-full bg-white/6 p-px lg:grid lg:grid-cols-7 lg:auto-rows-fr lg:gap-px">
            {days.map((day, dayIdx) => (
              <div
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  dayIdx === 0 && colStartClasses[getDay(day)],
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    !isSameMonth(day, firstDayCurrentMonth) &&
                    "bg-black/20 text-muted-foreground",
                  isEqual(day, selectedDay) &&
                    "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                  "relative flex min-h-[132px] cursor-pointer flex-col bg-black/35 backdrop-blur-sm hover:bg-white/8 focus:z-10",
                  !isEqual(day, selectedDay) && "hover:bg-black/45"
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-[6px] rounded-2xl border border-white/8 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                    isEqual(day, selectedDay) && "bg-white/8 border-white/12"
                  )}
                />
                <header className="flex items-center justify-between p-2.5">
                  <button
                    type="button"
                    className={cn(
                      isEqual(day, selectedDay) && "text-primary-foreground",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        isSameMonth(day, firstDayCurrentMonth) &&
                        "text-foreground",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        !isSameMonth(day, firstDayCurrentMonth) &&
                        "text-muted-foreground",
                      isEqual(day, selectedDay) &&
                        isToday(day) &&
                        "border-none bg-primary",
                      isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        "bg-foreground text-background",
                      (isEqual(day, selectedDay) || isToday(day)) &&
                        "font-semibold",
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs hover:border hover:border-white/15"
                    )}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>
                      {format(day, "d")}
                    </time>
                  </button>
                </header>
                <div className="flex-1 space-y-1.5 p-2.5">
                  {data
                    .filter((event) => isSameDay(event.day, day))
                    .map((calendarDay) => (
                      <div key={calendarDay.day.toString()} className="space-y-1.5">
                        {calendarDay.events.slice(0, 1).map((event) => (
                          <div
                            key={event.id}
                            className="flex flex-col items-start gap-1 rounded-lg border border-white/10 bg-white/5 p-2 text-xs leading-tight"
                          >
                            <p className="font-medium leading-none">{event.name}</p>
                            <p className="leading-none text-muted-foreground">
                              {event.time}
                            </p>
                          </div>
                        ))}
                        {calendarDay.events.length > 1 && (
                          <div className="text-xs text-muted-foreground">
                            + {calendarDay.events.length - 1} more
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="isolate grid w-full grid-cols-7 gap-px border-t border-white/10 bg-white/6 p-px lg:hidden">
            {days.map((day) => (
              <button
                onClick={() => setSelectedDay(day)}
                key={day.toString()}
                type="button"
                className={cn(
                  isEqual(day, selectedDay) && "text-primary-foreground",
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    isSameMonth(day, firstDayCurrentMonth) &&
                    "text-foreground",
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    !isSameMonth(day, firstDayCurrentMonth) &&
                    "bg-black/20 text-muted-foreground",
                  (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                  isEqual(day, selectedDay) &&
                    "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                  "relative flex h-14 flex-col bg-black/35 px-3 py-2 backdrop-blur-sm hover:bg-white/8 focus:z-10"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute inset-[4px] rounded-xl border border-white/8 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                    isEqual(day, selectedDay) && "bg-white/8 border-white/12"
                  )}
                  aria-hidden="true"
                />
                <time
                  dateTime={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "relative z-10",
                    "ml-auto flex size-6 items-center justify-center rounded-full",
                    isEqual(day, selectedDay) &&
                      isToday(day) &&
                      "bg-primary text-primary-foreground",
                    isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </time>
                {data.filter((date) => isSameDay(date.day, day)).length > 0 && (
                  <div className="relative z-10">
                    {data
                      .filter((date) => isSameDay(date.day, day))
                      .map((date) => (
                        <div
                          key={date.day.toString()}
                          className="-mx-0.5 mt-auto flex flex-wrap-reverse"
                        >
                          {date.events.map((event) => (
                            <span
                              key={event.id}
                              className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground"
                            />
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/25 px-4 py-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            {format(selectedDay, "EEEE, MMMM d")}
          </p>
          <div className="flex flex-col gap-2">
            {data.find((date) => isSameDay(date.day, selectedDay))?.events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">{event.name}</p>
                <p className="text-xs text-muted-foreground">{event.time}</p>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">
                Nenhum evento cadastrado para este dia.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
