import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  CalendarIcon,
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Link2,
  Timer,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { DateRange } from "react-day-picker"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { EmptyState } from "@/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/features/auth/auth-api"
import {
  type LogtimeExportFormat,
  exportMyLogtimeAnalytics,
  getMyLogtimeAnalytics,
} from "@/features/logtime/logtime-api"
import {
  fillDailySeries,
  formatRangeButtonLabel,
  getDefaultPickerRange,
  toAnalyticsRange,
  weekdayLabel,
} from "@/features/logtime/logtime-range"
import { getApiErrorMessage } from "@/lib/api"

const POLL_MS = 600_000

const dailyConfig = {
  hours: {
    label: "Heures",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const weekdayConfig = {
  hours: {
    label: "Heures",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const weekConfig = {
  hours: {
    label: "Heures",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const pieColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const pieConfig = {
  hours: { label: "Heures" },
  Lundi: { label: "Lundi", color: "var(--chart-1)" },
  Mardi: { label: "Mardi", color: "var(--chart-2)" },
  Mercredi: { label: "Mercredi", color: "var(--chart-3)" },
  Jeudi: { label: "Jeudi", color: "var(--chart-4)" },
  Vendredi: { label: "Vendredi", color: "var(--chart-5)" },
  Samedi: { label: "Samedi", color: "var(--chart-1)" },
  Dimanche: { label: "Dimanche", color: "var(--chart-2)" },
} satisfies ChartConfig

export function LogtimePage() {
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>(() =>
    getDefaultPickerRange(),
  )
  const [exportPending, setExportPending] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const range = useMemo(() => toAnalyticsRange(pickerRange), [pickerRange])

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })

  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const analyticsRequest = useQuery({
    queryKey: ["analytics", "logtime", range?.beginAt, range?.endAt],
    queryFn: () => getMyLogtimeAnalytics(range!.beginAt, range!.endAt),
    enabled: isIntraLinked && range !== null,
    refetchInterval: isIntraLinked && range !== null ? POLL_MS : false,
    refetchIntervalInBackground: false,
  })

  const analytics = analyticsRequest.data

  const dailyData = useMemo(() => {
    if (!analytics || !range) return []
    return fillDailySeries(range.beginAt, range.endAt, analytics.days)
  }, [analytics, range])

  const weekdayData = useMemo(() => {
    if (!analytics) return []
    const byWeekday = new Map(
      analytics.by_weekday.map((row) => [row.weekday, row.duration_hours]),
    )
    return Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      day: weekdayLabel(weekday),
      hours: byWeekday.get(weekday) ?? 0,
    }))
  }, [analytics])

  const weekData = useMemo(() => {
    if (!analytics) return []
    return analytics.by_week.map((row) => {
      const start = new Date(`${row.week_start}T00:00:00.000Z`)
      return {
        week: row.week_start,
        label: `S${String(start.getUTCDate()).padStart(2, "0")}/${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
        hours: row.duration_hours,
      }
    })
  }, [analytics])

  const pieData = useMemo(
    () =>
      weekdayData
        .filter((row) => row.hours > 0)
        .map((row) => ({
          day: row.day,
          hours: row.hours,
          fill: `var(--color-${row.day})`,
        })),
    [weekdayData],
  )

  async function handleExport(format: LogtimeExportFormat) {
    if (exportPending || !range) return
    setExportPending(true)
    setExportError(null)
    try {
      await exportMyLogtimeAnalytics(format, range.beginAt, range.endAt)
    } catch (error) {
      setExportError(getApiErrorMessage(error) ?? "Export impossible.")
    } finally {
      setExportPending(false)
    }
  }

  if (currentUserRequest.isPending) {
    return (
      <section className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </section>
    )
  }

  if (!isIntraLinked) {
    return (
      <section className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer />
              Logtime
            </CardTitle>
            <CardDescription>
              Lie ton compte Intra 42 pour analyser ton temps de présence à l’école.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link to="/dashboard" />}>
              <Link2 data-icon="inline-start" />
              Aller lier Intra
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const error = getApiErrorMessage(analyticsRequest.error)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Analytics logtime
          </h1>
          <Badge variant="secondary">MàJ auto · 10 min</Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-left font-normal"
                />
              }
            >
              <CalendarIcon data-icon="inline-start" />
              {formatRangeButtonLabel(pickerRange)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={pickerRange}
                onSelect={setPickerRange}
                disabled={{ after: new Date() }}
                defaultMonth={pickerRange?.from}
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportPending || !analytics || !range}
                />
              }
            >
              <Download data-icon="inline-start" />
              {exportPending ? "Export…" : "Exporter"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={exportPending}
                  onClick={() => void handleExport("csv")}
                >
                  <FileSpreadsheet />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportPending}
                  onClick={() => void handleExport("pdf")}
                >
                  <FileText />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {exportError ? (
        <p className="text-sm text-destructive">{exportError}</p>
      ) : null}

      {analyticsRequest.isPending && !analytics ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>Données indisponibles</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total"
              value={`${analytics.total_hours} h`}
              hint={range ? `Période · ${range.label}` : "Période"}
              icon={Clock3}
            />
            <StatCard
              title="Jours actifs"
              value={String(analytics.active_days)}
              hint="Jours avec au moins une session"
              icon={CalendarDays}
            />
            <StatCard
              title="Moyenne / jour actif"
              value={`${analytics.average_hours_per_active_day} h`}
              hint="Heures moyennes"
              icon={Activity}
            />
            <StatCard
              title="Sessions"
              value={String(analytics.sessions_count)}
              hint={`@${analytics.login}`}
              icon={Timer}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Heures par jour</CardTitle>
                <CardDescription>
                  Courbe quotidienne sur la plage sélectionnée.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyData.every((d) => d.hours === 0) ? (
                  <EmptyChart message="Aucune heure enregistrée sur cette période." />
                ) : (
                  <ChartContainer config={dailyConfig} className="aspect-auto h-72 w-full">
                    <AreaChart accessibilityLayer data={dailyData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={24}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={36}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) =>
                              String(payload?.[0]?.payload?.date ?? "")
                            }
                          />
                        }
                      />
                      <Area
                        dataKey="hours"
                        type="monotone"
                        fill="var(--color-hours)"
                        fillOpacity={0.2}
                        stroke="var(--color-hours)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par jour de la semaine</CardTitle>
                <CardDescription>
                  Cumul des heures selon le weekday (lun → dim).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weekdayData.every((d) => d.hours === 0) ? (
                  <EmptyChart message="Pas assez de données pour ce graphique." />
                ) : (
                  <ChartContainer config={weekdayConfig} className="aspect-auto h-72 w-full">
                    <BarChart accessibilityLayer data={weekdayData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => String(value).slice(0, 3)}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="hours" fill="var(--color-hours)" radius={6} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Part par weekday</CardTitle>
                <CardDescription>
                  Camembert des heures actives (jours à 0 h exclus).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <EmptyChart message="Aucune répartition à afficher." />
                ) : (
                  <ChartContainer config={pieConfig} className="mx-auto aspect-square h-72">
                    <PieChart>
                      <ChartTooltip
                        content={<ChartTooltipContent nameKey="day" hideLabel />}
                      />
                      <Pie data={pieData} dataKey="hours" nameKey="day" innerRadius={48}>
                        {pieData.map((entry, index) => (
                          <Cell
                            key={entry.day}
                            fill={pieColors[index % pieColors.length]}
                          />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="day" />}
                        className="-translate-y-2 flex-wrap gap-2"
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Heures par semaine</CardTitle>
                <CardDescription>
                  Agrégation hebdomadaire (lundi = début de semaine).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weekData.length === 0 ? (
                  <EmptyChart message="Aucune semaine dans cette plage." />
                ) : (
                  <ChartContainer config={weekConfig} className="aspect-auto h-72 w-full">
                    <BarChart accessibilityLayer data={weekData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="hours" fill="var(--color-hours)" radius={6} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </section>
  )
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint: string
  icon: typeof Clock3
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon />
          {title}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <EmptyState
      className="min-h-72"
      icon={Timer}
      title="Pas de données"
      description={message}
    />
  )
}
