export type LogtimeData = {
  total_hours: number
  active_days: number
  days: { date: string; duration_hours: number }[]
}

type Cursus = {
  level: number | null
  end_at: string | null
}

export function getCurrentCursus<T extends Cursus>(cursus: T[]) {
  return cursus.find(
    (item) => !item.end_at || new Date(item.end_at) > new Date(),
  ) ?? cursus[0]
}

export function getLevelProgress(level: number | null | undefined) {
  return level ? Math.round((level % 1) * 100) : 0
}

export function getInitials(name: string | null | undefined) {
  return (name ?? "BI")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Date inconnue"

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "Non disponible"

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export function getDaysRemaining(value: string | null | undefined) {
  if (!value) return null

  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)
}

export function getMonthRange(month: Date) {
  const year = month.getUTCFullYear()
  const monthIndex = month.getUTCMonth()

  return {
    beginAt: new Date(Date.UTC(year, monthIndex, 1)).toISOString(),
    endAt: new Date(Date.UTC(year, monthIndex + 1, 1)).toISOString(),
  }
}

export function getMonthCalendar(month: Date, logtime: LogtimeData) {
  const hoursByDate = new Map(
    logtime.days.map((day) => [day.date, day.duration_hours]),
  )
  const year = month.getUTCFullYear()
  const monthIndex = month.getUTCMonth()
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay()
  const emptyDays = (firstWeekday + 6) % 7

  return [
    ...Array.from({ length: emptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(Date.UTC(year, monthIndex, index + 1))
      const dateKey = date.toISOString().slice(0, 10)

      return { date: dateKey, hours: hoursByDate.get(dateKey) ?? 0 }
    }),
  ]
}

export function getPreviewLogtime(month: Date): LogtimeData {
  const daysInMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const days = Array.from({ length: daysInMonth }, (_, index) => ({
    date: new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), index + 1),
    ).toISOString().slice(0, 10),
    duration_hours: index % 5 === 0 ? 0 : (index % 4) * 2.5,
  }))

  return {
    total_hours: days.reduce((total, day) => total + day.duration_hours, 0),
    active_days: days.filter((day) => day.duration_hours > 0).length,
    days,
  }
}

export function getLogtimeColor(hours: number) {
  if (hours === 0) return "bg-muted"
  if (hours < 3) return "bg-primary/25"
  if (hours < 6) return "bg-primary/50"
  if (hours < 9) return "bg-primary/75"
  return "bg-primary"
}
