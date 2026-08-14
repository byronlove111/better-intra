import { apiDownload, apiRequest } from "@/lib/api"

export type LogtimeDay = {
  date: string
  duration_seconds: number
  duration_hours: number
}

export type LogtimeWeekday = {
  weekday: number
  weekday_name: string
  duration_seconds: number
  duration_hours: number
}

export type LogtimeWeek = {
  week_start: string
  duration_seconds: number
  duration_hours: number
}

export type LogtimeAnalytics = {
  login: string
  begin_at: string
  end_at: string
  total_seconds: number
  total_hours: number
  active_days: number
  average_seconds_per_active_day: number
  average_hours_per_active_day: number
  sessions_count: number
  days: LogtimeDay[]
  by_weekday: LogtimeWeekday[]
  by_week: LogtimeWeek[]
}

function getRangeQuery(beginDate: string, endDate: string) {
  const dayAfterEnd = new Date(`${endDate}T00:00:00.000Z`)
  dayAfterEnd.setUTCDate(dayAfterEnd.getUTCDate() + 1)

  return new URLSearchParams({
    begin_at: `${beginDate}T00:00:00.000Z`,
    end_at: dayAfterEnd.toISOString(),
  })
}

export function getLogtimeAnalytics(beginDate: string, endDate: string) {
  const query = getRangeQuery(beginDate, endDate)
  return apiRequest<LogtimeAnalytics>(`/analytics/logtime?${query}`)
}

export function downloadLogtimeExport(
  format: "csv" | "pdf",
  beginDate: string,
  endDate: string,
) {
  const query = getRangeQuery(beginDate, endDate)
  return apiDownload(`/analytics/logtime/export.${format}?${query}`)
}
