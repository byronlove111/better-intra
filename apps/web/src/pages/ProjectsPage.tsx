import { useQuery } from "@tanstack/react-query"
import { FolderKanban, Link2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/EmptyState"
import { PagePagination } from "@/components/PagePagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/features/auth/auth-api"
import {
  type ProfileProject,
  getMyProjectsPage,
} from "@/features/profile/profile-api"
import { formatRelativeAgo } from "@/features/profile/profile-display"
import { getApiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

type ProjectStatus = {
  label: string
  variant: "default" | "destructive" | "secondary" | "outline"
}

function getProjectStatus(project: ProfileProject): ProjectStatus {
  if (project.validated === true) {
    return { label: "Validé", variant: "default" }
  }

  if (project.validated === false) {
    return { label: "Échoué", variant: "destructive" }
  }

  if (project.status === "in_progress") {
    return { label: "En cours", variant: "secondary" }
  }

  return { label: "À venir", variant: "outline" }
}

export function ProjectsPage() {
  const [page, setPage] = useState(1)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })

  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const projectsRequest = useQuery({
    queryKey: ["projects", page],
    queryFn: () => getMyProjectsPage(page, PAGE_SIZE),
    enabled: isIntraLinked,
  })

  const projects = projectsRequest.data?.items ?? []
  const error = getApiErrorMessage(projectsRequest.error)
  const pagination = projectsRequest.data?.meta
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
          <FolderKanban className="text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
            <p className="text-sm text-muted-foreground">
              Tes projets du cursus 42
            </p>
          </div>
        </div>

        <EmptyState
          icon={Link2}
          title="Compte Intra non lié"
          description="Lie ton compte 42 depuis le dashboard pour afficher tes projets."
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderKanban className="text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
            <p className="text-sm text-muted-foreground">
              Statut et notes du cursus 42
            </p>
          </div>
        </div>
        {pagination?.total != null ? (
          <p className="text-sm tabular-nums text-muted-foreground">
            {pagination.total} projet{pagination.total > 1 ? "s" : ""}
          </p>
        ) : null}
      </div>

      {projectsRequest.isPending ? (
        <p className="text-sm text-muted-foreground">
          Chargement des projets…
        </p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet"
          description="Aucun projet à afficher pour le moment."
        />
      ) : (
        <ul className="flex flex-col">
          {projects.map((project, index) => {
            const status = getProjectStatus(project)

            return (
              <li
                key={project.id}
                className={cn(
                  "flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                  index > 0 && "border-t",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {project.project_name ?? "Projet sans nom"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeAgo(project.marked_at) ??
                      formatRelativeAgo(project.updated_at) ??
                      "Pas encore évalué"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {project.final_mark !== null ? (
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        project.validated === true
                          ? "text-emerald-500"
                          : "text-destructive",
                      )}
                    >
                      {project.final_mark}
                    </span>
                  ) : (
                    <Badge variant={status.variant}>{status.label}</Badge>
                  )}
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
            disabled={projectsRequest.isPending}
          />
        </div>
      ) : null}
    </section>
  )
}
