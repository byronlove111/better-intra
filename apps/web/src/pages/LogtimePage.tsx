import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  CalendarDays,
  Clock3,
  Download,
  ListChecks,
  Timer,
} from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getCurrentUser } from "@/features/auth/auth-api"
import {
  downloadLogtimeExport,
  getLogtimeAnalytics,
} from "@/features/logtime/logtime-api"
import { getPreviewLogtimeAnalytics } from "@/features/logtime/logtime-preview"
import { LogtimeCard } from "@/features/profile/LogtimeCard"
import { getApiErrorMessage } from "@/lib/api"

const chartConfig = {
  duration_hours: {
    label: "Heures",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const weekdayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDefaultRange() {
  const endDate = new Date()
  const beginDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  return {
    beginDate: formatInputDate(beginDate),
    endDate: formatInputDate(endDate),
  }
}

function formatHours(hours: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(hours)} h`
}

function formatWeek(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`))
}

export function LogtimePage() {
  const [searchParams] = useSearchParams()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "logtime"
  const [range, setRange] = useState(getDefaultRange)
  const [beginDate, setBeginDate] = useState(range.beginDate)
  const [endDate, setEndDate] = useState(range.endDate)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !isPreview,
  })

  const analyticsRequest = useQuery({
    queryKey: ["logtime", "analytics", range.beginDate, range.endDate],
    queryFn: () => getLogtimeAnalytics(range.beginDate, range.endDate),
    enabled: !isPreview && currentUserRequest.data?.is_intra_linked === true,
  })

  const analytics = isPreview
    ? getPreviewLogtimeAnalytics(range.beginDate, range.endDate)
    : analyticsRequest.data
  const error = getApiErrorMessage(analyticsRequest.error)
  const weekdayData = analytics?.by_weekday.map((day) => ({
    label: weekdayLabels[day.weekday] ?? day.weekday_name.slice(0, 3),
    duration_hours: day.duration_hours,
  })) ?? []
  const weekData = analytics?.by_week.map((week) => ({
    label: formatWeek(week.week_start),
    duration_hours: week.duration_hours,
  })) ?? []
  const calendarMonth = new Date(`${range.endDate}T00:00:00.000Z`)

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (beginDate > endDate) {
      setRangeError("La date de début doit précéder la date de fin.")
      return
    }

    setRangeError(null)
    setExportError(null)
    setRange({ beginDate, endDate })
  }

  async function exportLogtime(format: "csv" | "pdf") {
    setExporting(format)
    setExportError(null)

    try {
      const file = await downloadLogtimeExport(
        format,
        range.beginDate,
        range.endDate,
      )
      const fileUrl = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = fileUrl
      link.download = `logtime-${range.beginDate}-${range.endDate}.${format}`
      link.click()
      URL.revokeObjectURL(fileUrl)
    } catch (downloadError) {
      setExportError(getApiErrorMessage(downloadError))
    } finally {
      setExporting(null)
    }
  }

  if (!isPreview && currentUserRequest.data?.is_intra_linked === false) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Compte Intra non lié</CardTitle>
          <CardDescription>
            Lie ton compte 42 depuis le dashboard pour analyser ton logtime.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Timer />
          Logtime
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyse ton temps passé sur le campus pendant la période choisie.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Période</CardTitle>
          <CardDescription>
            Modifie les dates puis clique sur "Appliquer" pour mettre à jour les statistiques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={applyRange}>
            <FieldGroup className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Field data-invalid={Boolean(rangeError)}>
                <FieldLabel htmlFor="logtime-begin-date">
                  Date de début
                </FieldLabel>
                <Input
                  id="logtime-begin-date"
                  type="date"
                  value={beginDate}
                  onChange={(event) => setBeginDate(event.target.value)}
                  aria-invalid={Boolean(rangeError)}
                  required
                />
              </Field>
              <Field data-invalid={Boolean(rangeError)}>
                <FieldLabel htmlFor="logtime-end-date">
                  Date de fin incluse
                </FieldLabel>
                <Input
                  id="logtime-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  aria-invalid={Boolean(rangeError)}
                  required
                />
              </Field>
              <Button type="submit" disabled={analyticsRequest.isFetching}>
                Appliquer
              </Button>
            </FieldGroup>
            {rangeError && <FieldError className="mt-3">{rangeError}</FieldError>}
          </form>
        </CardContent>
      </Card>

      {analyticsRequest.isPending && !isPreview ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Chargement des statistiques…
          </CardContent>
        </Card>
      ) : error && !isPreview ? (
        <Card>
          <CardContent className="py-8">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          </CardContent>
        </Card>
      ) : analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Temps total"
              value={formatHours(analytics.total_hours)}
              icon={<Clock3 />}
            />
            <StatCard
              title="Jours actifs"
              value={String(analytics.active_days)}
              icon={<CalendarDays />}
            />
            <StatCard
              title="Moyenne par jour actif"
              value={formatHours(analytics.average_hours_per_active_day)}
              icon={<Activity />}
            />
            <StatCard
              title="Sessions"
              value={String(analytics.sessions_count)}
              icon={<ListChecks />}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <LogtimeCard
              logtime={analytics}
              month={calendarMonth}
              summaryLabel="sur la période"
              showMonthNavigation={false}
            />

            <ChartCard
              title="Temps par jour de la semaine"
              description="Répartition cumulée sur la période."
              data={weekdayData}
            />

            <ChartCard
              title="Temps par semaine"
              description="Évolution du nombre d’heures semaine après semaine."
              data={weekData}
            />

            <Card size="sm">
              <CardHeader>
                <CardTitle>Télécharger les données</CardTitle>
                <CardDescription>
                  Le CSV contient les données brutes. Le PDF fournit un rapport
                  prêt à consulter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => exportLogtime("csv")}
                    disabled={isPreview || exporting !== null}
                  >
                    <Download data-icon="inline-start" />
                    {exporting === "csv" ? "Téléchargement…" : "Exporter en CSV"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportLogtime("pdf")}
                    disabled={isPreview || exporting !== null}
                  >
                    <Download data-icon="inline-start" />
                    {exporting === "pdf" ? "Téléchargement…" : "Exporter en PDF"}
                  </Button>
                </div>
                {isPreview && (
                  <p className="text-sm text-muted-foreground">
                    Les exports sont désactivés en mode preview pour ne pas
                    appeler le backend.
                  </p>
                )}
                {exportError && (
                  <p role="alert" className="text-sm text-destructive">
                    {exportError}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}

type StatCardProps = {
  title: string
  value: string
  icon: ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

type ChartCardProps = {
  title: string
  description: string
  data: { label: string; duration_hours: number }[]
}

function ChartCard({ title, description, data }: ChartCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-64 w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="duration_hours"
              fill="var(--color-duration_hours)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
