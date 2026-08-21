import { apiDownload, apiRequest } from "@/lib/api"

export type LogtimeDayStat = {
  date: string
  duration_seconds: number
  duration_hours: number
}

export type LogtimeWeekdayStat = {
  weekday: number
  weekday_name: string
  duration_seconds: number
  duration_hours: number
}

export type LogtimeWeekStat = {
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
  days: LogtimeDayStat[]
  by_weekday: LogtimeWeekdayStat[]
  by_week: LogtimeWeekStat[]
}

export type LogtimeExportFormat = "csv" | "pdf"

export function getMyLogtimeAnalytics(beginAt: string, endAt: string) {
  const query = new URLSearchParams({
    begin_at: beginAt,
    end_at: endAt,
  })
  return apiRequest<LogtimeAnalytics>(`/analytics/logtime?${query}`)
}

export function exportMyLogtimeAnalytics(
  format: LogtimeExportFormat,
  beginAt: string,
  endAt: string,
) {
  const query = new URLSearchParams({
    begin_at: beginAt,
    end_at: endAt,
  })
  const extension = format === "csv" ? "csv" : "pdf"
  return apiDownload(`/analytics/logtime/export.${extension}?${query}`, {
    filename: `logtime.${extension}`,
  })
}
