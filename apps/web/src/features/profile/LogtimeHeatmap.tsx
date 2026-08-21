import { useMemo } from "react"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import {
  type LogtimeData,
  getLogtimeColor,
  getMonthCalendar,
  listMonthsInRange,
} from "@/features/profile/profile-display"
import { cn } from "@/lib/utils"

type LogtimeHeatmapProps = {
  logtime?: LogtimeData
  begin: Date
  end: Date
  isLoading?: boolean
  isError?: boolean
  showAnalyticsLink?: boolean
}

function monthLabel(month: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    timeZone: "UTC",
  }).format(month)
}

export function LogtimeHeatmap({
  logtime,
  begin,
  end,
  isLoading = false,
  isError = false,
  showAnalyticsLink = false,
}: LogtimeHeatmapProps) {
  const months = useMemo(() => listMonthsInRange(begin, end), [begin, end])
  const monthCount = months.length

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">
            Activité logtime
          </h2>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Chargement de la heatmap…"
              : isError
                ? "Logtime temporairement indisponible"
                : logtime
                  ? `${logtime.total_hours} h · ${logtime.active_days} jours actifs sur ${monthCount} mois`
                  : "Aucune donnée"}
          </p>
        </div>
        {showAnalyticsLink ? (
          <Link
            to="/logtime"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Voir les analytics
          </Link>
        ) : null}
      </div>

      {isError ? (
        <p className="text-sm text-muted-foreground">
          Les données de présence Intra n’ont pas pu être chargées.
        </p>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : !logtime ? (
        <p className="text-sm text-muted-foreground">Aucune donnée</p>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <div
            className="grid w-full gap-4 sm:gap-6 lg:gap-10"
            style={{
              gridTemplateColumns: `repeat(${Math.max(monthCount, 1)}, minmax(0, 1fr))`,
            }}
          >
            {months.map((month) => {
              const calendar = getMonthCalendar(month, logtime)
              const label = monthLabel(month)

              return (
                <div
                  key={month.toISOString()}
                  className="flex min-w-0 flex-col gap-2"
                >
                  <p className="text-center text-sm font-medium text-muted-foreground">
                    {label}
                  </p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendar.map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="aspect-square" />
                      }

                      const active = day.hours > 0

                      return (
                        <div
                          key={day.date}
                          title={`${day.date} · ${day.hours} h`}
                          aria-label={`${day.date} : ${day.hours} heures`}
                          className={cn(
                            "flex aspect-square items-center justify-center rounded-sm text-[10px] tabular-nums sm:text-xs",
                            active
                              ? "bg-primary/25 font-medium text-primary"
                              : "bg-muted/60 text-muted-foreground",
                          )}
                        >
                          {Number(day.date.slice(8, 10))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Moins</span>
            {[0, 2, 4, 7, 10].map((hours) => (
              <span
                key={hours}
                className={cn("size-2.75 rounded-[2px]", getLogtimeColor(hours))}
              />
            ))}
            <span>Plus</span>
          </div>
        </div>
      )}
    </section>
  )
}
