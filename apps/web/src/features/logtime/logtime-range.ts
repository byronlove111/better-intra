import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

export type AnalyticsDateRange = {
  beginAt: string
  endAt: string
  label: string
}

/**
 * Calendar day as chosen in the picker (local Y/M/D), expressed as UTC midnight.
 * Avoids Paris/UTC off-by-one when DayPicker gives local midnights.
 */
function startOfPickedDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function endOfPickedDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
  )
}

/** Default: last 30 calendar days including today (local calendar). */
export function getDefaultPickerRange(now = new Date()): DateRange {
  const to = startOfPickedDayUtc(now)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 29)
  return { from, to }
}

export function toAnalyticsRange(range: DateRange | undefined): AnalyticsDateRange | null {
  if (!range?.from || !range.to) return null

  const begin = startOfPickedDayUtc(range.from)
  const end = endOfPickedDayUtc(range.to)
  if (end < begin) return null

  return {
    beginAt: begin.toISOString(),
    endAt: end.toISOString(),
    label: `${format(range.from, "d MMM yyyy", { locale: fr })} – ${format(range.to, "d MMM yyyy", { locale: fr })}`,
  }
}

export function formatRangeButtonLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Choisir une période"
  if (!range.to) return format(range.from, "d MMM yyyy", { locale: fr })
  return `${format(range.from, "d MMM yyyy", { locale: fr })} – ${format(range.to, "d MMM yyyy", { locale: fr })}`
}

const WEEKDAY_FR = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_FR[weekday] ?? `J${weekday}`
}

/** Fill every calendar day in range so line/bar charts stay continuous. */
export function fillDailySeries(
  beginAt: string,
  endAt: string,
  days: { date: string; duration_hours: number }[],
): { date: string; label: string; hours: number }[] {
  const byDate = new Map(days.map((day) => [day.date, day.duration_hours]))
  const begin = new Date(beginAt)
  const end = new Date(endAt)
  const beginDay = Date.UTC(begin.getUTCFullYear(), begin.getUTCMonth(), begin.getUTCDate())
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const out: { date: string; label: string; hours: number }[] = []

  for (let t = beginDay; t <= endDay; t += 24 * 60 * 60 * 1000) {
    const cursor = new Date(t)
    const iso = cursor.toISOString().slice(0, 10)
    out.push({
      date: iso,
      label: `${String(cursor.getUTCDate()).padStart(2, "0")}/${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      hours: byDate.get(iso) ?? 0,
    })
  }

  return out
}
