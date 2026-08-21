import { useState } from "react"
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  type LogtimeExportFormat,
  exportMyLogtime,
} from "@/features/profile/profile-api"
import {
  type LogtimeData,
  getLogtimeColor,
  getMonthCalendar,
} from "@/features/profile/profile-display"
import { getApiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

type LogtimeCardProps = {
  logtime?: LogtimeData
  month: Date
  isCurrentMonth: boolean
  isLoading?: boolean
  isError?: boolean
  isActivated?: boolean
  canActivate?: boolean
  onActivate?: () => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  /** Own analytics only (`/analytics/logtime/export.*`). */
  canExport?: boolean
  exportBeginAt?: string
  exportEndAt?: string
  /** Show that analytics auto-refresh while open. */
  liveUpdates?: boolean
}

export function LogtimeCard({
  logtime,
  month,
  isCurrentMonth,
  isLoading = false,
  isError = false,
  isActivated = true,
  canActivate = true,
  onActivate,
  onPreviousMonth,
  onNextMonth,
  canExport = false,
  exportBeginAt,
  exportEndAt,
  liveUpdates = false,
}: LogtimeCardProps) {
  const [exportPending, setExportPending] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(month)
  const calendar = logtime ? getMonthCalendar(month, logtime) : []
  const exportReady =
    canExport
    && Boolean(exportBeginAt)
    && Boolean(exportEndAt)
    && isActivated
    && !isLoading
    && !isError

  async function handleExport(format: LogtimeExportFormat) {
    if (!exportBeginAt || !exportEndAt || exportPending) return
    setExportPending(true)
    setExportError(null)
    try {
      await exportMyLogtime(format, exportBeginAt, exportEndAt)
    } catch (error) {
      setExportError(getApiErrorMessage(error) ?? "Export impossible")
    } finally {
      setExportPending(false)
    }
  }

  if (!isActivated) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer />
            Logtime
          </CardTitle>
          <CardDescription>
            {canActivate
              ? "Charge ton logtime uniquement quand tu en as besoin."
              : "Les autres données sont chargées en premier."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onActivate} disabled={!canActivate}>
            Charger le logtime
          </Button>
        </CardContent>
      </Card>
    )
  }

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
              : (
                  <>
                    {`${logtime?.total_hours ?? 0} h ce mois-ci · ${logtime?.active_days ?? 0} jours actifs`}
                    {liveUpdates ? " · maj auto 10 min" : null}
                  </>
                )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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

        {canExport && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={!exportReady || exportPending}
                  />
                }
              >
                <Download data-icon="inline-start" />
                {exportPending ? "Export…" : "Exporter"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={exportPending}
                    onClick={() => void handleExport("csv")}
                  >
                    <FileSpreadsheet data-icon="inline-start" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={exportPending}
                    onClick={() => void handleExport("pdf")}
                  >
                    <FileText data-icon="inline-start" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {exportError && (
              <p role="alert" className="text-sm text-destructive">
                {exportError}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
