import { useQuery } from "@tanstack/react-query"
import { ClipboardCheck, Link2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/EmptyState"
import { PagePagination } from "@/components/PagePagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { getCurrentUser } from "@/features/auth/auth-api"
import { getEvaluationsPage } from "@/features/dashboard/dashboard-api"
import { formatDate } from "@/features/profile/profile-display"
import { getApiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

type EvaluationView = "corrector" | "corrected"

function formatEvalTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatEvalDay(value: string | null | undefined) {
  if (!value) return "Date inconnue"
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value))
}

export function EvaluationsPage() {
  const [page, setPage] = useState(1)
  const [view, setView] = useState<EvaluationView>("corrector")

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })

  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const evaluationsRequest = useQuery({
    queryKey: ["evaluations", view, page],
    queryFn: () => getEvaluationsPage(page, PAGE_SIZE, view),
    enabled: isIntraLinked,
  })

  const evaluations = evaluationsRequest.data?.items ?? []
  const error = getApiErrorMessage(evaluationsRequest.error)
  const pagination = evaluationsRequest.data?.meta
  const totalPages = Math.max(
    1,
    Math.ceil((pagination?.total ?? 0) / (pagination?.page_size ?? PAGE_SIZE)),
  )

  if (currentUserRequest.isPending) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-10">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </section>
    )
  }

  if (!isIntraLinked) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-10">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Évaluations
            </h1>
            <p className="text-sm text-muted-foreground">
              Historique correcteur et évalué
            </p>
          </div>
        </div>

        <EmptyState
          icon={Link2}
          title="Compte Intra non lié"
          description="Lie ton compte 42 depuis le dashboard pour afficher tes évaluations."
        >
          <Button render={<Link to="/dashboard" />}>
            <Link2 data-icon="inline-start" />
            Aller au dashboard
          </Button>
        </EmptyState>
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-10">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Évaluations
              </h1>
              <p className="text-sm text-muted-foreground">
                {view === "corrector"
                  ? "Les groupes et élèves que tu as évalués"
                  : "Les évaluations reçues par toi ou ton groupe"}
              </p>
            </div>
          </div>
          {pagination?.total != null ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {pagination.total} évaluation{pagination.total > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>

        <ToggleGroup
          value={[view]}
          onValueChange={(values) => {
            const selectedView = values[0]

            if (selectedView === "corrector" || selectedView === "corrected") {
              setPage(1)
              setView(selectedView)
            }
          }}
          variant="outline"
          spacing={0}
          className="w-fit"
        >
          <ToggleGroupItem value="corrector">
            En tant que correcteur
          </ToggleGroupItem>
          <ToggleGroupItem value="corrected">
            En tant qu’évalué
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {evaluationsRequest.isPending ? (
        <p className="text-sm text-muted-foreground">
          Chargement des évaluations…
        </p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : evaluations.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucune évaluation"
          description="Aucune évaluation dans cette catégorie sur cette page."
        />
      ) : (
        <ul className="flex flex-col">
          {evaluations.map((evaluation, index) => {
            const peopleLine = view === "corrector"
              ? (evaluation.corrected_logins.length > 0
                ? evaluation.corrected_logins.map((login) => `@${login}`).join(", ")
                : "Élèves non renseignés")
              : (evaluation.corrector_login
                ? `Correcteur · @${evaluation.corrector_login}`
                : "Correcteur non renseigné")

            return (
              <li
                key={evaluation.id}
                className={cn(
                  "flex flex-col gap-3 py-5",
                  index > 0 && "border-t",
                )}
              >
                <div className="flex items-start gap-4 sm:items-center sm:gap-6">
                  <div className="w-16 shrink-0 text-left sm:w-20">
                    <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                      {formatEvalTime(evaluation.begin_at)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground uppercase sm:text-xs">
                      {formatEvalDay(evaluation.begin_at)}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {evaluation.project_name ?? "Groupe non renseigné"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {peopleLine}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                        {formatDate(evaluation.begin_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {evaluation.final_mark !== null ? (
                        <span className="text-sm font-semibold tabular-nums">
                          {evaluation.final_mark} %
                        </span>
                      ) : (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          —
                        </span>
                      )}
                      <Badge variant="outline">
                        {view === "corrector" ? "Correcteur" : "Évalué"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pl-0 sm:pl-[6.5rem]">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {evaluation.comment?.trim()
                      || "Aucun commentaire de correction."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {evaluation.feedback_rating !== undefined
                    && evaluation.feedback_rating !== null
                      ? `Avis évaluateur · ${evaluation.feedback_rating}/5`
                      : "Avis évaluateur indisponible"}
                    {evaluation.feedback_comment?.trim()
                      ? ` · ${evaluation.feedback_comment}`
                      : ""}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center">
          <PagePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            disabled={evaluationsRequest.isPending}
          />
        </div>
      ) : null}
    </section>
  )
}
