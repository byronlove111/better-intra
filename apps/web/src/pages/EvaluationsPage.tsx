import { useQuery } from "@tanstack/react-query"
import { ClipboardCheck } from "lucide-react"
import { Fragment, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { PagePagination } from "@/components/PagePagination"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { getCurrentUser } from "@/features/auth/auth-api"
import { getEvaluationsPage } from "@/features/dashboard/dashboard-api"
import { previewEvaluations } from "@/features/dashboard/dashboard-preview"
import { formatDate } from "@/features/profile/profile-display"
import { getApiErrorMessage } from "@/lib/api"

const PAGE_SIZE = 20

type EvaluationView = "corrector" | "corrected"

export function EvaluationsPage() {
  const [searchParams] = useSearchParams()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "evaluations"
  const [page, setPage] = useState(1)
  const [view, setView] = useState<EvaluationView>("corrector")

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !isPreview,
  })

  const evaluationsRequest = useQuery({
    queryKey: ["evaluations", view, page],
    queryFn: () => getEvaluationsPage(page, PAGE_SIZE, view),
    enabled: !isPreview && currentUserRequest.data?.is_intra_linked === true,
  })

  const evaluations = isPreview
    ? previewEvaluations
    : (evaluationsRequest.data?.items ?? [])
  const error = getApiErrorMessage(evaluationsRequest.error)
  const pagination = evaluationsRequest.data?.meta
  const totalPages = isPreview
    ? 1
    : Math.max(
        1,
        Math.ceil((pagination?.total ?? 0) / (pagination?.page_size ?? PAGE_SIZE)),
      )
  const visibleEvaluations = isPreview
    ? evaluations.filter((evaluation) => evaluation.role === view)
    : evaluations

  if (!isPreview && currentUserRequest.data?.is_intra_linked === false) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Compte Intra non lié</CardTitle>
          <CardDescription>
            Lie ton compte 42 depuis le dashboard pour afficher tes évaluations.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (evaluationsRequest.isPending && !isPreview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évaluations</CardTitle>
          <CardDescription>Chargement des évaluations…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error && !isPreview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évaluations</CardTitle>
          <CardDescription className="text-destructive">
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-6">
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
      >
        <ToggleGroupItem value="corrector">
          En tant que correcteur
        </ToggleGroupItem>
        <ToggleGroupItem value="corrected">
          En tant qu’évalué
        </ToggleGroupItem>
      </ToggleGroup>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck />
            {view === "corrector"
              ? "Évaluations en tant que correcteur"
              : "Évaluations en tant qu’évalué"}
          </CardTitle>
          <CardDescription>
            {view === "corrector"
              ? "Les groupes et les élèves que tu as évalués."
              : "Les évaluations reçues par toi ou ton groupe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visibleEvaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune évaluation dans cette catégorie sur cette page.
            </p>
          ) : (
            <Table>
              <TableHeader className="[&_tr]:border-b-2">
                <TableRow>
                  <TableHead>Correcteur</TableHead>
                  {/* TODO: utiliser team_name à la place de project_name après le correctif backend. */}
                  <TableHead>Groupe évalué</TableHead>
                  <TableHead>Élèves évalués</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEvaluations.map((evaluation) => (
                  <Fragment key={evaluation.id}>
                    <TableRow className="border-b-0">
                      <TableCell className="py-4">
                        {evaluation.corrector_login ?? "—"}
                      </TableCell>
                      <TableCell className="py-4 font-medium">
                        {evaluation.project_name ?? "Groupe non renseigné"}
                      </TableCell>
                      <TableCell className="py-4">
                        {evaluation.corrected_logins.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="py-4">
                        {formatDate(evaluation.begin_at)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4} className="whitespace-normal pt-2 pb-6">
                        <div className="flex flex-col gap-2">
                          <p>
                            <strong>
                              {evaluation.final_mark !== null
                                ? `${evaluation.final_mark} %`
                                : "Note indisponible"}
                            </strong>{" "}
                            {evaluation.comment ?? "Aucun commentaire de correction."}
                          </p>
                          <p className="text-muted-foreground">
                            {evaluation.feedback_rating !== undefined
                            && evaluation.feedback_rating !== null
                              ? `${evaluation.feedback_rating}/5`
                              : "Avis évaluateur indisponible"}{" "}
                            {evaluation.feedback_comment ?? ""}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PagePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        disabled={isPreview || evaluationsRequest.isPending}
      />
    </section>
  )
}
