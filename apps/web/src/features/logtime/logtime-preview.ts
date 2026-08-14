import type {
  LogtimeAnalytics,
  LogtimeDay,
} from "@/features/logtime/logtime-api"

const weekdayNames = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
]

function getMonday(date: Date) {
  const monday = new Date(date)
  const weekday = (monday.getUTCDay() + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - weekday)
  return monday.toISOString().slice(0, 10)
}

export function getPreviewLogtimeAnalytics(
  beginDate: string,
  endDate: string,
): LogtimeAnalytics {
  const days: LogtimeDay[] = []
  const currentDate = new Date(`${beginDate}T00:00:00.000Z`)
  const lastDate = new Date(`${endDate}T00:00:00.000Z`)

  while (currentDate <= lastDate) {
    const weekday = (currentDate.getUTCDay() + 6) % 7
    const dayOfMonth = currentDate.getUTCDate()
    const hours = weekday >= 5 || dayOfMonth % 6 === 0
      ? 0
      : 2 + ((dayOfMonth * 3) % 8) * 0.75

    days.push({
      date: currentDate.toISOString().slice(0, 10),
      duration_seconds: Math.round(hours * 3_600),
      duration_hours: hours,
    })
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }

  const totalSeconds = days.reduce(
    (total, day) => total + day.duration_seconds,
    0,
  )
  const activeDays = days.filter((day) => day.duration_seconds > 0).length
  const weekdayTotals = Array.from({ length: 7 }, () => 0)
  const weekTotals = new Map<string, number>()

  days.forEach((day) => {
    const date = new Date(`${day.date}T00:00:00.000Z`)
    const weekday = (date.getUTCDay() + 6) % 7
    const monday = getMonday(date)

    weekdayTotals[weekday] += day.duration_seconds
    weekTotals.set(monday, (weekTotals.get(monday) ?? 0) + day.duration_seconds)
  })

  const averageSeconds = activeDays > 0
    ? Math.round(totalSeconds / activeDays)
    : 0

  return {
    login: "slatrech",
    begin_at: `${beginDate}T00:00:00.000Z`,
    end_at: `${endDate}T23:59:59.999Z`,
    total_seconds: totalSeconds,
    total_hours: Math.round(totalSeconds / 36) / 100,
    active_days: activeDays,
    average_seconds_per_active_day: averageSeconds,
    average_hours_per_active_day: Math.round(averageSeconds / 36) / 100,
    sessions_count: activeDays * 2 + Math.floor(activeDays / 3),
    days,
    by_weekday: weekdayTotals.map((durationSeconds, weekday) => ({
      weekday,
      weekday_name: weekdayNames[weekday],
      duration_seconds: durationSeconds,
      duration_hours: Math.round(durationSeconds / 36) / 100,
    })),
    by_week: Array.from(weekTotals, ([weekStart, durationSeconds]) => ({
      week_start: weekStart,
      duration_seconds: durationSeconds,
      duration_hours: Math.round(durationSeconds / 36) / 100,
    })),
  }
}
