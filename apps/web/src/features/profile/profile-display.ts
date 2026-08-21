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

/** Last N calendar months including the current one (UTC). */
export function getLastMonthsRange(months = 3, now = new Date()) {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )
  const begin = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  )

  return {
    beginAt: begin.toISOString(),
    endAt: end.toISOString(),
    begin,
    end,
    months,
  }
}

/** @deprecated Prefer getLastMonthsRange(3) */
export function getLastYearRange(now = new Date()) {
  return getLastMonthsRange(12, now)
}

/** List UTC month starts covered by [begin, end). */
export function listMonthsInRange(begin: Date, end: Date) {
  const months: Date[] = []
  const cursor = new Date(
    Date.UTC(begin.getUTCFullYear(), begin.getUTCMonth(), 1),
  )
  const limit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))

  while (cursor <= limit) {
    months.push(new Date(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

export type ContributionDay = {
  date: string
  hours: number
} | null

/** GitHub-style weeks (Mon→Sun columns of days). */
export function buildContributionWeeks(
  logtime: LogtimeData,
  begin: Date,
  end: Date,
): ContributionDay[][] {
  const hoursByDate = new Map(
    logtime.days.map((day) => [day.date, day.duration_hours]),
  )

  const rangeStart = new Date(
    Date.UTC(begin.getUTCFullYear(), begin.getUTCMonth(), begin.getUTCDate()),
  )
  const rangeEnd = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  )

  const cursor = new Date(rangeStart)
  const mondayOffset = (cursor.getUTCDay() + 6) % 7
  cursor.setUTCDate(cursor.getUTCDate() - mondayOffset)

  const weeks: ContributionDay[][] = []

  while (cursor < rangeEnd) {
    const week: ContributionDay[] = []
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dateKey = cursor.toISOString().slice(0, 10)
      if (cursor < rangeStart || cursor >= rangeEnd) {
        week.push(null)
      } else {
        week.push({
          date: dateKey,
          hours: hoursByDate.get(dateKey) ?? 0,
        })
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
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

export function getPreviewYearLogtime(begin: Date, end: Date): LogtimeData {
  const days: LogtimeData["days"] = []
  const cursor = new Date(
    Date.UTC(begin.getUTCFullYear(), begin.getUTCMonth(), begin.getUTCDate()),
  )
  const rangeEnd = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  )
  let index = 0

  while (cursor < rangeEnd) {
    const hours = index % 7 === 0 ? 0 : ((index % 5) + 1) * 1.8
    days.push({
      date: cursor.toISOString().slice(0, 10),
      duration_hours: hours,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    index += 1
  }

  return {
    total_hours: Math.round(
      days.reduce((total, day) => total + day.duration_hours, 0) * 100,
    ) / 100,
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
