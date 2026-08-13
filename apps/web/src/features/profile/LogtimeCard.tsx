import { ChevronLeft, ChevronRight, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type LogtimeData,
  getLogtimeColor,
  getMonthCalendar,
} from "@/features/profile/profile-display"
import { cn } from "@/lib/utils"

type LogtimeCardProps = {
  logtime?: LogtimeData
  month: Date
  isCurrentMonth: boolean
  isLoading?: boolean
  isError?: boolean
  onPreviousMonth: () => void
  onNextMonth: () => void
}

export function LogtimeCard({
  logtime,
  month,
  isCurrentMonth,
  isLoading = false,
  isError = false,
  onPreviousMonth,
  onNextMonth,
}: LogtimeCardProps) {
  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(month)
  const calendar = logtime ? getMonthCalendar(month, logtime) : []

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Timer />
            Logtime
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={onPreviousMonth}>
              <ChevronLeft />
              <span className="sr-only">Mois précédent</span>
            </Button>
            <span className="min-w-28 text-center text-sm font-medium capitalize">
              {monthLabel}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNextMonth}
              disabled={isCurrentMonth}
            >
              <ChevronRight />
              <span className="sr-only">Mois suivant</span>
            </Button>
          </div>
        </div>
        <CardDescription>
          {isLoading
            ? "Chargement du logtime…"
            : isError
              ? "Logtime temporairement indisponible"
              : `${logtime?.total_hours ?? 0} h ce mois-ci · ${logtime?.active_days ?? 0} jours actifs`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-sm text-muted-foreground">
            Les données de logtime n’ont pas pu être chargées.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">
            Chargement du calendrier…
          </p>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
              {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendar.map((day, index) =>
                day ? (
                  <div
                    key={day.date}
                    className={cn(
                      "aspect-square rounded-sm",
                      getLogtimeColor(day.hours),
                    )}
                    title={`${day.date} : ${day.hours} h`}
                    aria-label={`${day.date} : ${day.hours} heures`}
                  />
                ) : (
                  <div key={`empty-${index}`} />
                ),
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>Moins</span>
              {[0, 2, 4, 7, 10].map((hours) => (
                <span
                  key={hours}
                  className={cn("size-3 rounded-sm", getLogtimeColor(hours))}
                />
              ))}
              <span>Plus</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
